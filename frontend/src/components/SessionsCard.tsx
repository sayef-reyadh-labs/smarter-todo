// Your login sessions: where you are logged in, with a button to end one, the others, or all of them.
import { DesktopOutlined, LogoutOutlined, MobileOutlined } from "@ant-design/icons"
import { Alert, App as AntApp, Button, Card, Empty, Flex, Popconfirm, Skeleton, Tag, Typography } from "antd"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "../context/AuthContext"
import { apiService } from "../services/api"
import type { Session } from "../types/auth"
import { describeDevice } from "../utils/device"

dayjs.extend(relativeTime)

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function SessionsCard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      setSessions(await apiService.getSessions())
      setError("")
    } catch (err) {
      setError(messageOf(err))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      await load()
      message.success(success)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  // Ends every session including this one, so the app goes back to the login screen.
  const logOutEverywhere = async () => {
    try {
      await apiService.revokeAllSessions()
      await logout()
      message.success("Logged out everywhere")
      navigate("/login", { replace: true })
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  const others = (sessions ?? []).filter((s) => !s.current).length

  return (
    <Card
      title="Where you are logged in"
      extra={
        <Flex gap={8} wrap>
          <Popconfirm title="Log out of all other devices?" okText="Log out" okButtonProps={{ danger: true }} onConfirm={() => run(apiService.revokeOtherSessions, "Other devices logged out")}>
            <Button size="small" disabled={others === 0}>
              Log out other devices
            </Button>
          </Popconfirm>
          <Popconfirm title="Log out of every device, including this one?" okText="Log out everywhere" okButtonProps={{ danger: true }} onConfirm={logOutEverywhere}>
            <Button size="small" danger icon={<LogoutOutlined />}>
              Log out everywhere
            </Button>
          </Popconfirm>
        </Flex>
      }
    >
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      {sessions === null && !error && <Skeleton active paragraph={{ rows: 2 }} />}
      {sessions?.length === 0 && <Empty description="No active sessions" />}
      <Flex vertical gap={12}>
        {sessions?.map((session) => {
          const device = describeDevice(session.user_agent)
          const phone = /Android|iOS/.test(device)
          return (
            <Flex key={session.id} justify="space-between" align="center" gap={12} wrap>
              <Flex gap={12} align="center" style={{ minWidth: 0 }}>
                <span style={{ fontSize: 22 }}>{phone ? <MobileOutlined /> : <DesktopOutlined />}</span>
                <div style={{ minWidth: 0 }}>
                  <Typography.Text strong>
                    {device} {session.current && <Tag color="green">this device</Tag>}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    {session.ip_address ?? "unknown address"} · signed in {dayjs(session.started_at).fromNow()} · active {dayjs(session.last_used_at).fromNow()}
                  </Typography.Text>
                </div>
              </Flex>
              {!session.current && (
                <Popconfirm title="Log this device out?" okText="Log out" okButtonProps={{ danger: true }} onConfirm={() => run(() => apiService.revokeSession(session.id), "Device logged out")}>
                  <Button size="small" danger aria-label={`Log out ${device}`}>
                    Log out
                  </Button>
                </Popconfirm>
              )}
            </Flex>
          )
        })}
      </Flex>
      <Typography.Paragraph type="secondary" style={{ margin: "16px 0 0" }}>
        A device you log out stays signed in for up to 15 minutes, until its short-lived access token expires; it cannot renew it.
      </Typography.Paragraph>
    </Card>
  )
}
