// Table of all users with role change, ban and unban; every change goes up through callbacks.
import { Button, Select, Space, Table, Tag, Tooltip, type TableColumnsType } from "antd"
import type { AdminUser, Page } from "../types/admin"

type Props = {
  users: Page<AdminUser>
  currentUserId: string
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onRoleChange: (user: AdminUser, role: "user" | "admin") => void
  onBan: (user: AdminUser) => void
  onUnban: (user: AdminUser) => void
}

export function AdminUsersTable({ users, currentUserId, page, pageSize, onPageChange, onRoleChange, onBan, onUnban }: Props) {
  const columns: TableColumnsType<AdminUser> = [
    { title: "Name", dataIndex: "name" },
    { title: "Email", dataIndex: "email" },
    {
      title: "Role",
      dataIndex: "role",
      render: (role: string, user) => (
        <Select
          size="small"
          value={role}
          disabled={user.id === currentUserId}
          style={{ minWidth: 110 }}
          onChange={(value) => onRoleChange(user, value as "user" | "admin")}
          options={[
            { value: "user", label: "user" },
            { value: "admin", label: "admin" },
          ]}
          aria-label={`Role of ${user.email}`}
        />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (_, user) =>
        user.is_banned ? (
          <Tooltip title={user.ban_reason ?? "No reason given"}>
            <Tag color="red">banned</Tag>
          </Tooltip>
        ) : (
          <Tag color="green">active</Tag>
        ),
    },
    {
      title: "Action",
      render: (_, user) => (
        <Space>
          {user.is_banned ? (
            <Button size="small" onClick={() => onUnban(user)}>
              Unban
            </Button>
          ) : (
            <Button size="small" danger disabled={user.id === currentUserId || user.role === "admin"} onClick={() => onBan(user)}>
              Ban
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Table
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={users.items}
      scroll={{ x: true }}
      pagination={{ current: page, pageSize, total: users.total, onChange: onPageChange, showSizeChanger: false }}
    />
  )
}
