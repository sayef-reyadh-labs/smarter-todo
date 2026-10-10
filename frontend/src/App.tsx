import { Profiler, useEffect, useState } from "react"
import Todo, { type TodoData } from "./components/Todo"

const request = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.status === 204 ? (undefined as T) : await res.json()
}

const App = () => {
  // useState stores a value; calling its setter re-renders the component with the new value.
  const [todos, setTodos] = useState<TodoData[]>([])
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")
  const [viewingTodo, setViewingTodo] = useState<TodoData | null>(null)

  const loadTodos = async () => {
    setTodos(await request<TodoData[]>("/api/todos"))
  }

  // useEffect runs after render; the empty [] means only once, so todos load when the page opens.
  useEffect(() => {
    const loadOnOpen = async () => {
      try {
        await loadTodos()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    }
    loadOnOpen()
  }, [])

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setError("")
    try {
      await request("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: title.trim() }),
      })
      setTitle("")
      await loadTodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const viewTodo = async (id: number) => {
    setError("")
    try {
      setViewingTodo(await request<TodoData>(`/api/todos/${id}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const updateTodo = async (todo: TodoData) => {
    setError("")
    try {
      await request(`/api/todos/${todo.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: todo.title, completed: todo.completed }),
      })
      await loadTodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const toggleTodo = (todo: TodoData) =>
    updateTodo({ ...todo, completed: !todo.completed })

  const saveEdit = (todo: TodoData, newTitle: string) =>
    updateTodo({ ...todo, title: newTitle })

  const deleteTodo = async (id: number) => {
    setError("")
    try {
      await request(`/api/todos/${id}`, { method: "DELETE" })
      await loadTodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <main>
      <h1>Smarter Todo</h1>
      <form onSubmit={addTodo}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>
      {error && <p className="error">{error}</p>}
      {viewingTodo && (
        <section className="details">
          <p>ID: {viewingTodo.id}</p>
          <p>Title: {viewingTodo.title}</p>
          <p>Completed: {viewingTodo.completed ? "Yes" : "No"}</p>
          <button onClick={() => setViewingTodo(null)}>Close</button>
        </section>
      )}
      <ul>
        {todos.map((todo) => (
          <Profiler
            key={todo.id}
            id={`Todo ${todo.id}`}
            onRender={(id, phase, actualDuration) =>
              console.log(`${id} ${phase}: ${actualDuration.toFixed(2)}ms`)
            }
          >
            <Todo
              todo={todo}
              onView={viewTodo}
              onToggle={toggleTodo}
              onSave={saveEdit}
              onDelete={deleteTodo}
            />
          </Profiler>
        ))}
      </ul>
    </main>
  )
}

export default App
