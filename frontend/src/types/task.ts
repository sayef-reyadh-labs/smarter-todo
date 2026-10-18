// TypeScript shapes that mirror the backend schemas.
export type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

// Matches TaskPage on the backend; total counts every task, not just this page.
export type TaskPage = {
  items: Task[]
  total: number
  offset: number
  limit: number
}

// Matches TaskCreate on the backend.
export type TaskInput = {
  title: string
  description: string | null
  due_date: string | null
}

// Matches TaskUpdate on the backend: only the fields sent are changed.
export type TaskPatch = Partial<TaskInput & { is_completed: boolean }>
