// Tasks of a group with an assignee for each; every change goes up through callbacks.
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Checkbox, Empty, Flex, Form, Input, Popconfirm, Select, Typography } from "antd"
import { titleRules } from "../utils/taskForm"
import type { GroupTask, Member } from "../types/group"

type Props = {
  tasks: GroupTask[]
  members: Member[]
  currentUserId: string
  isOwner: boolean
  onAdd: (title: string, assigneeId: string | null) => Promise<boolean>
  onToggle: (task: GroupTask) => void
  onAssign: (task: GroupTask, assigneeId: string | null) => void
  onDelete: (task: GroupTask) => void
}

export function GroupTasks({ tasks, members, currentUserId, isOwner, onAdd, onToggle, onAssign, onDelete }: Props) {
  const [form] = Form.useForm<{ title: string; assignee?: string }>()
  const assigneeOptions = members.map((m) => ({ value: m.user_id, label: m.name }))

  const handleFinish = async ({ title, assignee }: { title: string; assignee?: string }) => {
    if (await onAdd(title.trim(), assignee ?? null)) form.resetFields()
  }

  return (
    <>
      <Typography.Title level={4}>Tasks ({tasks.length})</Typography.Title>
      <Form form={form} layout="inline" onFinish={handleFinish} style={{ marginBottom: 16, rowGap: 8 }}>
        <Form.Item name="title" rules={titleRules} style={{ flex: 1, minWidth: 200 }}>
          <Input placeholder="New group task" aria-label="Group task title" />
        </Form.Item>
        <Form.Item name="assignee">
          <Select allowClear placeholder="Assign to" options={assigneeOptions} style={{ width: 160 }} aria-label="Assignee" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
          Add
        </Button>
      </Form>
      {tasks.length === 0 && <Empty description="No tasks yet" />}
      {tasks.map((task) => (
        <Flex key={task.id} justify="space-between" align="center" gap={12} style={{ padding: "6px 0" }}>
          <Checkbox checked={task.is_completed} onChange={() => onToggle(task)} style={{ flex: 1 }}>
            <Typography.Text delete={task.is_completed}>{task.title}</Typography.Text>
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
          {(isOwner || task.owner_id === currentUserId) && (
            <Popconfirm title="Delete this task?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(task)}>
              <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${task.title}`} />
            </Popconfirm>
          )}
        </Flex>
      ))}
    </>
  )
}
