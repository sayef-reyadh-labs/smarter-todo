// Every backend call lives here; pages never call fetch directly. Also keeps the access token and refreshes it.
import type { LoginInput, PasswordChangeInput, SignupInput, TokenResponse, User } from "../types/auth"
import type {
  ActivityFilters,
  AdminActivity,
  AdminGroup,
  AdminStats,
  AdminTask,
  AdminUser,
  GroupFilters,
  Page,
  TaskFilters,
  UserFilters,
} from "../types/admin"
import type { Group, GroupTask, GroupTaskInput, GroupTaskPatch, Member } from "../types/group"
import type { Task, TaskInput, TaskPage, TaskPatch } from "../types/task"
import { HttpStatus } from "../utils/httpStatus"

export const PAGE_SIZE = 20

const BASE = "/api/v1/tasks"
const AUTH = "/api/v1/auth"
const ME = "/api/v1/users/me"
const ADMIN = "/api/v1/admin"
const GROUPS = "/api/v1/groups"

// The access token lives in memory only (not localStorage), so scripts on the page cannot steal it.
let accessToken: string | null = null
let sessionExpiredHandler: (() => void) | null = null

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
      accessToken = ((await res.json()) as TokenResponse).access_token
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

const request = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  let res = await send(url, options)
  // An expired access token: get a new one from the refresh cookie and try once more.
  if (res.status === HttpStatus.Unauthorized && !url.startsWith(AUTH)) {
    if (await refreshAccessToken()) {
      res = await send(url, options)
    } else {
      accessToken = null
      sessionExpiredHandler?.()
    }
  }
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.status === HttpStatus.NoContent ? (undefined as T) : await res.json()
}

const post = <T,>(url: string, data?: unknown) =>
  request<T>(url, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) })

// "?offset=0&limit=10&q=abc": filters left undefined or empty are left out.
const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  return `?${search.toString()}`
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
    accessToken = token.access_token
  },

  // Page reload: the memory is empty but the cookie may still be valid.
  restoreSession: async (): Promise<User | null> => {
    if (!(await refreshAccessToken())) return null
    return request<User>(ME)
  },

  logout: async () => {
    try {
      await post<void>(`${AUTH}/logout`)
    } finally {
      accessToken = null
    }
  },

  getMe: () => request<User>(ME),

  updateMe: (name: string) => request<User>(ME, { method: "PATCH", body: JSON.stringify({ name }) }),

  changePassword: (data: PasswordChangeInput) => post<void>(`${ME}/password`, data),

  getTasks: (offset = 0, limit = PAGE_SIZE) => request<TaskPage>(`${BASE}?offset=${offset}&limit=${limit}`),

  getTask: (id: string) => request<Task>(`${BASE}/${id}`),

  createTask: (data: TaskInput) => post<Task>(BASE, data),

  updateTask: (id: string, patch: TaskPatch) =>
    request<Task>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteTask: (id: string) => request<void>(`${BASE}/${id}`, { method: "DELETE" }),

  getAdminStats: () => request<AdminStats>(`${ADMIN}/stats`),

  getAdminUsers: (offset = 0, limit = 10, filters: UserFilters = {}) =>
    request<Page<AdminUser>>(`${ADMIN}/users${query({ offset, limit, ...filters })}`),

  changeUserRole: (id: string, role: "user" | "admin") =>
    request<User>(`${ADMIN}/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),

  banUser: (id: string, reason: string) => post<AdminUser>(`${ADMIN}/users/${id}/ban`, { reason: reason || null }),

  unbanUser: (id: string) => post<AdminUser>(`${ADMIN}/users/${id}/unban`),

  getAdminTasks: (offset = 0, limit = 10, filters: TaskFilters = {}) =>
    request<Page<AdminTask>>(`${ADMIN}/tasks${query({ offset, limit, ...filters })}`),

  getAdminGroups: (offset = 0, limit = 10, filters: GroupFilters = {}) =>
    request<Page<AdminGroup>>(`${ADMIN}/groups${query({ offset, limit, ...filters })}`),

  deleteAdminTask: (id: string) => request<void>(`${ADMIN}/tasks/${id}`, { method: "DELETE" }),

  getAdminActivity: (offset = 0, limit = 10, filters: ActivityFilters = {}) =>
    request<Page<AdminActivity>>(`${ADMIN}/activity${query({ offset, limit, ...filters })}`),

  getGroups: () => request<Group[]>(GROUPS),

  getGroup: (id: string) => request<Group>(`${GROUPS}/${id}`),

  createGroup: (name: string) => post<Group>(GROUPS, { name }),

  renameGroup: (id: string, name: string) =>
    request<Group>(`${GROUPS}/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),

  deleteGroup: (id: string) => request<void>(`${GROUPS}/${id}`, { method: "DELETE" }),

  getMembers: (id: string) => request<Member[]>(`${GROUPS}/${id}/members`),

  addMember: (id: string, email: string) => post<Member>(`${GROUPS}/${id}/members`, { email }),

  removeMember: (id: string, userId: string) => request<void>(`${GROUPS}/${id}/members/${userId}`, { method: "DELETE" }),

  getGroupTasks: (id: string, offset = 0, limit = 100) =>
    request<Page<GroupTask>>(`${GROUPS}/${id}/tasks?offset=${offset}&limit=${limit}`),

  createGroupTask: (id: string, data: GroupTaskInput) => post<GroupTask>(`${GROUPS}/${id}/tasks`, data),

  updateGroupTask: (id: string, taskId: string, patch: GroupTaskPatch) =>
    request<GroupTask>(`${GROUPS}/${id}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteGroupTask: (id: string, taskId: string) =>
    request<void>(`${GROUPS}/${id}/tasks/${taskId}`, { method: "DELETE" }),
}
