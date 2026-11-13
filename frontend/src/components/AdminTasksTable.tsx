// Table of every task from every user, so an admin can remove an unwanted one.
import { DeleteOutlined } from "@ant-design/icons"
import { Button, Popconfirm, Table, Tag, type TableColumnsType } from "antd"
import type { AdminTask, Page } from "../types/admin"

type Props = {
  tasks: Page<AdminTask>
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onDelete: (task: AdminTask) => void
}

export function AdminTasksTable({ tasks, page, pageSize, onPageChange, onDelete }: Props) {
  const columns: TableColumnsType<AdminTask> = [
    { title: "Title", dataIndex: "title" },
    { title: "Due", dataIndex: "due_date", render: (due: string | null) => due ?? "-" },
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
    <Table
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={tasks.items}
      scroll={{ x: true }}
      pagination={{ current: page, pageSize, total: tasks.total, onChange: onPageChange, showSizeChanger: false }}
    />
  )
}
