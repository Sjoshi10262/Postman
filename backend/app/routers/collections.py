"""Collections (and folders) CRUD."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[schemas.CollectionOut])
def list_collections(db: Session = Depends(get_db)):
    return db.query(models.Collection).order_by(models.Collection.id).all()


@router.post("", response_model=schemas.CollectionOut, status_code=201)
def create_collection(payload: schemas.CollectionCreate, db: Session = Depends(get_db)):
    col = models.Collection(**payload.model_dump())
    db.add(col)
    db.commit()
    db.refresh(col)
    return col


@router.get("/{collection_id}", response_model=schemas.CollectionOut)
def get_collection(collection_id: int, db: Session = Depends(get_db)):
    col = db.get(models.Collection, collection_id)
    if not col:
        raise HTTPException(404, "Collection not found")
    return col


@router.patch("/{collection_id}", response_model=schemas.CollectionOut)
def update_collection(
    collection_id: int,
    payload: schemas.CollectionUpdate,
    db: Session = Depends(get_db),
):
    col = db.get(models.Collection, collection_id)
    if not col:
        raise HTTPException(404, "Collection not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(col, field, value)
    db.commit()
    db.refresh(col)
    return col


@router.delete("/{collection_id}", status_code=204)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    col = db.get(models.Collection, collection_id)
    if not col:
        raise HTTPException(404, "Collection not found")
    db.delete(col)
    db.commit()


# ----------------------------------------------------------------- Folders
@router.post("/folders", response_model=schemas.FolderOut, status_code=201)
def create_folder(payload: schemas.FolderCreate, db: Session = Depends(get_db)):
    if not db.get(models.Collection, payload.collection_id):
        raise HTTPException(404, "Collection not found")
    folder = models.Folder(**payload.model_dump())
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/folders/{folder_id}", status_code=204)
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.get(models.Folder, folder_id)
    if not folder:
        raise HTTPException(404, "Folder not found")
    db.delete(folder)
    db.commit()
