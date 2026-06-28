"""Saved requests CRUD."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("", response_model=schemas.RequestOut, status_code=201)
def create_request(payload: schemas.RequestCreate, db: Session = Depends(get_db)):
    req = models.Request(**payload.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/{request_id}", response_model=schemas.RequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    req = db.get(models.Request, request_id)
    if not req:
        raise HTTPException(404, "Request not found")
    return req


@router.patch("/{request_id}", response_model=schemas.RequestOut)
def update_request(
    request_id: int,
    payload: schemas.RequestUpdate,
    db: Session = Depends(get_db),
):
    req = db.get(models.Request, request_id)
    if not req:
        raise HTTPException(404, "Request not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(req, field, value)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/{request_id}", status_code=204)
def delete_request(request_id: int, db: Session = Depends(get_db)):
    req = db.get(models.Request, request_id)
    if not req:
        raise HTTPException(404, "Request not found")
    db.delete(req)
    db.commit()
