"""Pydantic schemas — the API's request/response contracts.

Kept deliberately permissive on the nested key/value structures (lists of dicts)
so the frontend can evolve the table shapes without backend churn. `from_attributes`
lets us return ORM objects directly.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------- Collections
class CollectionBase(BaseModel):
    name: str
    description: str = ""


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


# ------------------------------------------------------------------- Folders
class FolderCreate(BaseModel):
    name: str
    collection_id: int


class FolderOut(BaseModel):
    id: int
    name: str
    collection_id: int

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------ Requests
class RequestBase(BaseModel):
    name: str = "Untitled Request"
    method: str = "GET"
    url: str = ""
    params: list[dict[str, Any]] = Field(default_factory=list)
    headers: list[dict[str, Any]] = Field(default_factory=list)
    auth: dict[str, Any] = Field(default_factory=dict)
    body: dict[str, Any] = Field(default_factory=dict)


class RequestCreate(RequestBase):
    collection_id: Optional[int] = None
    folder_id: Optional[int] = None


class RequestUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    params: Optional[list[dict[str, Any]]] = None
    headers: Optional[list[dict[str, Any]]] = None
    auth: Optional[dict[str, Any]] = None
    body: Optional[dict[str, Any]] = None
    collection_id: Optional[int] = None
    folder_id: Optional[int] = None


class RequestOut(RequestBase):
    id: int
    collection_id: Optional[int] = None
    folder_id: Optional[int] = None

    model_config = {"from_attributes": True}


class CollectionOut(CollectionBase):
    id: int
    created_at: datetime
    folders: list[FolderOut] = []
    requests: list[RequestOut] = []

    model_config = {"from_attributes": True}


# -------------------------------------------------------------- Environments
class VariableIn(BaseModel):
    key: str
    value: str = ""
    enabled: bool = True


class VariableOut(VariableIn):
    id: int

    model_config = {"from_attributes": True}


class EnvironmentBase(BaseModel):
    name: str


class EnvironmentCreate(EnvironmentBase):
    variables: list[VariableIn] = Field(default_factory=list)


class EnvironmentUpdate(BaseModel):
    name: Optional[str] = None
    variables: Optional[list[VariableIn]] = None


class EnvironmentOut(EnvironmentBase):
    id: int
    variables: list[VariableOut] = []

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------- History
class HistoryOut(BaseModel):
    id: int
    method: str
    url: str
    params: list[dict[str, Any]] = []
    headers: list[dict[str, Any]] = []
    auth: dict[str, Any] = {}
    body: dict[str, Any] = {}
    status_code: Optional[int] = None
    response_time_ms: Optional[float] = None
    response_size_bytes: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ----------------------------------------------------------------- Run / send
class RunRequest(BaseModel):
    """Payload sent to /run — everything needed to execute one HTTP call."""

    method: str = "GET"
    url: str
    params: list[dict[str, Any]] = Field(default_factory=list)
    headers: list[dict[str, Any]] = Field(default_factory=list)
    auth: dict[str, Any] = Field(default_factory=dict)
    body: dict[str, Any] = Field(default_factory=dict)
    environment_id: Optional[int] = None
    save_history: bool = True


class RunResponse(BaseModel):
    status_code: int
    status_text: str
    time_ms: float
    size_bytes: int
    headers: dict[str, str]
    body: str
    is_json: bool


class RunError(BaseModel):
    error: str
    detail: str
