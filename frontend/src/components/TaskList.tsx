import { DeleteOutlined, EyeOutlined } from "@ant-design/icons"
import { Button, Checkbox, Empty, List, Popconfirm, Space, Tag, Typography } from "antd"
import dayjs from "dayjs"
import type { Task } from "../types/task"

type Props = {
  tasks: Task[]
  loading: boolean
  hasMore: boolean
  onToggle: (task: Task) => void
  onDelete: (id: number) => void
  onView: (id: number) => void
  onLoadMore: () => void
}

const isOverdue = (task: Task) =>
  !task.is_completed && task.due_date !== null && dayjs(task.due_date).isBefore(dayjs(), "day")

export function TaskList({ tasks, loading, hasMore, onToggle, onDelete, onView, onLoadMore }: Props) {
  return (
    <List
      loading={loading}
      dataSource={tasks}
      locale={{ emptyText: <Empty description="No tasks yet — add one above." /> }}
      loadMore={
        hasMore && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Button onClick={onLoadMore}>Load more</Button>
          </div>
        )
      }
      renderItem={(task) => (
        <List.Item
          actions={[
            <Button key="view" type="text" icon={<EyeOutlined />} aria-label="View task" onClick={() => onView(task.id)} />,
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
                {task.due_date && <Tag color={isOverdue(task) ? "red" : "blue"}>{task.due_date}</Tag>}
              </Space>
            }
            description={task.description}
          />
        </List.Item>
      )}
    />
  )
}
