"""Database schema (SQLAlchemy ORM models).

Entity relationships
--------------------
Collection 1───* Folder        (optional nesting; a folder belongs to a collection)
Collection 1───* Request       (a request may sit directly in a collection ...)
Folder     1───* Request       (... or inside one of its folders)
Environment 1──* Variable      (key/value pairs scoped to an environment)
HistoryEntry                   (flat log of every sent request)

Request bodies, headers, params and auth are stored as JSON columns. They are
free-form key/value structures that map 1:1 to the UI tables, so a JSON blob is
a pragmatic, queryable-enough representation that avoids a wide join graph.
"""

from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    folders = relationship(
        "Folder", back_populates="collection", cascade="all, delete-orphan"
    )
    requests = relationship(
        "Request", back_populates="collection", cascade="all, delete-orphan"
    )


class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    collection_id = Column(
        Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False
    )

    collection = relationship("Collection", back_populates="folders")
    requests = relationship(
        "Request", back_populates="folder", cascade="all, delete-orphan"
    )


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Untitled Request")
    method = Column(String, nullable=False, default="GET")
    url = Column(Text, nullable=False, default="")

    # Free-form key/value structures mirroring the UI tables.
    # params/headers: list of {key, value, enabled}
    # auth: {type: 'none'|'bearer'|'basic', token?, username?, password?}
    # body: {mode: 'none'|'raw'|'form-data'|'x-www-form-urlencoded',
    #        raw?, raw_type?, fields?: [{key, value, enabled}]}
    params = Column(JSON, default=list)
    headers = Column(JSON, default=list)
    auth = Column(JSON, default=dict)
    body = Column(JSON, default=dict)

    collection_id = Column(
        Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=True
    )
    folder_id = Column(
        Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    collection = relationship("Collection", back_populates="requests")
    folder = relationship("Folder", back_populates="requests")


class Environment(Base):
    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    variables = relationship(
        "Variable", back_populates="environment", cascade="all, delete-orphan"
    )


class Variable(Base):
    __tablename__ = "variables"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, nullable=False)
    value = Column(Text, default="")
    enabled = Column(Integer, default=1)  # SQLite-friendly boolean
    environment_id = Column(
        Integer, ForeignKey("environments.id", ondelete="CASCADE"), nullable=False
    )

    environment = relationship("Environment", back_populates="variables")


class HistoryEntry(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    method = Column(String, nullable=False)
    url = Column(Text, nullable=False)

    # Snapshot of what was sent, so a history entry can repopulate the builder.
    params = Column(JSON, default=list)
    headers = Column(JSON, default=list)
    auth = Column(JSON, default=dict)
    body = Column(JSON, default=dict)

    # Response summary for the list view.
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Float, nullable=True)
    response_size_bytes = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
