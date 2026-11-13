// Table of what users did (logins, task and group actions), newest first, with user, action, text and date filters.
import { DatePicker, Flex, Select, Table, Tag, Tooltip, Typography, type TableColumnsType } from "antd"
import dayjs from "dayjs"
import { ACTIVITY_ACTIONS, type ActivityFilters, type AdminActivity, type Page } from "../types/admin"
import { UserPicker } from "./AdminPickers"
import { SearchInput } from "./SearchInput"

type Props = {
  activity: Page<AdminActivity> | null
  loading: boolean
  page: number
  pageSize: number
  filters: ActivityFilters
  onFilterChange: (patch: Partial<ActivityFilters>) => void
  onPageChange: (page: number) => void
}

const colorOf = (action: string) => {
  if (action === "login_failed" || action === "login_locked" || action === "login_blocked" || action === "password_change_failed") return "red"
  if (action.startsWith("login") || action === "logout" || action === "signup") return "blue"
  if (action.startsWith("user_") || action === "role_changed" || action.startsWith("admin_")) return "gold"
  return "default"
}

const labelOf = (action: string) => action.replaceAll("_", " ")

const actionOptions = ACTIVITY_ACTIONS.map((a) => ({ value: a, label: labelOf(a) }))

export function AdminActivityTable({ activity, loading, page, pageSize, filters, onFilterChange, onPageChange }: Props) {
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
      <Flex wrap gap={8} style={{ marginBottom: 12 }}>
        <SearchInput placeholder="Search user or detail" onSearch={(q) => onFilterChange({ q })} />
        <UserPicker value={filters.user_id} onChange={(user_id) => onFilterChange({ user_id })} placeholder="Any user" />
        <Select
          allowClear
          showSearch
          placeholder="Any action"
          value={filters.action}
          options={actionOptions}
          onChange={(action) => onFilterChange({ action })}
          style={{ width: 200 }}
          aria-label="Filter activity by action"
        />
        <DatePicker.RangePicker
          allowEmpty={[true, true]}
          placeholder={["From (UTC)", "To (UTC)"]}
          onChange={(range) =>
            onFilterChange({
              date_from: range?.[0]?.format("YYYY-MM-DD"),
              date_to: range?.[1]?.format("YYYY-MM-DD"),
            })
          }
        />
      </Flex>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={activity?.items ?? []}
        scroll={{ x: true }}
        pagination={{ current: page, pageSize, total: activity?.total ?? 0, onChange: onPageChange, showSizeChanger: false }}
      />
    </>
  )
}
