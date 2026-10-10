from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Smarter Todo API")


# Request body: FastAPI validates it and returns 422 if it is invalid.
class TodoIn(BaseModel):
    title: str
    completed: bool = False


class Todo(TodoIn):
    id: int


# In-memory storage: data is lost when the server restarts.
todos: dict[int, Todo] = {}
next_id = 1


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Read all todos.
@app.get("/api/todos")
def list_todos() -> list[Todo]:
    return list(todos.values())


# Create a todo and return it with its new id.
@app.post("/api/todos", status_code=201)
def create_todo(data: TodoIn) -> Todo:
    global next_id
    todo = Todo(id=next_id, **data.model_dump())
    todos[todo.id] = todo
    next_id += 1
    return todo


# Read one todo by id, or 404 if it does not exist.
@app.get("/api/todos/{todo_id}")
def get_todo(todo_id: int) -> Todo:
    if todo_id not in todos:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todos[todo_id]


# Update a todo's title and completed status.
@app.put("/api/todos/{todo_id}")
def update_todo(todo_id: int, data: TodoIn) -> Todo:
    if todo_id not in todos:
        raise HTTPException(status_code=404, detail="Todo not found")
    todos[todo_id] = Todo(id=todo_id, **data.model_dump())
    return todos[todo_id]


# Delete a todo; 204 means success with no response body.
@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int) -> None:
    if todos.pop(todo_id, None) is None:
        raise HTTPException(status_code=404, detail="Todo not found")


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# dist/ only exists after `npm run build`; in dev the Vite server serves the UI.
if FRONTEND_DIR.is_dir():
    app.frontend("/", directory=FRONTEND_DIR)
