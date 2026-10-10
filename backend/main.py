import os
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from sqlmodel import Field, Session, SQLModel, create_engine, select

app = FastAPI(title="Smarter Todo API")

BACKEND_DIR = Path(__file__).resolve().parent
# Vercel's filesystem is read-only except /tmp, which is wiped between invocations.
DB_DIR = Path("/tmp") if os.getenv("VERCEL") else BACKEND_DIR
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(DB_DIR / 'smarter_todo.db').as_posix()}")

# check_same_thread=False: FastAPI runs sync routes in a thread pool.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


# Request body: FastAPI validates it and returns 422 if it is invalid.
class TodoIn(SQLModel):
    title: str
    completed: bool = False


# table=True maps this class to a database table.
class Todo(TodoIn, table=True):
    # AUTOINCREMENT stops SQLite from reusing the id of a deleted todo, like Postgres.
    __table_args__ = {"sqlite_autoincrement": True}

    id: int | None = Field(default=None, primary_key=True)


# Creates the table on first run; existing data is kept.
SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Read all todos.
@app.get("/api/todos")
def list_todos(session: SessionDep) -> list[Todo]:
    return list(session.exec(select(Todo).order_by(Todo.id)).all())


# Create a todo and return it with its new id.
@app.post("/api/todos", status_code=201)
def create_todo(data: TodoIn, session: SessionDep) -> Todo:
    todo = Todo.model_validate(data)
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


# Read one todo by id, or 404 if it does not exist.
@app.get("/api/todos/{todo_id}")
def get_todo(todo_id: int, session: SessionDep) -> Todo:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


# Update a todo's title and completed status.
@app.put("/api/todos/{todo_id}")
def update_todo(todo_id: int, data: TodoIn, session: SessionDep) -> Todo:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    todo.title = data.title
    todo.completed = data.completed
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


# Delete a todo; 204 means success with no response body.
@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, session: SessionDep) -> None:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    session.delete(todo)
    session.commit()


FRONTEND_DIR = BACKEND_DIR.parent / "frontend" / "dist"

# dist/ only exists after `npm run build`; in dev the Vite server serves the UI.
if FRONTEND_DIR.is_dir():
    app.frontend("/", directory=FRONTEND_DIR)
