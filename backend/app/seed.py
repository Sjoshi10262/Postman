"""Seed the database with sample data so the app is usable immediately.

Creates two collections (JSONPlaceholder + httpbin), two environments, a few
saved requests, and some history pointing at public test APIs. Idempotent: it
wipes and re-seeds so you can re-run it freely.

Run with:  python -m app.seed
"""

from .database import Base, SessionLocal, engine
from . import models


def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ---- Environments ------------------------------------------------------
    prod = models.Environment(name="Production")
    prod.variables = [
        models.Variable(key="base_url", value="https://jsonplaceholder.typicode.com"),
        models.Variable(key="token", value="demo-prod-token-123"),
    ]
    local = models.Environment(name="httpbin")
    local.variables = [
        models.Variable(key="base_url", value="https://httpbin.org"),
        models.Variable(key="token", value="demo-local-token-abc"),
    ]
    db.add_all([prod, local])

    # ---- Collection 1: JSONPlaceholder ------------------------------------
    jp = models.Collection(
        name="JSONPlaceholder API",
        description="Free fake REST API for testing and prototyping.",
    )
    jp.requests = [
        models.Request(
            name="Get all posts",
            method="GET",
            url="{{base_url}}/posts",
            headers=[{"key": "Accept", "value": "application/json", "enabled": True}],
        ),
        models.Request(
            name="Get post by id",
            method="GET",
            url="{{base_url}}/posts/1",
        ),
        models.Request(
            name="Create a post",
            method="POST",
            url="{{base_url}}/posts",
            body={
                "mode": "raw",
                "raw_type": "json",
                "raw": '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}',
            },
        ),
        models.Request(
            name="Filter comments",
            method="GET",
            url="{{base_url}}/comments",
            params=[{"key": "postId", "value": "1", "enabled": True}],
        ),
    ]

    # ---- Collection 2: httpbin --------------------------------------------
    hb = models.Collection(
        name="httpbin",
        description="A simple HTTP request & response service.",
    )
    hb.requests = [
        models.Request(
            name="GET with query params",
            method="GET",
            url="https://httpbin.org/get",
            params=[
                {"key": "search", "value": "postman", "enabled": True},
                {"key": "page", "value": "1", "enabled": True},
            ],
        ),
        models.Request(
            name="POST form data",
            method="POST",
            url="https://httpbin.org/post",
            body={
                "mode": "x-www-form-urlencoded",
                "fields": [
                    {"key": "name", "value": "Ada", "enabled": True},
                    {"key": "role", "value": "engineer", "enabled": True},
                ],
            },
        ),
        models.Request(
            name="Bearer auth",
            method="GET",
            url="https://httpbin.org/bearer",
            auth={"type": "bearer", "token": "{{token}}"},
        ),
        models.Request(
            name="Basic auth",
            method="GET",
            url="https://httpbin.org/basic-auth/user/pass",
            auth={"type": "basic", "username": "user", "password": "pass"},
        ),
        models.Request(
            name="Status 404",
            method="GET",
            url="https://httpbin.org/status/404",
        ),
    ]

    db.add_all([jp, hb])

    # ---- History -----------------------------------------------------------
    db.add_all(
        [
            models.HistoryEntry(
                method="GET",
                url="https://jsonplaceholder.typicode.com/posts/1",
                status_code=200,
                response_time_ms=142.5,
                response_size_bytes=292,
            ),
            models.HistoryEntry(
                method="POST",
                url="https://httpbin.org/post",
                status_code=200,
                response_time_ms=311.2,
                response_size_bytes=820,
            ),
            models.HistoryEntry(
                method="GET",
                url="https://httpbin.org/status/404",
                status_code=404,
                response_time_ms=98.0,
                response_size_bytes=0,
            ),
        ]
    )

    db.commit()
    db.close()
    print("Seeded: 2 collections, 2 environments, 9 saved requests, 3 history entries.")


if __name__ == "__main__":
    seed()
