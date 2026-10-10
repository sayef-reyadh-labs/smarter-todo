import { PlusOutlined } from "@ant-design/icons"
import { Button, DatePicker, Form, Input } from "antd"
import { descriptionRules, titleRules, toTaskInput, type TaskFormValues } from "../utils/taskForm"
import type { TaskInput } from "../types/task"

type Props = {
  onAdd: (data: TaskInput) => Promise<boolean>
}

export function TaskForm({ onAdd }: Props) {
  const [form] = Form.useForm<TaskFormValues>()

  const handleFinish = async (values: TaskFormValues) => {
    if (await onAdd(toTaskInput(values))) form.resetFields()
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginBottom: 24 }}>
      <Form.Item name="title" rules={titleRules} style={{ marginBottom: 12 }}>
        <Input placeholder="Task title" aria-label="Task title" />
      </Form.Item>
      <Form.Item name="description" rules={descriptionRules} style={{ marginBottom: 12 }}>
        <Input.TextArea rows={2} placeholder="Description (optional)" aria-label="Task description" />
      </Form.Item>
      <Form.Item name="due_date" style={{ marginBottom: 12 }}>
        <DatePicker format="YYYY-MM-DD" placeholder="Due date (optional)" style={{ width: "100%" }} />
      </Form.Item>
      <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
        Add task
      </Button>
    </Form>
  )
}
