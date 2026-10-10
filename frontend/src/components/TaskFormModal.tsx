import { DatePicker, Form, Input, Modal } from "antd"
import dayjs, { type Dayjs } from "dayjs"
import { useEffect } from "react"
import type { Task, TaskInput } from "../api"

type FormValues = {
  title: string
  description?: string
  due_date?: Dayjs | null
}

type Props = {
  open: boolean
  task: Task | null
  onSubmit: (data: TaskInput) => Promise<void>
  onCancel: () => void
}

const TaskFormModal = ({ open, task, onSubmit, onCancel }: Props) => {
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      title: task?.title ?? "",
      description: task?.description ?? "",
      due_date: task?.due_date ? dayjs(task.due_date) : null,
    })
  }, [open, task, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    await onSubmit({
      title: values.title.trim(),
      description: values.description?.trim() || null,
      due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
    })
  }

  return (
    <Modal
      title={task ? "Edit task" : "New task"}
      open={open}
      okText={task ? "Save" : "Add"}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnHidden
      forceRender
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="title"
          label="Title"
          rules={[
            { required: true, whitespace: true, message: "Title is required" },
            { max: 200, message: "Title must be at most 200 characters" },
          ]}
        >
          <Input placeholder="What needs to be done?" autoFocus />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ max: 1000, message: "Description must be at most 1000 characters" }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="due_date" label="Due date">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default TaskFormModal
