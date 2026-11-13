// TypeScript shapes that mirror the backend admin schemas.
import type { User } from "./auth"
import type { Task } from "./task"

export type { Page } from "./page"

export type AdminUser = User & {
  is_banned: boolean
  banned_at: string | null
  ban_reason: string | null
  status: "active" | "banned"
}

export type AdminTask = Task & {
  owner_id: string
  owner_email: string
  group_id: string | null
  group_name: string | null
}

export type AdminGroup = {
  id: string
  name: string
  owner_id: string
  owner_email: string
  member_count: number
  task_count: number
  created_at: string
}

// Query parameters of the admin lists; an undefined value means "no filter".
export type UserFilters = { q?: string; role?: "user" | "admin"; status?: "active" | "banned" }
export type TaskFilters = {
  owner_id?: string
  group_id?: string
  scope?: "personal" | "group"
  status?: "open" | "done" | "overdue"
  q?: string
}
export type GroupFilters = { owner_id?: string; q?: string }
export type ActivityFilters = { user_id?: string; action?: string; q?: string; date_from?: string; date_to?: string }

// Mirrors ActivityAction on the backend.
export const ACTIVITY_ACTIONS = [
  "signup",
  "login",
  "login_failed",
  "login_locked",
  "login_blocked",
  "logout",
  "password_changed",
  "password_change_failed",
  "profile_updated",
  "task_created",
  "task_updated",
  "task_deleted",
  "group_created",
  "group_renamed",
  "group_deleted",
  "member_added",
  "member_removed",
  "member_left",
  "group_task_created",
  "group_task_updated",
  "group_task_deleted",
  "role_changed",
  "user_banned",
  "user_unbanned",
  "admin_task_deleted",
] as const

export type AdminActivity = {
  id: string
  user_id: string | null
  email: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  detail: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type AdminStats = {
  users: { total: number; admins: number; banned: number; new_last_7_days: number }
  tasks: { total: number; completed: number; created_last_7_days: number }
  groups: { total: number }
}
