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

export type AdminTask = Task & { owner_id: string; group_id: string | null }

export type AdminStats = {
  users: { total: number; admins: number; banned: number; new_last_7_days: number }
  tasks: { total: number; completed: number; created_last_7_days: number }
  groups: { total: number }
}
