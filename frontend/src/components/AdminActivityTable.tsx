// Table of what users did (logins, task and group actions), newest first, with an action filter.
import { Select, Table, Tag, Tooltip, Typography, type TableColumnsType } from "antd"
import dayjs from "dayjs"
import { ACTIVITY_ACTIONS, type AdminActivity, type Page } from "../types/admin"

type Props = {
  activity: Page<AdminActivity>
  page: number
  pageSize: number
  action: string | undefined
  onPageChange: (page: number) => void
  onActionChange: (action: string | undefined) => void
}

const colorOf = (action: string) => {
  if (action === "login_failed" || action === "login_locked" || action === "login_blocked" || action === "password_change_failed") return "red"
  if (action.startsWith("login") || action === "logout" || action === "signup") return "blue"
  if (action.startsWith("user_") || action === "role_changed" || action.startsWith("admin_")) return "gold"
  return "default"
}

const labelOf = (action: string) => action.replaceAll("_", " ")

const actionOptions = ACTIVITY_ACTIONS.map((a) => ({ value: a, label: labelOf(a) }))

export function AdminActivityTable({ activity, page, pageSize, action, onPageChange, onActionChange }: Props) {
  const columns: TableColumnsType<AdminActivity> = [
    { title: "Time", dataIndex: "created_at", render: (at: string) => dayjs(at).format("YYYY-MM-DD HH:mm:ss"), width: 170 },
    { title: "User", dataIndex: "email", render: (email: string | null) => email ?? "-" },
    { title: "Action", dataIndex: "action", render: (a: string) => <Tag color={colorOf(a)}>{labelOf(a)}</Tag> },
    { title: "Details", dataIndex: "detail", render: (detail: string | null) => detail ?? "-" },
    { title: "IP", dataIndex: "ip_address", render: (ip: string | null) => ip ?? "-" },
    {
      title: "Browser",
      dataIndex: "user_agent",
      render: (agent: string | null) =>
        agent ? (
          <Tooltip title={agent}>
            <Typography.Text style={{ maxWidth: 160 }} ellipsis>
              {agent}
            </Typography.Text>
          </Tooltip>
        ) : (
          "-"
        ),
    },
  ]

  return (
    <>
      <Select
        allowClear
        showSearch
        placeholder="Filter by action"
        value={action}
        options={actionOptions}
        onChange={(value) => onActionChange(value)}
        style={{ width: 240, marginBottom: 12 }}
        aria-label="Filter activity by action"
      />
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={activity.items}
        scroll={{ x: true }}
        pagination={{ current: page, pageSize, total: activity.total, onChange: onPageChange, showSizeChanger: false }}
      />
    </>
  )
}
