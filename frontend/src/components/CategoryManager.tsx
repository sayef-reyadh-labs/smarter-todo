// Dialog to create, rename and delete your own task categories; every change goes up through callbacks.
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Empty, Flex, Input, Modal, Popconfirm, Typography } from "antd"
import { useState } from "react"
import type { Category } from "../types/task"

type Props = {
  open: boolean
  categories: Category[]
  onClose: () => void
  onCreate: (name: string) => Promise<boolean>
  onRename: (id: string, name: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export function CategoryManager({ open, categories, onClose, onCreate, onRename, onDelete }: Props) {
  const [name, setName] = useState("")

  const create = async () => {
    if (!name.trim()) return
    if (await onCreate(name.trim())) setName("")
  }

  return (
    <Modal open={open} title="Categories" footer={null} onCancel={onClose} destroyOnHidden>
      <Typography.Paragraph type="secondary">Group your tasks. A task with no category is simply "No category".</Typography.Paragraph>
      <Flex gap={8} style={{ marginBottom: 16 }}>
        <Input
          value={name}
          maxLength={50}
          placeholder="New category name"
          aria-label="New category name"
          onChange={(e) => setName(e.target.value)}
          onPressEnter={create}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>
          Add
        </Button>
      </Flex>
      {categories.length === 0 && <Empty description="No categories yet" />}
      <Flex vertical gap={8}>
        {categories.map((category) => (
          <Flex key={category.id} align="center" gap={8}>
            <Typography.Text
              style={{ flex: 1 }}
              editable={{ onChange: (value) => value.trim() && value.trim() !== category.name && onRename(category.id, value.trim()), tooltip: "Rename" }}
            >
              {category.name}
            </Typography.Text>
            <Typography.Text type="secondary">{category.task_count} task(s)</Typography.Text>
            <Popconfirm
              title={`Delete "${category.name}"? Its tasks stay, with no category.`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(category.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete category ${category.name}`} />
            </Popconfirm>
          </Flex>
        ))}
      </Flex>
    </Modal>
  )
}
