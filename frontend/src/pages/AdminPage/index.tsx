// Admin dashboard at /admin: stats, then filterable tabs for users (role, ban, unban), tasks, groups and activity.
import { Alert, App as AntApp, Input, Modal, Tabs, Typography } from "antd"
import { useEffect, useState } from "react"
import { AdminActivityTable } from "../../components/AdminActivityTable"
import { AdminGroupsTable } from "../../components/AdminGroupsTable"
import { AdminStatsCards } from "../../components/AdminStatsCards"
import { AdminTasksTable } from "../../components/AdminTasksTable"
import { AdminUsersTable } from "../../components/AdminUsersTable"
import { PageHeader } from "../../components/PageHeader"
import { useAuth } from "../../context/AuthContext"
import { usePagedList } from "../../hooks/usePagedList"
import { apiService } from "../../services/api"
import type { ActivityFilters, AdminStats, AdminUser, GroupFilters, TaskFilters, UserFilters } from "../../types/admin"

const PAGE_SIZE = 10

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function AdminPage() {
  const { user: me } = useAuth()
  const { message } = AntApp.useApp()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsError, setStatsError] = useState("")
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null)
  const [banReason, setBanReason] = useState("")

  const users = usePagedList(apiService.getAdminUsers, {} as UserFilters, PAGE_SIZE)
  const tasks = usePagedList(apiService.getAdminTasks, {} as TaskFilters, PAGE_SIZE)
  const groups = usePagedList(apiService.getAdminGroups, {} as GroupFilters, PAGE_SIZE)
  const activity = usePagedList(apiService.getAdminActivity, {} as ActivityFilters, PAGE_SIZE)

  const loadStats = async () => {
    try {
      setStats(await apiService.getAdminStats())
      setStatsError("")
    } catch (err) {
      setStatsError(messageOf(err))
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  // Runs a change, then refreshes everything on screen (keeping the filters) and reports the result.
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      await Promise.all([loadStats(), users.reload(), tasks.reload(), groups.reload(), activity.reload()])
      message.success(success)
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

  const error = statsError || users.error || tasks.error || groups.error || activity.error

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Usage, users, tasks and what people did." />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      {stats && <AdminStatsCards stats={stats} />}

      <Tabs
        style={{ marginTop: 24 }}
        items={[
          {
            key: "users",
            label: `Users${users.data ? ` (${users.data.total})` : ""}`,
            children: (
              <AdminUsersTable
                users={users.data}
                loading={users.loading}
                currentUserId={me.id}
                page={users.page}
                pageSize={PAGE_SIZE}
                filters={users.filters}
                onFilterChange={users.changeFilters}
                onPageChange={users.setPage}
                onRoleChange={(user, role) => run(() => apiService.changeUserRole(user.id, role), `${user.email} is now ${role}`)}
                onBan={setBanTarget}
                onUnban={(user) => run(() => apiService.unbanUser(user.id), `${user.email} unbanned`)}
              />
            ),
          },
          {
            key: "tasks",
            label: `Tasks${tasks.data ? ` (${tasks.data.total})` : ""}`,
            children: (
              <AdminTasksTable
                tasks={tasks.data}
                loading={tasks.loading}
                page={tasks.page}
                pageSize={PAGE_SIZE}
                filters={tasks.filters}
                onFilterChange={tasks.changeFilters}
                onPageChange={tasks.setPage}
                onDelete={(task) => run(() => apiService.deleteAdminTask(task.id), "Task deleted")}
              />
            ),
          },
          {
            key: "groups",
            label: `Groups${groups.data ? ` (${groups.data.total})` : ""}`,
            children: (
              <AdminGroupsTable
                groups={groups.data}
                loading={groups.loading}
                page={groups.page}
                pageSize={PAGE_SIZE}
                filters={groups.filters}
                onFilterChange={groups.changeFilters}
                onPageChange={groups.setPage}
              />
            ),
          },
          {
            key: "activity",
            label: "Activity",
            children: (
              <AdminActivityTable
                activity={activity.data}
                loading={activity.loading}
                page={activity.page}
                pageSize={PAGE_SIZE}
                filters={activity.filters}
                onFilterChange={activity.changeFilters}
                onPageChange={activity.setPage}
              />
            ),
          },
        ]}
      />

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
