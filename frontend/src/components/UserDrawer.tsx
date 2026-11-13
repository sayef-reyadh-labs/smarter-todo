// Side panel with everything about one user: profile, counts, groups, recent tasks, live sessions and recent activity.
import { Alert, Button, Descriptions, Divider, Drawer, Empty, Flex, Popconfirm, Skeleton, Space, Tag, Typography } from "antd"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useEffect, useState } from "react"
import { apiService } from "../services/api"
import type { AdminUser, AdminUserDetail } from "../types/admin"
import { describeDevice } from "../utils/device"

dayjs.extend(relativeTime)

type Props = {
  userId: string | null
  version: number // changes after an action, so the panel reloads
  currentUserId: string
  onClose: () => void
  onBan: (user: AdminUser) => void
  onUnban: (user: AdminUser) => void
  onRevokeSessions: (user: AdminUser) => void
  onViewActivity: (userId: string) => void
}

export function UserDrawer({ userId, version, currentUserId, onClose, onBan, onUnban, onRevokeSessions, onViewActivity }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!userId) return
    let current = true
    apiService
      .getAdminUser(userId)
      .then((d) => {
        if (!current) return
        setDetail(d)
        setError("")
      })
      .catch((err) => current && setError(err instanceof Error ? err.message : "Could not load the user"))
    return () => {
      current = false
    }
  }, [userId, version])

  const user = detail?.user
  const isSelf = user?.id === currentUserId

  return (
    <Drawer open={userId !== null} onClose={onClose} title={user ? user.name : "User"} size={560} destroyOnHidden afterOpenChange={(open) => !open && setDetail(null)}>
      {error && <Alert type="error" title={error} showIcon />}
      {!detail && !error && <Skeleton active paragraph={{ rows: 8 }} />}
      {detail && user && (
        <>
          <Descriptions
            size="small"
            column={1}
            bordered
            items={[
              { key: "email", label: "Email", children: user.email },
              { key: "role", label: "Role", children: <Tag color={user.role === "admin" ? "gold" : undefined}>{user.role}</Tag> },
              {
                key: "status",
                label: "Status",
                children: user.is_banned ? <Tag color="red">banned{user.ban_reason ? `: ${user.ban_reason}` : ""}</Tag> : <Tag color="green">active</Tag>,
              },
              { key: "joined", label: "Joined", children: dayjs(user.created_at).format("YYYY-MM-DD HH:mm") },
              { key: "login", label: "Last login", children: user.last_login_at ? `${dayjs(user.last_login_at).format("YYYY-MM-DD HH:mm")} (${dayjs(user.last_login_at).fromNow()})` : "never" },
              { key: "failed", label: "Failed logins (7 days)", children: user.failed_logins_7d > 0 ? <Tag color={user.failed_logins_7d >= 3 ? "red" : "orange"}>{user.failed_logins_7d}</Tag> : 0 },
              { key: "tasks", label: "Tasks created", children: `${detail.tasks.total} (${detail.tasks.open} open, ${detail.tasks.done} done)` },
            ]}
          />

          <Flex gap={8} wrap style={{ margin: "16px 0" }}>
            {user.is_banned ? (
              <Button onClick={() => onUnban(user)}>Unban</Button>
            ) : (
              <Button danger disabled={isSelf || user.role === "admin"} onClick={() => onBan(user)}>
                Ban
              </Button>
            )}
            <Popconfirm title={`Log ${user.name} out of every device?`} okText="Log out" okButtonProps={{ danger: true }} onConfirm={() => onRevokeSessions(user)}>
              <Button disabled={detail.sessions.length === 0}>Log out everywhere</Button>
            </Popconfirm>
            <Button onClick={() => onViewActivity(user.id)}>All activity</Button>
          </Flex>

          <Divider titlePlacement="start">Groups</Divider>
          {detail.groups.length === 0 ? (
            <Typography.Text type="secondary">Not in any group.</Typography.Text>
          ) : (
            <Space wrap>
              {detail.groups.map((g) => (
                <Tag key={g.id} color={g.role === "owner" ? "gold" : undefined}>
                  {g.name} · {g.role}
                </Tag>
              ))}
            </Space>
          )}

          <Divider titlePlacement="start">Recent tasks</Divider>
          {detail.recent_tasks.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks" />}
          {detail.recent_tasks.map((t) => (
            <Flex key={t.id} justify="space-between" gap={8} style={{ padding: "2px 0" }}>
              <Typography.Text delete={t.is_completed}>{t.title}</Typography.Text>
              <Space size={4}>
                {t.group_name && <Tag color="purple">{t.group_name}</Tag>}
                {t.due_date && <Tag>{t.due_date}</Tag>}
              </Space>
            </Flex>
          ))}

          <Divider titlePlacement="start">Active sessions ({detail.sessions.length})</Divider>
          {detail.sessions.length === 0 && <Typography.Text type="secondary">Not logged in anywhere.</Typography.Text>}
          {detail.sessions.map((s) => (
            <div key={s.id} style={{ padding: "2px 0" }}>
              <Typography.Text>{describeDevice(s.user_agent)}</Typography.Text>{" "}
              <Typography.Text type="secondary">
                {s.ip_address ?? "unknown address"} · active {dayjs(s.last_used_at).fromNow()}
              </Typography.Text>
            </div>
          ))}

          <Divider titlePlacement="start">Recent activity</Divider>
          {detail.recent_activity.length === 0 && <Typography.Text type="secondary">Nothing recorded.</Typography.Text>}
          {detail.recent_activity.map((a) => (
            <div key={a.id} style={{ padding: "2px 0" }}>
              <Typography.Text type="secondary">{dayjs(a.created_at).format("MM-DD HH:mm")}</Typography.Text> <Tag>{a.action.replaceAll("_", " ")}</Tag>
              {a.detail && <Typography.Text>{a.detail}</Typography.Text>}
            </div>
          ))}
        </>
      )}
    </Drawer>
  )
}
