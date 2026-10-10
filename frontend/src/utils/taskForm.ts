import dayjs, { type Dayjs } from "dayjs"
import type { Task, TaskInput } from "../types/task"

export type TaskFormValues = {
  title: string
  description?: string
  due_date?: Dayjs | null
}

export const toTaskInput = (values: TaskFormValues): TaskInput => ({
  title: values.title.trim(),
  description: values.description?.trim() || null,
  due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
})

export const toFormValues = (task: Task): TaskFormValues => ({
  title: task.title,
  description: task.description ?? "",
  due_date: task.due_date ? dayjs(task.due_date) : null,
})

export const titleRules = [
  { required: true, whitespace: true, message: "Title is required" },
  { max: 200, message: "Title must be at most 200 characters" },
]

export const descriptionRules = [{ max: 1000, message: "Description must be at most 1000 characters" }]
