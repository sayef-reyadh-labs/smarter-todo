import { Button, Flex, Popconfirm, Typography } from "antd"
import type { Task } from "../types/task"

type Props = {
  tasks: Task[]
  onClearCompleted: () => void
}

export function TaskStats({ tasks, onClearCompleted }: Props) {
  // Derived during render, so no extra state is needed.
  const doneCount = tasks.filter((t) => t.is_completed).length
  const remainingCount = tasks.length - doneCount

  return (
    <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
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
  )
}
