// Admin dashboard at /admin: stats, user management (role, ban, unban) and removing tasks.
import { Alert, App as AntApp, Input, Modal, Typography } from "antd"
import { useEffect, useState } from "react"
import { AdminStatsCards } from "../../components/AdminStatsCards"
import { AdminTasksTable } from "../../components/AdminTasksTable"
import { AdminUsersTable } from "../../components/AdminUsersTable"
import { useAuth } from "../../context/AuthContext"
import { apiService } from "../../services/api"
import type { AdminStats, AdminTask, AdminUser, Page } from "../../types/admin"

const PAGE_SIZE = 10

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function AdminPage() {
  const { user: me } = useAuth()
  const { message } = AntApp.useApp()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<Page<AdminUser> | null>(null)
  const [tasks, setTasks] = useState<Page<AdminTask> | null>(null)
  const [userPage, setUserPage] = useState(1)
  const [taskPage, setTaskPage] = useState(1)
  const [error, setError] = useState("")
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null)
  const [banReason, setBanReason] = useState("")

  const reload = async (uPage = userPage, tPage = taskPage) => {
    const [s, u, t] = await Promise.all([
      apiService.getAdminStats(),
      apiService.getAdminUsers((uPage - 1) * PAGE_SIZE, PAGE_SIZE),
      apiService.getAdminTasks((tPage - 1) * PAGE_SIZE, PAGE_SIZE),
    ])
    setStats(s)
    setUsers(u)
    setTasks(t)
  }

  useEffect(() => {
    const loadOnOpen = async () => {
      try {
        await reload()
      } catch (err) {
        setError(messageOf(err))
      }
    }
    loadOnOpen()
  }, [])

  // Runs a change, refreshes everything on screen and reports the result.
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      await reload()
      message.success(success)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  const changeUserPage = async (page: number) => {
    setUserPage(page)
    try {
      await reload(page, taskPage)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  const changeTaskPage = async (page: number) => {
    setTaskPage(page)
    try {
      await reload(userPage, page)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  const confirmBan = async () => {
    if (!banTarget) return
    const target = banTarget
    setBanTarget(null)
    await run(() => apiService.banUser(target.id, banReason.trim()), `${target.email} banned`)
    setBanReason("")
  }

  if (!me) return null

  return (
    <>
      <Typography.Title level={2}>Admin dashboard</Typography.Title>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      {stats && <AdminStatsCards stats={stats} />}

      <Typography.Title level={4} style={{ marginTop: 32 }}>
        Users
      </Typography.Title>
      {users && (
        <AdminUsersTable
          users={users}
          currentUserId={me.id}
          page={userPage}
          pageSize={PAGE_SIZE}
          onPageChange={changeUserPage}
          onRoleChange={(user, role) => run(() => apiService.changeUserRole(user.id, role), `${user.email} is now ${role}`)}
          onBan={setBanTarget}
          onUnban={(user) => run(() => apiService.unbanUser(user.id), `${user.email} unbanned`)}
        />
      )}

      <Typography.Title level={4} style={{ marginTop: 32 }}>
        Tasks
      </Typography.Title>
      {tasks && (
        <AdminTasksTable
          tasks={tasks}
          page={taskPage}
          pageSize={PAGE_SIZE}
          onPageChange={changeTaskPage}
          onDelete={(task) => run(() => apiService.deleteAdminTask(task.id), "Task deleted")}
        />
      )}

      <Modal
        open={banTarget !== null}
        title={`Ban ${banTarget?.email ?? ""}?`}
        okText="Ban"
        okButtonProps={{ danger: true }}
        onOk={confirmBan}
        onCancel={() => setBanTarget(null)}
      >
        <Typography.Paragraph type="secondary">Their sessions end right away and they cannot log in until you unban them.</Typography.Paragraph>
        <Input.TextArea rows={3} maxLength={500} placeholder="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
      </Modal>
    </>
  )
}
