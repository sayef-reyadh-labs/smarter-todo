// Task list page: loads tasks from the API, owns the list state and passes it to the components below.
import { Alert, App as AntApp, Segmented } from "antd"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { PageHeader } from "../../components/PageHeader"
import { TaskForm } from "../../components/TaskForm"
import { TaskList } from "../../components/TaskList"
import { TaskStats } from "../../components/TaskStats"
import { PAGE_SIZE, apiService } from "../../services/api"
import type { Task, TaskInput, TaskPatch } from "../../types/task"

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

type Filter = "all" | "open" | "done"

export function HomePage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()

  // useState stores a value; calling its setter re-renders the page with the new value.
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const hasMore = tasks.length < total

  // Reload as many rows as are already shown, so edits and deletes keep the list in place.
  const reload = async (shown: number) => {
    const size = Math.min(Math.max(shown, PAGE_SIZE), 100)
    const page = await apiService.getTasks(0, size)
    setTasks(page.items)
    setTotal(page.total)
  }

  // useEffect runs after render; the empty [] means only once, so tasks load when the page opens.
  useEffect(() => {
    const loadOnOpen = async () => {
      try {
        await reload(PAGE_SIZE)
      } catch (err) {
        setError(messageOf(err))
      } finally {
        setLoading(false)
      }
    }
    loadOnOpen()
  }, [])

  // Keep the browser tab title in sync with the number of open tasks.
  useEffect(() => {
    const pending = tasks.filter((t) => !t.is_completed).length
    document.title = pending > 0 ? `(${pending}) Smarter Todo` : "Smarter Todo"
  }, [tasks])

  // Other pages show the plain title, without this page's task count.
  useEffect(() => {
    return () => {
      document.title = "Smarter Todo"
    }
  }, [])

  // Runs a change, refreshes the list and reports the result; returns false on failure.
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action()
      await reload(tasks.length)
      message.success(success)
      return true
    } catch (err) {
      message.error(messageOf(err))
      return false
    }
  }

  const addTask = (data: TaskInput) => run(() => apiService.createTask(data), "Task added")

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
      const page = await apiService.getTasks(tasks.length, PAGE_SIZE)
      setTasks((prev) => [...prev, ...page.items])
      setTotal(page.total)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  // Derived value: no extra state needed to filter the list.
  const visibleTasks = tasks.filter((t) => filter === "all" || (filter === "done") === t.is_completed)

  return (
    <>
      <PageHeader title="My tasks" subtitle="Keep your tasks simple and focused." />

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <TaskForm onAdd={addTask} />

      {tasks.length > 0 && (
        <>
          <TaskStats tasks={tasks} onClearCompleted={clearCompleted} />
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Open", value: "open" },
              { label: "Done", value: "done" },
            ]}
            aria-label="Filter tasks"
            style={{ marginBottom: 16 }}
          />
        </>
      )}

      <TaskList
        tasks={visibleTasks}
        loading={loading}
        hasMore={hasMore}
        filtered={filter !== "all"}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onView={(id) => navigate(`/tasks/${id}`)}
        onLoadMore={loadMore}
      />
    </>
  )
}
