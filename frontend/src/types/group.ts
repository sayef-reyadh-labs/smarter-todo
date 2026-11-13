// TypeScript shapes that mirror the backend group schemas.
import type { Task, TaskInput } from "./task"

// What a group owner can hand to a member (mirrors DELEGABLE_GROUP_PERMISSIONS on the backend).
export const GROUP_PERMISSIONS = [
  { value: "group:tasks:create", label: "Create tasks", help: "Add new tasks to the group" },
  { value: "group:tasks:update", label: "Edit tasks", help: "Change title, description, due date and mark done" },
  { value: "group:tasks:assign", label: "Assign tasks", help: "Choose who a task is assigned to" },
] as const

export type GroupPermission = (typeof GROUP_PERMISSIONS)[number]["value"]

export type Group = {
  id: string
  name: string
  created_by: string
  my_role: "owner" | "member"
  my_permissions: GroupPermission[]
  created_at: string
}

export type Member = {
  user_id: string
  name: string
  email: string
  role: "owner" | "member"
  permissions: GroupPermission[]
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
