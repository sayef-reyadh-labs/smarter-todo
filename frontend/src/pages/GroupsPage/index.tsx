// Groups page at /groups: the groups you belong to, and a form to create a new one.
import { Alert, App as AntApp, Button, Card, Empty, Flex, Form, Input, Spin, Tag, Typography } from "antd"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { apiService } from "../../services/api"
import type { Group } from "../../types/group"

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function GroupsPage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<{ name: string }>()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadOnOpen = async () => {
      try {
        setGroups(await apiService.getGroups())
      } catch (err) {
        setError(messageOf(err))
      } finally {
        setLoading(false)
      }
    }
    loadOnOpen()
  }, [])

  const createGroup = async ({ name }: { name: string }) => {
    try {
      const group = await apiService.createGroup(name.trim())
      form.resetFields()
      navigate(`/groups/${group.id}`)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  return (
    <>
      <Typography.Title level={2}>Groups</Typography.Title>
      <Typography.Paragraph type="secondary">Share a task list with your team and assign tasks to its members.</Typography.Paragraph>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Form form={form} layout="inline" onFinish={createGroup} style={{ marginBottom: 24 }}>
        <Form.Item
          name="name"
          rules={[
            { required: true, whitespace: true, message: "Name is required" },
            { max: 100, message: "Name must be at most 100 characters" },
          ]}
          style={{ flex: 1 }}
        >
          <Input placeholder="New group name" aria-label="Group name" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Create group
        </Button>
      </Form>

      {loading && <Spin style={{ display: "block", margin: "32px auto" }} />}
      {!loading && groups.length === 0 && <Empty description="You are not in any group yet" />}
      <Flex vertical gap={12}>
        {groups.map((group) => (
          <Card key={group.id} size="small">
            <Flex justify="space-between" align="center">
              <Link to={`/groups/${group.id}`}>{group.name}</Link>
              <Tag color={group.my_role === "owner" ? "gold" : undefined}>{group.my_role}</Tag>
            </Flex>
          </Card>
        ))}
      </Flex>
    </>
  )
}
