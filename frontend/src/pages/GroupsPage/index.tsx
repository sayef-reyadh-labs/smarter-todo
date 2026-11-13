// Groups page at /groups: the groups you belong to, and a form to create a new one.
import { PlusOutlined, TeamOutlined } from "@ant-design/icons"
import { Alert, App as AntApp, Button, Card, Col, Empty, Flex, Form, Input, Row, Skeleton, Tag, Typography } from "antd"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { PageHeader } from "../../components/PageHeader"
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
      <PageHeader title="Groups" subtitle="Share a task list with your team and assign tasks to its members." />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Card title="Create a group" size="small" style={{ marginBottom: 24 }}>
        <Form form={form} layout="inline" onFinish={createGroup} style={{ rowGap: 8 }}>
          <Form.Item
            name="name"
            rules={[
              { required: true, whitespace: true, message: "Name is required" },
              { max: 100, message: "Name must be at most 100 characters" },
            ]}
            style={{ flex: 1, minWidth: 200 }}
          >
            <Input placeholder="New group name" aria-label="Group name" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            Create group
          </Button>
        </Form>
      </Card>

      {loading && <Skeleton active paragraph={{ rows: 3 }} />}
      {!loading && groups.length === 0 && <Empty description="You are not in any group yet. Create one above." />}
      <Row gutter={[16, 16]}>
        {groups.map((group) => (
          <Col key={group.id} xs={24} sm={12}>
            <Card
              hoverable
              size="small"
              onClick={() => navigate(`/groups/${group.id}`)}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/groups/${group.id}`)}
              tabIndex={0}
              role="link"
              aria-label={`Open group ${group.name}`}
            >
              <Flex justify="space-between" align="center" gap={12}>
                <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                  <TeamOutlined style={{ fontSize: 20 }} />
                  <Typography.Text strong ellipsis>
                    {group.name}
                  </Typography.Text>
                </Flex>
                <Tag color={group.my_role === "owner" ? "gold" : undefined}>{group.my_role}</Tag>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}
