// TypeScript shapes that mirror the backend admin schemas.
import type { Session, User } from "./auth"
import type { Task } from "./task"

export type { Page } from "./page"

export type AdminUser = User & {
  is_banned: boolean
  banned_at: string | null
  ban_reason: string | null
  last_login_at: string | null
  failed_logins_7d: number
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
  "session_revoked",
  "sessions_revoked",
  "category_created",
  "category_renamed",
  "category_deleted",
  "task_created",
  "task_updated",
  "task_deleted",
  "group_created",
  "group_renamed",
  "group_deleted",
  "member_added",
  "member_removed",
  "member_left",
  "member_permissions_changed",
  "group_task_created",
  "group_task_updated",
  "group_task_deleted",
  "role_changed",
  "user_banned",
  "user_unbanned",
  "auth_rejected",
  "access_denied",
  "token_reuse_detected",
  "admin_task_deleted",
  "admin_tasks_deleted",
  "admin_group_deleted",
  "admin_sessions_revoked",
  "data_exported",
  "activity_purged",
] as const

// Actions that point at an attack or a mistake; shown in red.
export const HOSTILE_ACTIONS: string[] = ["login_failed", "login_locked", "login_blocked", "password_change_failed", "auth_rejected", "access_denied", "token_reuse_detected"]

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

export type BulkResult = { affected: number; skipped: number }

export type PurgeResult = { deleted: number; cutoff: string }

export type SuspiciousIp = { ip_address: string; failures: number; distinct_accounts: number; last_seen: string }
export type SuspiciousAccount = { email: string; user_id: string | null; failures: number; distinct_ips: number; last_seen: string }
export type SecurityReport = { since: string; ips: SuspiciousIp[]; accounts: SuspiciousAccount[] }

// Everything the user drawer shows about one person.
export type AdminUserDetail = {
  user: AdminUser
  tasks: { total: number; open: number; done: number }
  groups: { id: string; name: string; role: string }[]
  recent_tasks: { id: string; title: string; is_completed: boolean; due_date: string | null; group_name: string | null }[]
  sessions: Session[]
  recent_activity: AdminActivity[]
}
