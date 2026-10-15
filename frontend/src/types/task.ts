export type Task = {
  id: number
  title: string
  description: string | null
  due_date: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

// Matches TaskCreate on the backend.
export type TaskInput = {
  title: string
  description: string | null
  due_date: string | null
}

// Matches TaskUpdate on the backend: only the fields sent are changed.
export type TaskPatch = Partial<TaskInput & { is_completed: boolean }>
