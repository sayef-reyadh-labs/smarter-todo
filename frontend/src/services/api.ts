// Every backend call lives here; pages never call fetch directly. Also keeps the access token and refreshes it.
import type { LoginInput, PasswordChangeInput, Session, SignupInput, TokenResponse, User } from "../types/auth"
import type {
  ActivityFilters,
  AdminActivity,
  AdminGroup,
  AdminStats,
  AdminTask,
  AdminUser,
  AdminUserDetail,
  BulkResult,
  GroupFilters,
  Page,
  PurgeResult,
  SecurityReport,
  TaskFilters,
  UserFilters,
} from "../types/admin"
import type { Group, GroupTask, GroupTaskInput, GroupTaskPatch, Member } from "../types/group"
import type { Category, PersonalTaskInput, Task, TaskListFilters, TaskPage, TaskPatch } from "../types/task"
import { HttpStatus } from "../utils/httpStatus"

export const PAGE_SIZE = 20

const BASE = "/api/v1/tasks"
const AUTH = "/api/v1/auth"
const ME = "/api/v1/users/me"
const ADMIN = "/api/v1/admin"
const GROUPS = "/api/v1/groups"
const CATEGORIES = "/api/v1/categories"

// The access token is kept in localStorage with its expiry, so a reload or a second tab can reuse it until it runs out.
const TOKEN_KEY = "smarter_todo_access_token"
// A 401 in the last seconds before the expiry is treated as plain expiry (clock and network delay).
const EXPIRY_MARGIN_MS = 30_000
let accessToken: string | null = null
let accessExpiresAt = 0
let sessionExpiredHandler: (() => void) | null = null

const readStoredToken = (): string | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null") as { token: string; expiresAt: number } | null
    if (saved && typeof saved.token === "string" && saved.expiresAt > Date.now()) {
      accessExpiresAt = saved.expiresAt
      return saved.token
    }
  } catch {
    // unreadable value: treat as no token
  }
  localStorage.removeItem(TOKEN_KEY)
  accessExpiresAt = 0
  return null
}

// Remembers a new token for expires_in seconds, or forgets it when called with null.
const storeToken = (token: TokenResponse | null) => {
  accessToken = token?.access_token ?? null
  accessExpiresAt = token ? Date.now() + token.expires_in * 1000 : 0
  if (token) localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: token.access_token, expiresAt: accessExpiresAt }))
  else localStorage.removeItem(TOKEN_KEY)
}

accessToken = readStoredToken()

// Another tab logged in, refreshed or logged out: follow it.
window.addEventListener("storage", (event) => {
  if (event.key === TOKEN_KEY) accessToken = readStoredToken()
})

// FastAPI sends detail as a string (404) or a list of {loc, msg} (422).
const errorMessage = async (res: Response): Promise<string> => {
  try {
    const { detail } = await res.json()
    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) {
      return detail.map((d: { loc: string[]; msg: string }) => `${d.loc.at(-1)}: ${d.msg}`).join("; ")
    }
  } catch {
    // body was not JSON
  }
  return `Request failed (${res.status})`
}

const send = (url: string, options?: RequestInit) =>
  fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

// The refresh token cookie is rotated on every use, so two calls at once must share one request.
let refreshing: Promise<boolean> | null = null

const refreshAccessToken = (): Promise<boolean> => {
  refreshing ??= (async () => {
    try {
      const res = await send(`${AUTH}/refresh`, { method: "POST" })
      if (!res.ok) return false
      storeToken((await res.json()) as TokenResponse)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

// Several calls can fail together; they share one logout so the cookie is only revoked once.
let ending: Promise<void> | null = null

const endSession = (): Promise<void> => {
  ending ??= (async () => {
    try {
      await fetch(`${AUTH}/logout`, { method: "POST" }) // revokes the refresh token and clears its cookie
    } catch {
      // offline: the local session is dropped anyway
    } finally {
      storeToken(null)
      sessionExpiredHandler?.()
      ending = null
    }
  })()
  return ending
}

// Sends the call; an expired access token is renewed from the refresh cookie and the call is tried once more.
// A token the server rejects before it should have expired was tampered with (or its user is gone): the session ends instead.
const sendWithRefresh = async (url: string, options?: RequestInit): Promise<Response> => {
  let res = await send(url, options)
  if (res.status === HttpStatus.Unauthorized && !url.startsWith(AUTH)) {
    if (accessToken !== null && accessExpiresAt - Date.now() > EXPIRY_MARGIN_MS) {
      await endSession()
      throw new Error("Your session is not valid any more. Please log in again.")
    }
    if (await refreshAccessToken()) {
      res = await send(url, options)
    } else {
      storeToken(null)
      sessionExpiredHandler?.()
    }
  }
  if (!res.ok) throw new Error(await errorMessage(res))
  return res
}

const request = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const res = await sendWithRefresh(url, options)
  return res.status === HttpStatus.NoContent ? (undefined as T) : await res.json()
}

const post = <T,>(url: string, data?: unknown) =>
  request<T>(url, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) })

const patch = <T,>(url: string, data: unknown) => request<T>(url, { method: "PATCH", body: JSON.stringify(data) })

// "?offset=0&limit=10&q=abc": filters left undefined or empty are left out.
const query = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== false) search.set(key, String(value))
  }
  return `?${search.toString()}`
}

// Downloads a file the API answers with (the CSV exports) and hands it to the browser.
const download = async (url: string) => {
  const res = await sendWithRefresh(url)
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "export.csv"
  const link = document.createElement("a")
  link.href = URL.createObjectURL(await res.blob())
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}

// Central place for every backend call, like smart-todo's apiService.
export const apiService = {
  // The page calls this so it can send the user to the login screen when the session ends.
  onSessionExpired: (handler: (() => void) | null) => {
    sessionExpiredHandler = handler
  },

  signup: (data: SignupInput) => post<User>(`${AUTH}/signup`, data),

  login: async (data: LoginInput) => {
    const token = await post<TokenResponse>(`${AUTH}/login`, data)
    storeToken(token)
  },

  // Page reload: use the stored token if it is still valid, otherwise swap the cookie for a new one.
  restoreSession: async (): Promise<User | null> => {
    if (accessToken) {
      try {
        return await request<User>(ME)
      } catch {
        return null
      }
    }
    if (!(await refreshAccessToken())) return null
    return request<User>(ME)
  },

  logout: async () => {
    try {
      await post<void>(`${AUTH}/logout`)
    } finally {
      storeToken(null)
    }
  },

  getMe: () => request<User>(ME),

  updateMe: (name: string) => patch<User>(ME, { name }),

  changePassword: (data: PasswordChangeInput) => post<void>(`${ME}/password`, data),

  getSessions: () => request<Session[]>(`${AUTH}/sessions`),

  revokeSession: (id: string) => request<void>(`${AUTH}/sessions/${id}`, { method: "DELETE" }),

  revokeOtherSessions: () => post<void>(`${AUTH}/sessions/revoke-others`),

  // Ends every session, this one too; the caller then drops the local login.
  revokeAllSessions: async () => {
    await post<void>(`${AUTH}/sessions/revoke-all`)
    storeToken(null)
  },

  getTasks: (offset = 0, limit = PAGE_SIZE, filters: TaskListFilters = {}) =>
    request<TaskPage>(`${BASE}${query({ offset, limit, ...filters })}`),

  getTask: (id: string) => request<Task>(`${BASE}/${id}`),

  createTask: (data: PersonalTaskInput) => post<Task>(BASE, data),

  updateTask: (id: string, changes: TaskPatch) => patch<Task>(`${BASE}/${id}`, changes),

  deleteTask: (id: string) => request<void>(`${BASE}/${id}`, { method: "DELETE" }),

  getCategories: () => request<Category[]>(CATEGORIES),

  createCategory: (name: string) => post<Category>(CATEGORIES, { name }),

  renameCategory: (id: string, name: string) => patch<Category>(`${CATEGORIES}/${id}`, { name }),

  deleteCategory: (id: string) => request<void>(`${CATEGORIES}/${id}`, { method: "DELETE" }),

  getAdminStats: () => request<AdminStats>(`${ADMIN}/stats`),

  getAdminUsers: (offset = 0, limit = 10, filters: UserFilters = {}) =>
    request<Page<AdminUser>>(`${ADMIN}/users${query({ offset, limit, ...filters })}`),

  getAdminUser: (id: string) => request<AdminUserDetail>(`${ADMIN}/users/${id}`),

  changeUserRole: (id: string, role: "user" | "admin") => patch<User>(`${ADMIN}/users/${id}/role`, { role }),

  banUser: (id: string, reason: string) => post<AdminUser>(`${ADMIN}/users/${id}/ban`, { reason: reason || null }),

  unbanUser: (id: string) => post<AdminUser>(`${ADMIN}/users/${id}/unban`),

  bulkBanUsers: (ids: string[], reason: string) => post<BulkResult>(`${ADMIN}/users/bulk-ban`, { ids, reason: reason || null }),

  bulkUnbanUsers: (ids: string[]) => post<BulkResult>(`${ADMIN}/users/bulk-unban`, { ids }),

  revokeUserSessions: (id: string) => post<void>(`${ADMIN}/users/${id}/revoke-sessions`),

  getAdminTasks: (offset = 0, limit = 10, filters: TaskFilters = {}) =>
    request<Page<AdminTask>>(`${ADMIN}/tasks${query({ offset, limit, ...filters })}`),

  deleteAdminTask: (id: string) => request<void>(`${ADMIN}/tasks/${id}`, { method: "DELETE" }),

  bulkDeleteAdminTasks: (ids: string[]) => post<BulkResult>(`${ADMIN}/tasks/bulk-delete`, { ids }),

  getAdminGroups: (offset = 0, limit = 10, filters: GroupFilters = {}) =>
    request<Page<AdminGroup>>(`${ADMIN}/groups${query({ offset, limit, ...filters })}`),

  getAdminGroup: (id: string) => request<AdminGroup>(`${ADMIN}/groups/${id}`),

  deleteAdminGroup: (id: string) => request<void>(`${ADMIN}/groups/${id}`, { method: "DELETE" }),

  getAdminActivity: (offset = 0, limit = 10, filters: ActivityFilters = {}) =>
    request<Page<AdminActivity>>(`${ADMIN}/activity${query({ offset, limit, ...filters })}`),

  purgeAdminActivity: (olderThanDays?: number) =>
    request<PurgeResult>(`${ADMIN}/activity${query({ older_than_days: olderThanDays })}`, { method: "DELETE" }),

  getSecurityReport: (hours = 24, minFailures = 3) => request<SecurityReport>(`${ADMIN}/security/report${query({ hours, min_failures: minFailures })}`),

  exportAdminUsers: (filters: UserFilters = {}) => download(`${ADMIN}/users/export${query({ ...filters })}`),

  exportAdminTasks: (filters: TaskFilters = {}) => download(`${ADMIN}/tasks/export${query({ ...filters })}`),

  exportAdminActivity: (filters: ActivityFilters = {}) => download(`${ADMIN}/activity/export${query({ ...filters })}`),

  getGroups: () => request<Group[]>(GROUPS),

  getGroup: (id: string) => request<Group>(`${GROUPS}/${id}`),

  createGroup: (name: string) => post<Group>(GROUPS, { name }),

  renameGroup: (id: string, name: string) => patch<Group>(`${GROUPS}/${id}`, { name }),

  deleteGroup: (id: string) => request<void>(`${GROUPS}/${id}`, { method: "DELETE" }),

  getMembers: (id: string) => request<Member[]>(`${GROUPS}/${id}/members`),

  addMember: (id: string, email: string) => post<Member>(`${GROUPS}/${id}/members`, { email }),

  setMemberPermissions: (id: string, userId: string, permissions: string[]) =>
    patch<Member>(`${GROUPS}/${id}/members/${userId}/permissions`, { permissions }),

  removeMember: (id: string, userId: string) => request<void>(`${GROUPS}/${id}/members/${userId}`, { method: "DELETE" }),

  getGroupTasks: (id: string, offset = 0, limit = 100) =>
    request<Page<GroupTask>>(`${GROUPS}/${id}/tasks?offset=${offset}&limit=${limit}`),

  createGroupTask: (id: string, data: GroupTaskInput) => post<GroupTask>(`${GROUPS}/${id}/tasks`, data),

  updateGroupTask: (id: string, taskId: string, changes: GroupTaskPatch) => patch<GroupTask>(`${GROUPS}/${id}/tasks/${taskId}`, changes),

  deleteGroupTask: (id: string, taskId: string) => request<void>(`${GROUPS}/${id}/tasks/${taskId}`, { method: "DELETE" }),
}
