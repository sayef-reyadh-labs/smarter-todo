// Summary tiles (open, done, overdue), a progress bar and the clear-completed button.
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from "@ant-design/icons"
import { Button, Card, Col, Flex, Popconfirm, Progress, Row, Statistic, theme } from "antd"
import dayjs from "dayjs"
import type { ReactNode } from "react"
import type { Task } from "../types/task"

type Props = {
  tasks: Task[]
  onClearCompleted: () => void
}

type Tile = { title: string; value: number; icon: ReactNode; color: string }

export function TaskStats({ tasks, onClearCompleted }: Props) {
  const { token } = theme.useToken()

  // Derived during render, so no extra state is needed.
  const doneCount = tasks.filter((t) => t.is_completed).length
  const overdueCount = tasks.filter((t) => !t.is_completed && t.due_date !== null && dayjs(t.due_date).isBefore(dayjs(), "day")).length
  const openCount = tasks.length - doneCount
  const percent = Math.round((doneCount / tasks.length) * 100)

  const tiles: Tile[] = [
    { title: "Open", value: openCount, icon: <ClockCircleOutlined />, color: token.colorPrimary },
    { title: "Done", value: doneCount, icon: <CheckCircleOutlined />, color: token.colorSuccess },
    { title: "Overdue", value: overdueCount, icon: <WarningOutlined />, color: overdueCount > 0 ? token.colorError : token.colorTextTertiary },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <Row gutter={[12, 12]}>
        {tiles.map((tile) => (
          <Col key={tile.title} xs={8}>
            <Card size="small" className="stat-tile" styles={{ body: { padding: "10px 14px" } }}>
              <Statistic title={tile.title} value={tile.value} prefix={tile.icon} styles={{ content: { color: tile.color, fontSize: 22 } }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Flex align="center" gap={12} style={{ marginTop: 12 }}>
        <Progress percent={percent} size="small" status="normal" aria-label="Completed tasks" style={{ flex: 1, margin: 0 }} />
        {doneCount > 0 && (
          <Popconfirm title={`Delete ${doneCount} completed task(s)?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={onClearCompleted}>
            <Button danger size="small">
              Clear completed ({doneCount})
            </Button>
          </Popconfirm>
        )}
      </Flex>
    </div>
  )
}
