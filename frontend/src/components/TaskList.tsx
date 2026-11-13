// Shows tasks as cards with complete, view and delete actions; every change goes up through callbacks.
import { DeleteOutlined, EyeOutlined, InboxOutlined } from "@ant-design/icons"
import { Button, Card, Checkbox, Empty, Flex, Popconfirm, Skeleton, Space, Tag, Typography, theme } from "antd"
import type { Category, Task } from "../types/task"
import { describeDue, type DueTone } from "../utils/dates"

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

const TAG_COLOR: Record<DueTone, string> = { overdue: "red", today: "orange", soon: "gold", later: "blue", done: "default" }

export function TaskList({ tasks, categories, loading, hasMore, filtered, onToggle, onDelete, onView, onLoadMore }: Props) {
  const { token } = theme.useToken()
  const categoryName = (task: Task) => categories.find((c) => c.id === task.category_id)?.name

  const accent: Record<DueTone, string> = {
    overdue: token.colorError,
    today: token.colorWarning,
    soon: token.colorWarning,
    later: token.colorPrimary,
    done: token.colorSuccess,
  }

  if (loading && tasks.length === 0) return <Skeleton active paragraph={{ rows: 4 }} />

  if (tasks.length === 0) {
    return (
      <Empty
        style={{ padding: "40px 0" }}
        image={<InboxOutlined style={{ fontSize: 56, color: token.colorTextQuaternary }} />}
        description={
          filtered ? (
            "No tasks match this filter."
          ) : (
            <Flex vertical gap={2}>
              <Typography.Text strong>Nothing to do yet</Typography.Text>
              <Typography.Text type="secondary">Add your first task above to get started.</Typography.Text>
            </Flex>
          )
        }
      />
    )
  }

  return (
    <Flex vertical gap={10}>
      {tasks.map((task) => {
        const due = task.due_date ? describeDue(task.due_date, task.is_completed) : null
        const tone: DueTone = task.is_completed ? "done" : (due?.tone ?? "later")
        return (
          <Card
            key={task.id}
            size="small"
            className={`task-card${task.is_completed ? " task-card-done" : ""}`}
            style={{ borderLeft: `4px solid ${accent[tone]}` }}
            styles={{ body: { padding: "12px 16px" } }}
          >
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
                  {due && <Tag color={TAG_COLOR[due.tone]}>{due.label}</Tag>}
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
        )
      })}
      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Button onClick={onLoadMore}>Load more</Button>
        </div>
      )}
    </Flex>
  )
}
