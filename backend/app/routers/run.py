"""POST /run — execute a request through the proxy and record history."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..runner import build_env_map, execute

router = APIRouter(tags=["run"])


@router.post("/run")
def run_request(payload: schemas.RunRequest, db: Session = Depends(get_db)):
    env = build_env_map(db, payload.environment_id)

    result = execute(
        method=payload.method,
        url=payload.url,
        params=payload.params,
        headers=payload.headers,
        auth=payload.auth,
        body=payload.body,
        env=env,
    )

    if payload.save_history:
        entry = models.HistoryEntry(
            method=payload.method,
            url=payload.url,
            params=payload.params,
            headers=payload.headers,
            auth=payload.auth,
            body=payload.body,
            status_code=result.get("status_code") if result.get("ok") else None,
            response_time_ms=result.get("time_ms") if result.get("ok") else None,
            response_size_bytes=result.get("size_bytes") if result.get("ok") else None,
        )
        db.add(entry)
        db.commit()

    if not result.get("ok"):
        # 200 with an error payload: the proxy itself succeeded; the upstream
        # call failed. The UI renders this as a red error panel.
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "error": result["error"],
                "detail": result["detail"],
            },
        )

    return {"ok": True, **{k: v for k, v in result.items() if k != "ok"}}
