// TypeScript shapes that mirror the backend schemas.
export type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  is_completed: boolean
  category_id: string | null
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

// Matches TaskCreate on the backend (the shape group tasks also use).
export type TaskInput = {
  title: string
  description: string | null
  due_date: string | null
}

// A personal task may also be put in one of the user's categories.
export type PersonalTaskInput = TaskInput & { category_id?: string | null }

// Matches PersonalTaskUpdate on the backend: only the fields sent are changed.
export type TaskPatch = Partial<PersonalTaskInput & { is_completed: boolean }>

// Query parameters of the personal task list; an undefined value means "no filter".
export type TaskListFilters = {
  q?: string
  category_id?: string
  uncategorized?: boolean
  status?: "open" | "done" | "overdue"
}

export type Category = {
  id: string
  name: string
  task_count: number
  created_at: string
}
