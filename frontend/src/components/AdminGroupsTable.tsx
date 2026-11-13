// Read-only table of every group with its owner and counts, searchable by name.
import { Flex, Table, type TableColumnsType } from "antd"
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
}

export function AdminGroupsTable({ groups, loading, page, pageSize, filters, onFilterChange, onPageChange }: Props) {
  const columns: TableColumnsType<AdminGroup> = [
    { title: "Group", dataIndex: "name" },
    { title: "Owner", dataIndex: "owner_email" },
    { title: "Members", dataIndex: "member_count" },
    { title: "Tasks", dataIndex: "task_count" },
    { title: "Created", dataIndex: "created_at", render: (at: string) => dayjs(at).format("YYYY-MM-DD") },
  ]

  return (
    <>
      <Flex wrap gap={8} style={{ marginBottom: 12 }}>
        <SearchInput placeholder="Search group name" onSearch={(q) => onFilterChange({ q })} />
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
