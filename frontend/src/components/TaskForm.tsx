// Add-task form in a card; passes the validated values up to the page through onAdd.
import { PlusOutlined } from "@ant-design/icons"
import { Button, Card, DatePicker, Flex, Form, Input, Select } from "antd"
import { descriptionRules, titleRules, toTaskInput, type TaskFormValues } from "../utils/taskForm"
import type { Category, PersonalTaskInput } from "../types/task"

type Props = {
  categories: Category[]
  onAdd: (data: PersonalTaskInput) => Promise<boolean>
}

export function TaskForm({ categories, onAdd }: Props) {
  const [form] = Form.useForm<TaskFormValues & { category_id?: string }>()

  const handleFinish = async ({ category_id, ...values }: TaskFormValues & { category_id?: string }) => {
    if (await onAdd({ ...toTaskInput(values), category_id: category_id ?? null })) form.resetFields()
  }

  return (
    <Card title="Add a task" size="small" style={{ marginBottom: 24 }}>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="title" rules={titleRules} style={{ marginBottom: 12 }}>
          <Input placeholder="What needs to be done?" aria-label="Task title" />
        </Form.Item>
        <Form.Item name="description" rules={descriptionRules} style={{ marginBottom: 12 }}>
          <Input.TextArea rows={2} placeholder="Description (optional)" aria-label="Task description" />
        </Form.Item>
        <Flex gap={12} wrap>
          <Form.Item name="due_date" style={{ marginBottom: 0 }}>
            <DatePicker format="YYYY-MM-DD" placeholder="Due date (optional)" aria-label="Task due date" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="category_id" style={{ marginBottom: 0 }}>
            <Select
              allowClear
              placeholder="No category"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              style={{ width: 180 }}
              aria-label="Task category"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            Add task
          </Button>
        </Flex>
      </Form>
    </Card>
  )
}
