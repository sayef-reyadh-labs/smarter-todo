// Members of a group: the owner adds and removes them and decides what each may do with tasks; everyone else only sees the list.
import { UserDeleteOutlined } from "@ant-design/icons"
import { Button, Checkbox, Flex, Form, Input, Popconfirm, Space, Tag, Typography } from "antd"
import { emailRules } from "../utils/authForm"
import { GROUP_PERMISSIONS, type GroupPermission, type Member } from "../types/group"

type Props = {
  members: Member[]
  isOwner: boolean
  onAdd: (email: string) => Promise<boolean>
  onRemove: (member: Member) => void
  onPermissions: (member: Member, permissions: GroupPermission[]) => void
}

const shortLabel = (permission: GroupPermission) => GROUP_PERMISSIONS.find((p) => p.value === permission)?.label ?? permission

export function GroupMembers({ members, isOwner, onAdd, onRemove, onPermissions }: Props) {
  const [form] = Form.useForm<{ email: string }>()

  const handleFinish = async ({ email }: { email: string }) => {
    if (await onAdd(email.trim())) form.resetFields()
  }

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>Members ({members.length})</Typography.Title>
      {isOwner && (
        <>
          <Form form={form} layout="inline" onFinish={handleFinish} style={{ marginBottom: 8 }}>
            <Form.Item name="email" rules={emailRules} style={{ flex: 1 }}>
              <Input placeholder="Add a member by email" aria-label="Member email" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Add
            </Button>
          </Form>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            You decide what each member may do with tasks. Only you can delete tasks, rename the group and manage members.
          </Typography.Paragraph>
        </>
      )}
      {members.map((member) => (
        <div key={member.user_id} style={{ padding: "8px 0" }}>
          <Flex justify="space-between" align="center" wrap gap={8}>
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
          {member.role !== "owner" &&
            (isOwner ? (
              <Checkbox.Group
                style={{ marginTop: 6 }}
                value={member.permissions}
                onChange={(values) => onPermissions(member, values as GroupPermission[])}
                options={GROUP_PERMISSIONS.map((p) => ({ value: p.value, label: p.label }))}
                aria-label={`Permissions of ${member.name}`}
              />
            ) : (
              <Space size={4} wrap style={{ marginTop: 4 }}>
                {member.permissions.length === 0 ? <Tag>read only</Tag> : member.permissions.map((p) => <Tag key={p}>{shortLabel(p)}</Tag>)}
              </Space>
            ))}
        </div>
      ))}
    </>
  )
}
