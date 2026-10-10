import { DeleteOutlined, EditOutlined } from "@ant-design/icons"
import { Button, Checkbox, List, Popconfirm, Space, Tag, Typography } from "antd"
import dayjs from "dayjs"
import type { Task } from "../api"

type Props = {
  task: Task
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: number) => void
}

const TaskItem = ({ task, onToggle, onEdit, onDelete }: Props) => {
  const overdue = !task.is_completed && task.due_date !== null && dayjs(task.due_date).isBefore(dayjs(), "day")

  return (
    <List.Item
      actions={[
        <Button key="edit" type="text" icon={<EditOutlined />} aria-label="Edit task" onClick={() => onEdit(task)} />,
        <Popconfirm
          key="delete"
          title="Delete this task?"
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(task.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete task" />
        </Popconfirm>,
      ]}
    >
      <List.Item.Meta
        avatar={<Checkbox checked={task.is_completed} onChange={() => onToggle(task)} />}
        title={
          <Space wrap>
            <Typography.Text delete={task.is_completed} type={task.is_completed ? "secondary" : undefined}>
              {task.title}
            </Typography.Text>
            {task.due_date && <Tag color={overdue ? "red" : "blue"}>{task.due_date}</Tag>}
          </Space>
        }
        description={task.description}
      />
    </List.Item>
  )
}

export default TaskItem
