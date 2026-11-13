// Dashboard numbers for admins: users, tasks and groups at a glance.
import { Card, Col, Row, Statistic, Typography } from "antd"
import type { AdminStats } from "../types/admin"

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const items = [
    { title: "Users", value: stats.users.total },
    { title: "Admins", value: stats.users.admins },
    { title: "Banned", value: stats.users.banned },
    { title: "New users (7 days)", value: stats.users.new_last_7_days },
    { title: "Tasks", value: stats.tasks.total },
    { title: "Completed", value: stats.tasks.completed },
    { title: "New tasks (7 days)", value: stats.tasks.created_last_7_days },
    { title: "Groups", value: stats.groups.total },
  ]

  return (
    <>
      <Typography.Title level={4}>Overview</Typography.Title>
      <Row gutter={[16, 16]}>
        {items.map((item) => (
          <Col key={item.title} xs={12} sm={6}>
            <Card size="small">
              <Statistic title={item.title} value={item.value} />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}
