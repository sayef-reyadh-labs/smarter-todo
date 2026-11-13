// Shows tasks as cards with complete, view and delete actions; every change goes up through callbacks.
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons"
import { Button, Card, Checkbox, Empty, Flex, Popconfirm, Skeleton, Space, Tag, Typography } from "antd"
import dayjs from "dayjs"
import type { Category, Task } from "../types/task"

type Props = {
  tasks: Task[]
  categories: Category[]
  loading: boolean
  hasMore: boolean
  filtered: boolean
  onToggle: (task: Task) => void
  onDelete: (id: string) => void
  onView: (id: string) => void
  onLoadMore: () => void
}

const isOverdue = (task: Task) =>
  !task.is_completed && task.due_date !== null && dayjs(task.due_date).isBefore(dayjs(), "day")

export function TaskList({ tasks, categories, loading, hasMore, filtered, onToggle, onDelete, onView, onLoadMore }: Props) {
  const categoryName = (task: Task) => categories.find((c) => c.id === task.category_id)?.name
  if (loading && tasks.length === 0) return <Skeleton active paragraph={{ rows: 4 }} />

  if (tasks.length === 0) {
    return (
      <Empty
        style={{ padding: "32px 0" }}
        description={filtered ? "No tasks match this filter." : "No tasks yet. Add your first one above."}
      />
    )
  }

  return (
    <Flex vertical gap={8}>
      {tasks.map((task) => (
        <Card key={task.id} size="small" styles={{ body: { padding: "12px 16px" } }}>
          <Flex align="flex-start" gap={12}>
            <Checkbox
              checked={task.is_completed}
              onChange={() => onToggle(task)}
              aria-label={`${task.is_completed ? "Reopen" : "Complete"} ${task.title}`}
              style={{ marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Space wrap size={8}>
                <Typography.Text strong delete={task.is_completed} type={task.is_completed ? "secondary" : undefined}>
                  {task.title}
                </Typography.Text>
                {task.due_date && <Tag color={isOverdue(task) ? "red" : "blue"}>{isOverdue(task) ? `Overdue · ${task.due_date}` : task.due_date}</Tag>}
                {categoryName(task) && <Tag color="purple">{categoryName(task)}</Tag>}
              </Space>
              {task.description && (
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: "4px 0 0" }}>
                  {task.description}
                </Typography.Paragraph>
              )}
            </div>
            <Space size={4}>
              <Button type="text" icon={<EyeOutlined />} aria-label={`View ${task.title}`} onClick={() => onView(task.id)} />
              <Popconfirm title="Delete this task?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(task.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Delete ${task.title}`} />
              </Popconfirm>
            </Space>
          </Flex>
        </Card>
      ))}
      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Button onClick={onLoadMore}>Load more</Button>
        </div>
      )}
    </Flex>
  )
}
