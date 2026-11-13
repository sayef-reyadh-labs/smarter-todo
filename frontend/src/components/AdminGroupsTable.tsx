// Table of every group with its owner and counts, searchable by name; an admin can delete a group.
import { DeleteOutlined } from "@ant-design/icons"
import { Button, Flex, Popconfirm, Table, type TableColumnsType } from "antd"
import dayjs from "dayjs"
import type { AdminGroup, GroupFilters, Page } from "../types/admin"
import { UserPicker } from "./AdminPickers"
import { SearchInput } from "./SearchInput"

type Props = {
  groups: Page<AdminGroup> | null
  loading: boolean
  page: number
  pageSize: number
  filters: GroupFilters
  onFilterChange: (patch: Partial<GroupFilters>) => void
  onPageChange: (page: number) => void
  onDelete: (group: AdminGroup) => void
}

export function AdminGroupsTable({ groups, loading, page, pageSize, filters, onFilterChange, onPageChange, onDelete }: Props) {
  const columns: TableColumnsType<AdminGroup> = [
    { title: "Group", dataIndex: "name" },
    { title: "Owner", dataIndex: "owner_email" },
    { title: "Members", dataIndex: "member_count" },
    { title: "Tasks", dataIndex: "task_count" },
    { title: "Created", dataIndex: "created_at", render: (at: string) => dayjs(at).format("YYYY-MM-DD") },
    {
      title: "Action",
      render: (_, group) => (
        <Popconfirm
          title={`Delete "${group.name}" with its ${group.task_count} task(s) and ${group.member_count} membership(s)?`}
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(group)}
        >
          <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete group ${group.name}`} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Flex wrap gap={8} style={{ marginBottom: 12 }}>
        <SearchInput placeholder="Search group name" initial={filters.q} onSearch={(q) => onFilterChange({ q })} />
        <UserPicker value={filters.owner_id} onChange={(owner_id) => onFilterChange({ owner_id })} placeholder="Any owner" />
      </Flex>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={groups?.items ?? []}
        scroll={{ x: true }}
        pagination={{ current: page, pageSize, total: groups?.total ?? 0, onChange: onPageChange, showSizeChanger: false }}
      />
    </>
  )
}
