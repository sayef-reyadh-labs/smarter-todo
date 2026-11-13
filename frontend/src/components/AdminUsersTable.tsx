// Table of all users with search, role and status filters, and role change, ban and unban; every change goes up through callbacks.
import { Button, Flex, Select, Space, Table, Tag, Tooltip, type TableColumnsType } from "antd"
import type { AdminUser, Page, UserFilters } from "../types/admin"
import { SearchInput } from "./SearchInput"

type Props = {
  users: Page<AdminUser> | null
  loading: boolean
  currentUserId: string
  page: number
  pageSize: number
  filters: UserFilters
  onFilterChange: (patch: Partial<UserFilters>) => void
  onPageChange: (page: number) => void
  onRoleChange: (user: AdminUser, role: "user" | "admin") => void
  onBan: (user: AdminUser) => void
  onUnban: (user: AdminUser) => void
}

export function AdminUsersTable({ users, loading, currentUserId, page, pageSize, filters, onFilterChange, onPageChange, onRoleChange, onBan, onUnban }: Props) {
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
    <>
      <Flex wrap gap={8} style={{ marginBottom: 12 }}>
        <SearchInput placeholder="Search name or email" onSearch={(q) => onFilterChange({ q })} />
        <Select
          allowClear
          placeholder="Any role"
          value={filters.role}
          onChange={(role) => onFilterChange({ role })}
          options={[
            { value: "user", label: "user" },
            { value: "admin", label: "admin" },
          ]}
          style={{ width: 130 }}
          aria-label="Filter users by role"
        />
        <Select
          allowClear
          placeholder="Any status"
          value={filters.status}
          onChange={(status) => onFilterChange({ status })}
          options={[
            { value: "active", label: "active" },
            { value: "banned", label: "banned" },
          ]}
          style={{ width: 140 }}
          aria-label="Filter users by status"
        />
      </Flex>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={users?.items ?? []}
        scroll={{ x: true }}
        pagination={{ current: page, pageSize, total: users?.total ?? 0, onChange: onPageChange, showSizeChanger: false }}
      />
    </>
  )
}
