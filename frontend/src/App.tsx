import { PlusOutlined } from "@ant-design/icons"
import { Alert, App as AntApp, Button, Card, Empty, Layout, List, Typography } from "antd"
import { useCallback, useEffect, useState } from "react"
import { PAGE_SIZE, createTask, deleteTask, listTasks, updateTask, type Task, type TaskInput } from "./api"
import TaskFormModal from "./components/TaskFormModal"
import TaskItem from "./components/TaskItem"

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

const App = () => {
  const { message } = AntApp.useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  // Reload as many rows as are already shown, so edits and deletes keep the list in place.
  const reload = useCallback(async (shown: number) => {
    const size = Math.min(Math.max(shown, PAGE_SIZE), 100)
    const rows = await listTasks(0, size)
    setTasks(rows)
    setHasMore(rows.length === size)
  }, [])

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
  }, [reload])

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

  const loadMore = async () => {
    try {
      const rows = await listTasks(tasks.length, PAGE_SIZE)
      setTasks((prev) => [...prev, ...rows])
      setHasMore(rows.length === PAGE_SIZE)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  const submitForm = async (data: TaskInput) => {
    const target = editing
    const ok = await run(
      () => (target ? updateTask(target.id, data) : createTask(data)),
      target ? "Task updated" : "Task added",
    )
    if (ok) setFormOpen(false)
  }

  const toggle = (task: Task) =>
    run(() => updateTask(task.id, { is_completed: !task.is_completed }), task.is_completed ? "Marked as open" : "Marked as done")

  const remove = (id: number) => run(() => deleteTask(id), "Task deleted")

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Content style={{ maxWidth: 720, width: "100%", margin: "0 auto", padding: "48px 16px" }}>
        <Card
          title={<Typography.Title level={3} style={{ margin: 0 }}>Smarter Todo</Typography.Title>}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              New task
            </Button>
          }
        >
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <List
            loading={loading}
            dataSource={tasks}
            locale={{ emptyText: <Empty description="No tasks yet" /> }}
            renderItem={(task) => <TaskItem task={task} onToggle={toggle} onEdit={openEdit} onDelete={remove} />}
            loadMore={
              hasMore && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <Button onClick={loadMore}>Load more</Button>
                </div>
              )
            }
          />
        </Card>
      </Layout.Content>
      <TaskFormModal open={formOpen} task={editing} onSubmit={submitForm} onCancel={() => setFormOpen(false)} />
    </Layout>
  )
}

export default App
