// Task list page: loads tasks from the API (filtered on the server), owns the list state and passes it to the components below.
import { TagsOutlined } from "@ant-design/icons"
import { Alert, App as AntApp, Button, Flex, Segmented, Select, type InputRef } from "antd"
import dayjs from "dayjs"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { CategoryManager } from "../../components/CategoryManager"
import { PageHeader } from "../../components/PageHeader"
import { SearchInput } from "../../components/SearchInput"
import { TaskForm } from "../../components/TaskForm"
import { TaskList } from "../../components/TaskList"
import { TaskStats } from "../../components/TaskStats"
import { useAuth } from "../../context/AuthContext"
import { PAGE_SIZE, apiService } from "../../services/api"
import type { Category, PersonalTaskInput, Task, TaskListFilters, TaskPatch } from "../../types/task"
import { greeting } from "../../utils/dates"

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

type Status = "all" | "open" | "done" | "overdue"

// "all" = every category, "none" = tasks without a category, otherwise a category id.
type View = { q?: string; category: string; status: Status }

const toApiFilters = (view: View): TaskListFilters => ({
  q: view.q,
  category_id: view.category !== "all" && view.category !== "none" ? view.category : undefined,
  uncategorized: view.category === "none",
  status: view.status === "all" ? undefined : view.status,
})

export function HomePage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const searchRef = useRef<InputRef>(null)
  // useState stores a value; calling its setter re-renders the page with the new value.
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [view, setView] = useState<View>({ category: "all", status: "all" })
  const [managing, setManaging] = useState(false)

  const filtered = view.q !== undefined || view.category !== "all" || view.status !== "all"
  const hasMore = tasks.length < total

  // Reload as many rows as are already shown, so edits and deletes keep the list in place.
  const reload = async (shown: number, current = view) => {
    const size = Math.min(Math.max(shown, PAGE_SIZE), 100)
    const page = await apiService.getTasks(0, size, toApiFilters(current))
    setTasks(page.items)
    setTotal(page.total)
  }

  const reloadCategories = async () => setCategories(await apiService.getCategories())

  // useEffect runs after render; this one runs again whenever the search or a filter changes.
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await Promise.all([reload(PAGE_SIZE, view), reloadCategories()])
        setError("")
      } catch (err) {
        setError(messageOf(err))
      } finally {
        setLoading(false)
      }
    }
    load()
    // reload and reloadCategories only use state setters, so the view is the only real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Keep the browser tab title in sync with the number of open tasks (only when nothing is filtered).
  useEffect(() => {
    if (filtered) return
    const pending = tasks.filter((t) => !t.is_completed).length
    document.title = pending > 0 ? `(${pending}) Smarter Todo` : "Smarter Todo"
  }, [tasks, filtered])

  // Other pages show the plain title, without this page's task count.
  useEffect(() => {
    return () => {
      document.title = "Smarter Todo"
    }
  }, [])

  // Pressing / jumps to the search box, like on GitHub, unless the user is already typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (e.key !== "/" || typing || e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Runs a change, refreshes the list and reports the result; returns false on failure.
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action()
      await Promise.all([reload(tasks.length), reloadCategories()])
      message.success(success)
      return true
    } catch (err) {
      message.error(messageOf(err))
      return false
    }
  }

  const addTask = (data: PersonalTaskInput) => run(() => apiService.createTask(data), "Task added")

  const toggleTask = (task: Task) => {
    const patch: TaskPatch = { is_completed: !task.is_completed }
    return run(() => apiService.updateTask(task.id, patch), task.is_completed ? "Marked as open" : "Marked as done")
  }

  const deleteTask = (id: string) => run(() => apiService.deleteTask(id), "Task deleted")

  const clearCompleted = () =>
    run(
      () => Promise.all(tasks.filter((t) => t.is_completed).map((t) => apiService.deleteTask(t.id))),
      "Completed tasks cleared",
    )

  const loadMore = async () => {
    try {
      const page = await apiService.getTasks(tasks.length, PAGE_SIZE, toApiFilters(view))
      setTasks((prev) => [...prev, ...page.items])
      setTotal(page.total)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  const categoryOptions = [
    { value: "all", label: "All categories" },
    { value: "none", label: "No category" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <>
      <PageHeader
        title={user ? `${greeting()}, ${user.name.split(" ")[0]}` : "My tasks"}
        subtitle={`${dayjs().format("dddd, D MMMM")} · keep your tasks simple and focused.`}
        extra={
          <Button icon={<TagsOutlined />} onClick={() => setManaging(true)}>
            Categories
          </Button>
        }
      />

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <TaskForm categories={categories} onAdd={addTask} />

      {tasks.length > 0 && !filtered && <TaskStats tasks={tasks} onClearCompleted={clearCompleted} />}

      <Flex wrap gap={8} style={{ marginBottom: 16 }}>
        <SearchInput inputRef={searchRef} placeholder="Search tasks (press /)" onSearch={(q) => setView((prev) => (prev.q === q ? prev : { ...prev, q }))} width={220} />
        <Select
          value={view.category}
          options={categoryOptions}
          onChange={(category) => setView((prev) => ({ ...prev, category }))}
          style={{ width: 190 }}
          aria-label="Filter by category"
        />
        <Segmented
          value={view.status}
          onChange={(status) => setView((prev) => ({ ...prev, status: status as Status }))}
          options={[
            { label: "All", value: "all" },
            { label: "Open", value: "open" },
            { label: "Done", value: "done" },
            { label: "Overdue", value: "overdue" },
          ]}
          aria-label="Filter tasks by status"
        />
      </Flex>

      {filtered && !loading && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${total} task(s) match your filters`}
          action={
            <Button size="small" onClick={() => setView({ category: "all", status: "all" })}>
              Clear filters
            </Button>
          }
        />
      )}

      <TaskList
        tasks={tasks}
        categories={categories}
        loading={loading}
        hasMore={hasMore}
        filtered={filtered}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onView={(id) => navigate(`/tasks/${id}`)}
        onLoadMore={loadMore}
      />

      <CategoryManager
        open={managing}
        categories={categories}
        onClose={() => setManaging(false)}
        onCreate={(name) => run(() => apiService.createCategory(name), "Category added")}
        onRename={(id, name) => run(() => apiService.renameCategory(id, name), "Category renamed")}
        onDelete={(id) => {
          if (view.category === id) setView((prev) => ({ ...prev, category: "all" }))
          return run(() => apiService.deleteCategory(id), "Category deleted")
        }}
      />
    </>
  )
}
