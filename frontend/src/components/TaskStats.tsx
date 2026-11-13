// Progress, done and remaining counts, plus the clear-completed button.
import { Button, Flex, Popconfirm, Progress, Typography } from "antd"
import type { Task } from "../types/task"

type Props = {
  tasks: Task[]
  onClearCompleted: () => void
}

export function TaskStats({ tasks, onClearCompleted }: Props) {
  // Derived during render, so no extra state is needed.
  const doneCount = tasks.filter((t) => t.is_completed).length
  const remainingCount = tasks.length - doneCount
  const percent = Math.round((doneCount / tasks.length) * 100)

  return (
    <div style={{ marginBottom: 16 }}>
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Typography.Text type="secondary">
          {remainingCount} remaining · {doneCount} completed
        </Typography.Text>
        {doneCount > 0 && (
          <Popconfirm title={`Delete ${doneCount} completed task(s)?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={onClearCompleted}>
            <Button danger size="small">
              Clear completed ({doneCount})
            </Button>
          </Popconfirm>
        )}
      </Flex>
      <Progress percent={percent} size="small" showInfo={false} aria-label="Completed tasks" />
    </div>
  )
}
