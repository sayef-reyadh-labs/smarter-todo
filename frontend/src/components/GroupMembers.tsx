// Members of a group: the owner adds them by email and removes them; everyone else only sees the list.
import { UserDeleteOutlined } from "@ant-design/icons"
import { Button, Flex, Form, Input, Popconfirm, Tag, Typography } from "antd"
import { emailRules } from "../utils/authForm"
import type { Member } from "../types/group"

type Props = {
  members: Member[]
  isOwner: boolean
  onAdd: (email: string) => Promise<boolean>
  onRemove: (member: Member) => void
}

export function GroupMembers({ members, isOwner, onAdd, onRemove }: Props) {
  const [form] = Form.useForm<{ email: string }>()

  const handleFinish = async ({ email }: { email: string }) => {
    if (await onAdd(email.trim())) form.resetFields()
  }

  return (
    <>
      <Typography.Title level={4}>Members ({members.length})</Typography.Title>
      {isOwner && (
        <Form form={form} layout="inline" onFinish={handleFinish} style={{ marginBottom: 16 }}>
          <Form.Item name="email" rules={emailRules} style={{ flex: 1 }}>
            <Input placeholder="Add a member by email" aria-label="Member email" />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Add
          </Button>
        </Form>
      )}
      {members.map((member) => (
        <Flex key={member.user_id} justify="space-between" align="center" style={{ padding: "6px 0" }}>
          <span>
            {member.name} <Typography.Text type="secondary">{member.email}</Typography.Text>
          </span>
          <Flex gap={8} align="center">
            <Tag color={member.role === "owner" ? "gold" : undefined}>{member.role}</Tag>
            {isOwner && member.role !== "owner" && (
              <Popconfirm title={`Remove ${member.name}?`} okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => onRemove(member)}>
                <Button size="small" danger icon={<UserDeleteOutlined />} aria-label={`Remove ${member.name}`} />
              </Popconfirm>
            )}
          </Flex>
        </Flex>
      ))}
    </>
  )
}
