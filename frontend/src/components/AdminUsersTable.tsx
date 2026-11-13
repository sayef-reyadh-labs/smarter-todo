// Table of all users: filters, export, and select several to ban or unban; click a name to open the user drawer.
import { Button, Flex, Popconfirm, Select, Table, Tag, Tooltip, Typography, type TableColumnsType } from "antd"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useEffect, useState } from "react"
import type { AdminUser, Page, UserFilters } from "../types/admin"
import { ExportButton } from "./ExportButton"
import { SearchInput } from "./SearchInput"

dayjs.extend(relativeTime)

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
  onOpen: (user: AdminUser) => void
  onBulkBan: (users: AdminUser[]) => void
  onBulkUnban: (ids: string[]) => void
  onExport: () => Promise<void>
}

export function AdminUsersTable({
  users,
  loading,
  currentUserId,
  page,
  pageSize,
  filters,
  onFilterChange,
  onPageChange,
  onRoleChange,
  onOpen,
  onBulkBan,
  onBulkUnban,
  onExport,
}: Props) {
  const [selected, setSelected] = useState<string[]>([])

  // A new page or filter shows other rows, so the old selection is dropped.
  useEffect(() => setSelected([]), [users])

  const chosen = (users?.items ?? []).filter((u) => selected.includes(u.id))

  const columns: TableColumnsType<AdminUser> = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name: string, user) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => onOpen(user)} aria-label={`Open ${user.email}`}>
          {name}
        </Button>
      ),
    },
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
      title: "Last login",
      dataIndex: "last_login_at",
      render: (at: string | null) => (at ? <Tooltip title={dayjs(at).format("YYYY-MM-DD HH:mm:ss")}>{dayjs(at).fromNow()}</Tooltip> : <Typography.Text type="secondary">never</Typography.Text>),
    },
    {
      title: "Failed logins (7d)",
      dataIndex: "failed_logins_7d",
      render: (n: number) => (n > 0 ? <Tag color={n >= 3 ? "red" : "orange"}>{n}</Tag> : 0),
    },
  ]

  return (
    <>
      <Flex wrap gap={8} justify="space-between" style={{ marginBottom: 12 }}>
        <Flex wrap gap={8}>
          <SearchInput placeholder="Search name or email" initial={filters.q} onSearch={(q) => onFilterChange({ q })} />
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
        <ExportButton onExport={onExport} />
      </Flex>
      {selected.length > 0 && (
        <Flex gap={8} align="center" style={{ marginBottom: 12 }}>
          <Typography.Text>{selected.length} selected</Typography.Text>
          <Button danger size="small" onClick={() => onBulkBan(chosen)}>
            Ban selected
          </Button>
          <Popconfirm title={`Unban ${selected.length} user(s)?`} okText="Unban" onConfirm={() => onBulkUnban(selected)}>
            <Button size="small">Unban selected</Button>
          </Popconfirm>
        </Flex>
      )}
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={users?.items ?? []}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as string[]), getCheckboxProps: (user) => ({ disabled: user.id === currentUserId }) }}
        scroll={{ x: true }}
        pagination={{ current: page, pageSize, total: users?.total ?? 0, onChange: onPageChange, showSizeChanger: false }}
      />
    </>
  )
}
