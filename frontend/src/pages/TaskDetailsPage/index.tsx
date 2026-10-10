import { Alert, App as AntApp, Button, Checkbox, DatePicker, Descriptions, Flex, Form, Input, Popconfirm, Result, Spin, Tag, Typography } from "antd"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { apiService } from "../../services/api"
import type { Task } from "../../types/task"
import { descriptionRules, titleRules, toFormValues, toTaskInput, type TaskFormValues } from "../../utils/taskForm"

type EditValues = TaskFormValues & { is_completed: boolean }

export function TaskDetailsPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<EditValues>()

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setTask(await apiService.getTask(Number(taskId)))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [taskId])

  const handleSave = async (values: EditValues) => {
    if (!task) return
    try {
      const updated = await apiService.updateTask(task.id, { ...toTaskInput(values), is_completed: values.is_completed })
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

  if (loading) return <Spin style={{ display: "block", marginTop: 64 }} />

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
      <Button type="link" onClick={() => navigate("/")} style={{ paddingLeft: 0 }}>
        ← Back to tasks
      </Button>
      <Typography.Title level={2}>{isEditing ? "Edit task" : "Task details"}</Typography.Title>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      {isEditing ? (
        <Form form={form} layout="vertical" initialValues={{ ...toFormValues(task), is_completed: task.is_completed }} onFinish={handleSave}>
          <Form.Item name="title" label="Title" rules={titleRules}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={descriptionRules}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="due_date" label="Due date">
            <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
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
            items={[
              { key: "title", label: "Title", children: task.title },
              { key: "description", label: "Description", children: task.description || "(No description)" },
              { key: "status", label: "Status", children: <Tag color={task.is_completed ? "green" : "gold"}>{task.is_completed ? "Completed" : "Pending"}</Tag> },
              { key: "due", label: "Due date", children: task.due_date || "(No due date)" },
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
    </>
  )
}
