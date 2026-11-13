// TypeScript shapes that mirror the backend group schemas.
import type { Task, TaskInput } from "./task"

export type Group = {
  id: string
  name: string
  created_by: string
  my_role: "owner" | "member"
  created_at: string
}

export type Member = {
  user_id: string
  name: string
  email: string
  role: "owner" | "member"
  joined_at: string
}

export type GroupTask = Task & {
  owner_id: string
  group_id: string
  assignee_id: string | null
}

// Matches GroupTaskCreate and GroupTaskUpdate on the backend.
export type GroupTaskInput = TaskInput & {
  assignee_id: string | null
}

export type GroupTaskPatch = Partial<TaskInput & { is_completed: boolean; assignee_id: string | null }>
