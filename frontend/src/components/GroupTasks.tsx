// Tasks of a group with description, due date and an assignee for each; every change goes up through callbacks.
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Checkbox, DatePicker, Empty, Flex, Form, Input, Modal, Popconfirm, Select, Space, Tag, Typography } from "antd"
import dayjs from "dayjs"
import { descriptionRules, titleRules, toFormValues, toTaskInput, type TaskFormValues } from "../utils/taskForm"
import { useState } from "react"
import type { GroupTask, GroupTaskInput, GroupTaskPatch, Member } from "../types/group"

type Props = {
  tasks: GroupTask[]
  members: Member[]
  currentUserId: string
  isOwner: boolean
  onAdd: (data: GroupTaskInput) => Promise<boolean>
  onToggle: (task: GroupTask) => void
  onAssign: (task: GroupTask, assigneeId: string | null) => void
  onEdit: (task: GroupTask, patch: GroupTaskPatch) => Promise<boolean>
  onDelete: (task: GroupTask) => void
}

const isOverdue = (task: GroupTask) =>
  !task.is_completed && task.due_date !== null && dayjs(task.due_date).isBefore(dayjs(), "day")

type EditModalProps = { task: GroupTask; onSave: Props["onEdit"]; onClose: () => void }

function EditTaskModal({ task, onSave, onClose }: EditModalProps) {
  const [form] = Form.useForm<TaskFormValues>()

  const handleFinish = async (values: TaskFormValues) => {
    const input = toTaskInput(values)
    // The API rejects a past due date, so an unchanged one is not sent again.
    const patch: GroupTaskPatch = { title: input.title, description: input.description }
    if (input.due_date !== task.due_date) patch.due_date = input.due_date
    if (await onSave(task, patch)) onClose()
  }

  return (
    <Modal open title="Edit task" okText="Save" onOk={() => form.submit()} onCancel={onClose} forceRender>
      <Form form={form} layout="vertical" initialValues={toFormValues(task)} onFinish={handleFinish}>
        <Form.Item name="title" label="Title" rules={titleRules}>
          <Input aria-label="Edit title" />
        </Form.Item>
        <Form.Item name="description" label="Description" rules={descriptionRules}>
          <Input.TextArea rows={3} aria-label="Edit description" />
        </Form.Item>
        <Form.Item name="due_date" label="Due date">
          <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export function GroupTasks({ tasks, members, currentUserId, isOwner, onAdd, onToggle, onAssign, onEdit, onDelete }: Props) {
  const [form] = Form.useForm<TaskFormValues & { assignee?: string }>()
  const [editing, setEditing] = useState<GroupTask | null>(null)
  const assigneeOptions = members.map((m) => ({ value: m.user_id, label: m.name }))

  const handleFinish = async ({ assignee, ...values }: TaskFormValues & { assignee?: string }) => {
    if (await onAdd({ ...toTaskInput(values), assignee_id: assignee ?? null })) form.resetFields()
  }

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>Tasks ({tasks.length})</Typography.Title>
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginBottom: 16 }}>
        <Form.Item name="title" rules={titleRules} style={{ marginBottom: 12 }}>
          <Input placeholder="New group task" aria-label="Group task title" />
        </Form.Item>
        <Form.Item name="description" rules={descriptionRules} style={{ marginBottom: 12 }}>
          <Input.TextArea rows={2} placeholder="Description (optional)" aria-label="Group task description" />
        </Form.Item>
        <Flex gap={8} wrap>
          <Form.Item name="due_date" style={{ marginBottom: 0 }}>
            <DatePicker format="YYYY-MM-DD" placeholder="Due date (optional)" aria-label="Group task due date" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="assignee" style={{ marginBottom: 0 }}>
            <Select allowClear placeholder="Assign to" options={assigneeOptions} style={{ width: 160 }} aria-label="Assignee" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            Add
          </Button>
        </Flex>
      </Form>
      {tasks.length === 0 && <Empty description="No tasks yet" />}
      {tasks.map((task) => (
        <Flex key={task.id} justify="space-between" align="center" gap={12} style={{ padding: "6px 0" }}>
          <Checkbox checked={task.is_completed} onChange={() => onToggle(task)} style={{ flex: 1 }}>
            <Space orientation="vertical" size={0}>
              <Space wrap>
                <Typography.Text delete={task.is_completed}>{task.title}</Typography.Text>
                {task.due_date && <Tag color={isOverdue(task) ? "red" : "blue"}>{task.due_date}</Tag>}
              </Space>
              {task.description && <Typography.Text type="secondary">{task.description}</Typography.Text>}
            </Space>
          </Checkbox>
          <Select
            size="small"
            allowClear
            placeholder="Unassigned"
            value={task.assignee_id ?? undefined}
            options={assigneeOptions}
            onChange={(value) => onAssign(task, value ?? null)}
            onClear={() => onAssign(task, null)}
            style={{ width: 150 }}
            aria-label={`Assignee of ${task.title}`}
          />
          <Button size="small" icon={<EditOutlined />} aria-label={`Edit ${task.title}`} onClick={() => setEditing(task)} />
          {(isOwner || task.owner_id === currentUserId) && (
            <Popconfirm title="Delete this task?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(task)}>
              <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${task.title}`} />
            </Popconfirm>
          )}
        </Flex>
      ))}
      {editing && <EditTaskModal key={editing.id} task={editing} onSave={onEdit} onClose={() => setEditing(null)} />}
    </>
  )
}
