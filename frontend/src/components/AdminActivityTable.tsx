// Table of what users did, newest first, with user, action, text and date filters, a CSV export and a purge of old entries.
import { DeleteOutlined } from "@ant-design/icons"
import { Button, DatePicker, Flex, InputNumber, Modal, Select, Table, Tag, Tooltip, Typography, type TableColumnsType } from "antd"
import dayjs from "dayjs"
import { useState } from "react"
import { ACTIVITY_ACTIONS, HOSTILE_ACTIONS, type ActivityFilters, type AdminActivity, type Page } from "../types/admin"
import { UserPicker } from "./AdminPickers"
import { ExportButton } from "./ExportButton"
import { SearchInput } from "./SearchInput"

type Props = {
  activity: Page<AdminActivity> | null
  loading: boolean
  page: number
  pageSize: number
  filters: ActivityFilters
  onFilterChange: (patch: Partial<ActivityFilters>) => void
  onPageChange: (page: number) => void
  onExport: () => Promise<void>
  onPurge: (days: number) => Promise<void>
}

const colorOf = (action: string) => {
  if (HOSTILE_ACTIONS.includes(action)) return "red"
  if (action.startsWith("login") || action === "logout" || action === "signup" || action.startsWith("session")) return "blue"
  if (action.startsWith("user_") || action === "role_changed" || action.startsWith("admin_") || action === "data_exported" || action === "activity_purged") return "gold"
  return "default"
}

const labelOf = (action: string) => action.replaceAll("_", " ")

const actionOptions = ACTIVITY_ACTIONS.map((a) => ({ value: a, label: labelOf(a) }))

export function AdminActivityTable({ activity, loading, page, pageSize, filters, onFilterChange, onPageChange, onExport, onPurge }: Props) {
  const [purging, setPurging] = useState(false)
  const [days, setDays] = useState<number | null>(90)

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

  const range: [dayjs.Dayjs | null, dayjs.Dayjs | null] = [filters.date_from ? dayjs(filters.date_from) : null, filters.date_to ? dayjs(filters.date_to) : null]

  const confirmPurge = async () => {
    if (!days) return
    await onPurge(days)
    setPurging(false)
  }

  return (
    <>
      <Flex wrap gap={8} justify="space-between" style={{ marginBottom: 12 }}>
        <Flex wrap gap={8}>
          <SearchInput placeholder="Search user or detail" initial={filters.q} onSearch={(q) => onFilterChange({ q })} />
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
            value={range}
            placeholder={["From (UTC)", "To (UTC)"]}
            onChange={(value) => onFilterChange({ date_from: value?.[0]?.format("YYYY-MM-DD"), date_to: value?.[1]?.format("YYYY-MM-DD") })}
          />
        </Flex>
        <Flex gap={8}>
          <ExportButton onExport={onExport} />
          <Button danger icon={<DeleteOutlined />} onClick={() => setPurging(true)}>
            Purge old entries
          </Button>
        </Flex>
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
      <Modal open={purging} title="Purge old activity" okText="Delete entries" okButtonProps={{ danger: true, disabled: !days }} onOk={confirmPurge} onCancel={() => setPurging(false)}>
        <Typography.Paragraph>
          Delete every activity entry older than <InputNumber min={1} max={3650} value={days} onChange={setDays} aria-label="Days to keep" /> days. This cannot be undone.
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">Entries are also removed automatically after the retention period set on the server (90 days by default).</Typography.Paragraph>
      </Modal>
    </>
  )
}
