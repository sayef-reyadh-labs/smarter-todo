// View, edit and delete one task at /tasks/:taskId.
import { Alert, App as AntApp, Button, Card, Checkbox, DatePicker, Descriptions, Flex, Form, Input, Popconfirm, Result, Select, Skeleton, Tag } from "antd"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { PageHeader } from "../../components/PageHeader"
import { apiService } from "../../services/api"
import type { Category, Task } from "../../types/task"
import { descriptionRules, titleRules, toFormValues, toTaskInput, type TaskFormValues } from "../../utils/taskForm"

type EditValues = TaskFormValues & { is_completed: boolean; category_id?: string | null }

export function TaskDetailsPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<EditValues>()

  const [task, setTask] = useState<Task | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [loaded, cats] = await Promise.all([apiService.getTask(taskId ?? ""), apiService.getCategories()])
        setTask(loaded)
        setCategories(cats)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [taskId])

  const handleSave = async ({ category_id, ...values }: EditValues) => {
    if (!task) return
    try {
      const input = toTaskInput(values)
      // The API rejects a past due date, so an unchanged one is not sent again.
      const updated = await apiService.updateTask(task.id, {
        title: input.title,
        description: input.description,
        ...(input.due_date !== task.due_date ? { due_date: input.due_date } : {}),
        category_id: category_id ?? null,
        is_completed: values.is_completed,
      })
      setTask(updated)
      setIsEditing(false)
      message.success("Task updated")
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to save changes")
    }
  }

  const handleDelete = async () => {
    if (!task) return
    try {
      await apiService.deleteTask(task.id)
      message.success("Task deleted")
      navigate("/")
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to delete task")
    }
  }

  if (loading) return <Skeleton active paragraph={{ rows: 5 }} />

  if (!task) {
    return (
      <Result
        status="404"
        title="Task not found"
        subTitle={error}
        extra={<Button type="primary" onClick={() => navigate("/")}>Back to tasks</Button>}
      />
    )
  }

  return (
    <>
      <PageHeader back={{ to: "/", label: "Back to tasks" }} title={isEditing ? "Edit task" : "Task details"} />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Card>
      {isEditing ? (
        <Form form={form} layout="vertical" initialValues={{ ...toFormValues(task), is_completed: task.is_completed, category_id: task.category_id }} onFinish={handleSave}>
          <Form.Item name="title" label="Title" rules={titleRules}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={descriptionRules}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="due_date" label="Due date">
            <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="category_id" label="Category">
            <Select allowClear placeholder="No category" options={categories.map((c) => ({ value: c.id, label: c.name }))} aria-label="Category" />
          </Form.Item>
          <Form.Item name="is_completed" valuePropName="checked">
            <Checkbox>Completed</Checkbox>
          </Form.Item>
          <Flex gap={8}>
            <Button type="primary" htmlType="submit">Save changes</Button>
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
          </Flex>
        </Form>
      ) : (
        <>
          <Descriptions
            bordered
            column={1}
            size="small"
            items={[
              { key: "title", label: "Title", children: task.title },
              { key: "description", label: "Description", children: task.description || "(No description)" },
              { key: "status", label: "Status", children: <Tag color={task.is_completed ? "green" : "gold"}>{task.is_completed ? "Completed" : "Pending"}</Tag> },
              { key: "due", label: "Due date", children: task.due_date || "(No due date)" },
              { key: "category", label: "Category", children: categories.find((c) => c.id === task.category_id)?.name ?? "(No category)" },
              { key: "created", label: "Created", children: new Date(task.created_at).toLocaleString() },
              { key: "updated", label: "Updated", children: new Date(task.updated_at).toLocaleString() },
            ]}
          />
          <Flex gap={8} style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => setIsEditing(true)}>Edit</Button>
            <Popconfirm title="Delete this task?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={handleDelete}>
              <Button danger>Delete</Button>
            </Popconfirm>
          </Flex>
        </>
      )}
      </Card>
    </>
  )
}
