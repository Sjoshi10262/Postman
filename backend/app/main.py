"""FastAPI application entrypoint.

Wires routers, enables CORS for the Next.js dev server (and any origin in this
demo), and creates tables on startup. Run with:  uvicorn app.main:app --reload
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import Base, engine
from .routers import collections, environments, history, requests, run

Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Client Platform — Backend", version="1.0.0")

# In production set ALLOWED_ORIGINS to your frontend URL. Defaults to "*" so the
# hosted demo works out of the box.
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(run.router, prefix="/api")
app.include_router(collections.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(environments.router, prefix="/api")
app.include_router(history.router, prefix="/api")


@app.get("/api")
def root():
    return {"status": "ok", "service": "postman-clone-backend"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
