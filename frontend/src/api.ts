export type Task = {
  id: number
  title: string
  description: string | null
  due_date: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

export type TaskInput = {
  title: string
  description: string | null
  due_date: string | null
}

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
    // not JSON
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

export const listTasks = (offset: number, limit = PAGE_SIZE) =>
  request<Task[]>(`${BASE}?offset=${offset}&limit=${limit}`)

export const createTask = (data: TaskInput) =>
  request<Task>(BASE, { method: "POST", body: JSON.stringify(data) })

export const updateTask = (id: number, data: Partial<TaskInput & { is_completed: boolean }>) =>
  request<Task>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(data) })

export const deleteTask = (id: number) => request<void>(`${BASE}/${id}`, { method: "DELETE" })
