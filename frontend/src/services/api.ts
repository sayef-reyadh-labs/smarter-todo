import type { Task, TaskInput, TaskPatch } from "../types/task"

export const PAGE_SIZE = 20

const BASE = "/api/v1/tasks"

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

const request = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.status === 204 ? (undefined as T) : await res.json()
}

// Central place for every backend call, like smart-todo's apiService.
export const apiService = {
  getTasks: (offset = 0, limit = PAGE_SIZE) => request<Task[]>(`${BASE}?offset=${offset}&limit=${limit}`),

  getTask: (id: number) => request<Task>(`${BASE}/${id}`),

  createTask: (data: TaskInput) => request<Task>(BASE, { method: "POST", body: JSON.stringify(data) }),

  updateTask: (id: number, patch: TaskPatch) =>
    request<Task>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteTask: (id: number) => request<void>(`${BASE}/${id}`, { method: "DELETE" }),
}
