// Friendly wording for due dates, so a card says "Due tomorrow" instead of a bare date.
import dayjs from "dayjs"

export type DueTone = "overdue" | "today" | "soon" | "later" | "done"

export type DueInfo = { label: string; tone: DueTone }

export function describeDue(dueDate: string, completed: boolean): DueInfo {
  if (completed) return { label: dueDate, tone: "done" }

  const days = dayjs(dueDate).startOf("day").diff(dayjs().startOf("day"), "day")
  if (days < 0) return { label: days === -1 ? "Overdue · yesterday" : `Overdue · ${-days} days`, tone: "overdue" }
  if (days === 0) return { label: "Due today", tone: "today" }
  if (days === 1) return { label: "Due tomorrow", tone: "soon" }
  if (days <= 7) return { label: `Due in ${days} days`, tone: "soon" }
  return { label: dueDate, tone: "later" }
}

export function greeting(now = dayjs()): string {
  const hour = now.hour()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}
