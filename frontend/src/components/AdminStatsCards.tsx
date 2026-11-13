// Dashboard numbers for admins: users, tasks and groups at a glance.
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  PlusSquareOutlined,
  SafetyOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
} from "@ant-design/icons"
import { Card, Col, Row, Statistic } from "antd"
import type { AdminStats } from "../types/admin"

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const items = [
    { title: "Users", value: stats.users.total, icon: <TeamOutlined /> },
    { title: "Admins", value: stats.users.admins, icon: <SafetyOutlined /> },
    { title: "Banned", value: stats.users.banned, icon: <StopOutlined /> },
    { title: "New users (7 days)", value: stats.users.new_last_7_days, icon: <UserAddOutlined /> },
    { title: "Tasks", value: stats.tasks.total, icon: <CheckSquareOutlined /> },
    { title: "Completed", value: stats.tasks.completed, icon: <CheckCircleOutlined /> },
    { title: "New tasks (7 days)", value: stats.tasks.created_last_7_days, icon: <PlusSquareOutlined /> },
    { title: "Groups", value: stats.groups.total, icon: <ApartmentOutlined /> },
  ]

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col key={item.title} xs={12} md={6}>
          <Card size="small">
            <Statistic title={item.title} value={item.value} prefix={item.icon} />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
