// Table of tasks from every user: filters, export, and select several to delete.
import { DeleteOutlined } from "@ant-design/icons"
import { Button, Flex, Popconfirm, Select, Table, Tag, Typography, type TableColumnsType } from "antd"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import type { AdminTask, Page, TaskFilters } from "../types/admin"
import { GroupPicker, UserPicker } from "./AdminPickers"
import { ExportButton } from "./ExportButton"
import { SearchInput } from "./SearchInput"

type Props = {
  tasks: Page<AdminTask> | null
  loading: boolean
  page: number
  pageSize: number
  filters: TaskFilters
  onFilterChange: (patch: Partial<TaskFilters>) => void
  onPageChange: (page: number) => void
  onDelete: (task: AdminTask) => void
  onBulkDelete: (ids: string[]) => void
  onExport: () => Promise<void>
}

const isOverdue = (task: AdminTask) => !task.is_completed && task.due_date !== null && dayjs(task.due_date).isBefore(dayjs(), "day")

export function AdminTasksTable({ tasks, loading, page, pageSize, filters, onFilterChange, onPageChange, onDelete, onBulkDelete, onExport }: Props) {
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => setSelected([]), [tasks])

  const columns: TableColumnsType<AdminTask> = [
    { title: "Title", dataIndex: "title" },
    { title: "Owner", dataIndex: "owner_email" },
    { title: "Group", dataIndex: "group_name", render: (name: string | null) => (name ? <Tag color="purple">{name}</Tag> : <Tag>personal</Tag>) },
    {
      title: "Due",
      dataIndex: "due_date",
      render: (due: string | null, task) => (due ? <Tag color={isOverdue(task) ? "red" : undefined}>{due}</Tag> : "-"),
    },
    {
      title: "Status",
      dataIndex: "is_completed",
      render: (done: boolean) => (done ? <Tag color="green">done</Tag> : <Tag>open</Tag>),
    },
    {
      title: "Action",
      render: (_, task) => (
        <Popconfirm title="Delete this task?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(task)}>
          <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${task.title}`} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Flex wrap gap={8} justify="space-between" style={{ marginBottom: 12 }}>
        <Flex wrap gap={8}>
          <SearchInput placeholder="Search title" initial={filters.q} onSearch={(q) => onFilterChange({ q })} />
          <UserPicker value={filters.owner_id} onChange={(owner_id) => onFilterChange({ owner_id })} placeholder="Any owner" />
          <GroupPicker value={filters.group_id} onChange={(group_id) => onFilterChange({ group_id })} placeholder="Any group" />
          <Select
            allowClear
            placeholder="Personal or group"
            value={filters.scope}
            onChange={(scope) => onFilterChange({ scope })}
            options={[
              { value: "personal", label: "personal" },
              { value: "group", label: "group" },
            ]}
            style={{ width: 160 }}
            aria-label="Filter tasks by scope"
          />
          <Select
            allowClear
            placeholder="Any status"
            value={filters.status}
            onChange={(status) => onFilterChange({ status })}
            options={[
              { value: "open", label: "open" },
              { value: "done", label: "done" },
              { value: "overdue", label: "overdue" },
            ]}
            style={{ width: 140 }}
            aria-label="Filter tasks by status"
          />
        </Flex>
        <ExportButton onExport={onExport} />
      </Flex>
      {selected.length > 0 && (
        <Flex gap={8} align="center" style={{ marginBottom: 12 }}>
          <Typography.Text>{selected.length} selected</Typography.Text>
          <Popconfirm title={`Delete ${selected.length} task(s)?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onBulkDelete(selected)}>
            <Button danger size="small" icon={<DeleteOutlined />}>
              Delete selected
            </Button>
          </Popconfirm>
        </Flex>
      )}
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={tasks?.items ?? []}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as string[]) }}
        scroll={{ x: true }}
        pagination={{ current: page, pageSize, total: tasks?.total ?? 0, onChange: onPageChange, showSizeChanger: false }}
      />
    </>
  )
}
