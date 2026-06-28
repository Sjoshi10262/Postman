"""Request history — a flat log, newest first."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=list[schemas.HistoryOut])
def list_history(limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(models.HistoryEntry)
        .order_by(models.HistoryEntry.created_at.desc())
        .limit(limit)
        .all()
    )


@router.delete("/{entry_id}", status_code=204)
def delete_history_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(models.HistoryEntry, entry_id)
    if not entry:
        raise HTTPException(404, "History entry not found")
    db.delete(entry)
    db.commit()


@router.delete("", status_code=204)
def clear_history(db: Session = Depends(get_db)):
    db.query(models.HistoryEntry).delete()
    db.commit()
