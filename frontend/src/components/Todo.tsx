import { useState } from "react"

export type TodoData = {
  id: number
  title: string
  completed: boolean
}

type TodoProps = {
  todo: TodoData
  onView: (id: number) => void
  onToggle: (todo: TodoData) => void
  onSave: (todo: TodoData, title: string) => void
  onDelete: (id: number) => void
}

const Todo = ({ todo, onView, onToggle, onSave, onDelete }: TodoProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)

  if (isEditing) {
    const saveEdit = () => {
      if (!editTitle.trim()) return
      onSave(todo, editTitle.trim())
      setIsEditing(false)
    }
    return (
      <li>
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        <button onClick={saveEdit}>Save</button>
        <button onClick={() => setIsEditing(false)}>Cancel</button>
      </li>
    )
  }

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo)}
      />
      <span className={todo.completed ? "done" : ""}>{todo.title}</span>
      <button onClick={() => onView(todo.id)}>View</button>
      <button
        onClick={() => {
          setEditTitle(todo.title)
          setIsEditing(true)
        }}
      >
        Edit
      </button>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  )
}

export default Todo
