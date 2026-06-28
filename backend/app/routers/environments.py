"""Environments and their variables.

Variables are replaced wholesale on update (the UI edits the full table and
sends it back), which keeps the contract simple and avoids per-row diffing.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/environments", tags=["environments"])


def _apply_variables(env: models.Environment, variables, db: Session):
    env.variables.clear()
    db.flush()
    for v in variables:
        env.variables.append(
            models.Variable(key=v.key, value=v.value, enabled=1 if v.enabled else 0)
        )


@router.get("", response_model=list[schemas.EnvironmentOut])
def list_environments(db: Session = Depends(get_db)):
    return db.query(models.Environment).order_by(models.Environment.id).all()


@router.post("", response_model=schemas.EnvironmentOut, status_code=201)
def create_environment(
    payload: schemas.EnvironmentCreate, db: Session = Depends(get_db)
):
    env = models.Environment(name=payload.name)
    db.add(env)
    db.flush()
    _apply_variables(env, payload.variables, db)
    db.commit()
    db.refresh(env)
    return env


@router.get("/{environment_id}", response_model=schemas.EnvironmentOut)
def get_environment(environment_id: int, db: Session = Depends(get_db)):
    env = db.get(models.Environment, environment_id)
    if not env:
        raise HTTPException(404, "Environment not found")
    return env


@router.patch("/{environment_id}", response_model=schemas.EnvironmentOut)
def update_environment(
    environment_id: int,
    payload: schemas.EnvironmentUpdate,
    db: Session = Depends(get_db),
):
    env = db.get(models.Environment, environment_id)
    if not env:
        raise HTTPException(404, "Environment not found")
    if payload.name is not None:
        env.name = payload.name
    if payload.variables is not None:
        _apply_variables(env, payload.variables, db)
    db.commit()
    db.refresh(env)
    return env


@router.delete("/{environment_id}", status_code=204)
def delete_environment(environment_id: int, db: Session = Depends(get_db)):
    env = db.get(models.Environment, environment_id)
    if not env:
        raise HTTPException(404, "Environment not found")
    db.delete(env)
    db.commit()
