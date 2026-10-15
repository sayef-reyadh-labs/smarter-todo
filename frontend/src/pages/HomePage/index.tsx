import { Alert, App as AntApp, Switch, Typography } from "antd"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { TaskForm } from "../../components/TaskForm"
import { TaskList } from "../../components/TaskList"
import { TaskStats } from "../../components/TaskStats"
import { PAGE_SIZE, apiService } from "../../services/api"
import type { Task, TaskInput, TaskPatch } from "../../types/task"

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function HomePage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()

  // useState stores a value; calling its setter re-renders the page with the new value.
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState("")
  const [showDone, setShowDone] = useState(true)

  // Reload as many rows as are already shown, so edits and deletes keep the list in place.
  const reload = async (shown: number) => {
    const size = Math.min(Math.max(shown, PAGE_SIZE), 100)
    const rows = await apiService.getTasks(0, size)
    setTasks(rows)
    setHasMore(rows.length === size)
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

  const deleteTask = (id: number) => run(() => apiService.deleteTask(id), "Task deleted")

  const clearCompleted = () =>
    run(
      () => Promise.all(tasks.filter((t) => t.is_completed).map((t) => apiService.deleteTask(t.id))),
      "Completed tasks cleared",
    )

  const loadMore = async () => {
    try {
      const rows = await apiService.getTasks(tasks.length, PAGE_SIZE)
      setTasks((prev) => [...prev, ...rows])
      setHasMore(rows.length === PAGE_SIZE)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  // Derived value: no extra state needed to hide completed tasks.
  const visibleTasks = showDone ? tasks : tasks.filter((t) => !t.is_completed)

  return (
    <>
      <Typography.Title level={2}>Smarter Todo</Typography.Title>
      <Typography.Paragraph type="secondary">Keep your tasks simple and focused.</Typography.Paragraph>

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <TaskForm onAdd={addTask} />

      {tasks.length > 0 && (
        <>
          <TaskStats tasks={tasks} onClearCompleted={clearCompleted} />
          <Switch size="small" checked={showDone} onChange={setShowDone} />{" "}
          <Typography.Text type="secondary">Show completed</Typography.Text>
        </>
      )}

      <TaskList
        tasks={visibleTasks}
        loading={loading}
        hasMore={hasMore}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onView={(id) => navigate(`/tasks/${id}`)}
        onLoadMore={loadMore}
      />
    </>
  )
}
