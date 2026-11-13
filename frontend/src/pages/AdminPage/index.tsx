// Admin dashboard at /admin: stats, then tabs for users, tasks, groups, activity and security. Tab, filters, pages and the open user live in the address.
import { Alert, App as AntApp, Input, Modal, Tabs, Typography } from "antd"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { AdminActivityTable } from "../../components/AdminActivityTable"
import { AdminGroupsTable } from "../../components/AdminGroupsTable"
import { AdminSecurityPanel } from "../../components/AdminSecurityPanel"
import { AdminStatsCards } from "../../components/AdminStatsCards"
import { AdminTasksTable } from "../../components/AdminTasksTable"
import { AdminUsersTable } from "../../components/AdminUsersTable"
import { PageHeader } from "../../components/PageHeader"
import { UserDrawer } from "../../components/UserDrawer"
import { useAuth } from "../../context/AuthContext"
import { usePagedList } from "../../hooks/usePagedList"
import { apiService } from "../../services/api"
import type { ActivityFilters, AdminActivity, AdminGroup, AdminStats, AdminTask, AdminUser, GroupFilters, SecurityReport, TaskFilters, UserFilters } from "../../types/admin"

const PAGE_SIZE = 10

const USER_KEYS = ["q", "role", "status"] as const
const TASK_KEYS = ["owner_id", "group_id", "scope", "status", "q"] as const
const GROUP_KEYS = ["owner_id", "q"] as const
const ACTIVITY_KEYS = ["user_id", "action", "q", "date_from", "date_to"] as const

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function AdminPage() {
  const { user: me } = useAuth()
  const { message } = AntApp.useApp()
  const [params, setParams] = useSearchParams()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsError, setStatsError] = useState("")
  const [report, setReport] = useState<SecurityReport | null>(null)
  const [secWindow, setSecWindow] = useState({ hours: 24, minFailures: 3 })
  const [banTargets, setBanTargets] = useState<AdminUser[]>([])
  const [banReason, setBanReason] = useState("")
  const [version, setVersion] = useState(0)

  const tab = params.get("tab") ?? "users"
  const openUserId = params.get("user")

  const users = usePagedList<AdminUser, UserFilters>(apiService.getAdminUsers, { prefix: "u", keys: USER_KEYS, pageSize: PAGE_SIZE })
  const tasks = usePagedList<AdminTask, TaskFilters>(apiService.getAdminTasks, { prefix: "t", keys: TASK_KEYS, pageSize: PAGE_SIZE })
  const groups = usePagedList<AdminGroup, GroupFilters>(apiService.getAdminGroups, { prefix: "g", keys: GROUP_KEYS, pageSize: PAGE_SIZE })
  const activity = usePagedList<AdminActivity, ActivityFilters>(apiService.getAdminActivity, { prefix: "a", keys: ACTIVITY_KEYS, pageSize: PAGE_SIZE })

  const loadStats = async () => {
    try {
      setStats(await apiService.getAdminStats())
      setStatsError("")
    } catch (err) {
      setStatsError(messageOf(err))
    }
  }

  const loadReport = async () => {
    try {
      setReport(await apiService.getSecurityReport(secWindow.hours, secWindow.minFailures))
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secWindow])

  // Edits the address without adding a history entry per keystroke.
  const updateParams = (change: (next: URLSearchParams) => void) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        change(next)
        return next
      },
      { replace: true },
    )

  const openUser = (id: string | null) => updateParams((next) => (id ? next.set("user", id) : next.delete("user")))

  // Jumps to the activity tab with only the given filter set.
  const showActivity = (filter: { a_user_id?: string; a_q?: string }) =>
    updateParams((next) => {
      for (const key of ["a_user_id", "a_action", "a_q", "a_date_from", "a_date_to", "a_page"]) next.delete(key)
      for (const [key, value] of Object.entries(filter)) if (value) next.set(key, value)
      next.set("tab", "activity")
      next.delete("user")
    })

  // Runs a change, then refreshes everything on screen (keeping the filters) and reports the result.
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      await Promise.all([loadStats(), loadReport(), users.reload(), tasks.reload(), groups.reload(), activity.reload()])
      setVersion((v) => v + 1)
      message.success(success)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  const confirmBan = async () => {
    const targets = banTargets
    const reason = banReason.trim()
    setBanTargets([])
    setBanReason("")
    if (targets.length === 1) {
      await run(() => apiService.banUser(targets[0].id, reason), `${targets[0].email} banned`)
      return
    }
    try {
      const result = await apiService.bulkBanUsers(targets.map((u) => u.id), reason)
      await run(async () => undefined, `${result.affected} banned, ${result.skipped} skipped`)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  const bulk = async (call: () => Promise<{ affected: number; skipped: number }>, noun: string) => {
    try {
      const result = await call()
      await run(async () => undefined, `${result.affected} ${noun}, ${result.skipped} skipped`)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  if (!me) return null

  const error = statsError || users.error || tasks.error || groups.error || activity.error

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Usage, users, tasks, groups, activity and security." />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      {stats && <AdminStatsCards stats={stats} />}

      <Tabs
        style={{ marginTop: 24 }}
        activeKey={tab}
        onChange={(key) => updateParams((next) => next.set("tab", key))}
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
                onOpen={(user) => openUser(user.id)}
                onBulkBan={setBanTargets}
                onBulkUnban={(ids) => bulk(() => apiService.bulkUnbanUsers(ids), "unbanned")}
                onExport={() => apiService.exportAdminUsers(users.filters)}
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
                onBulkDelete={(ids) => bulk(() => apiService.bulkDeleteAdminTasks(ids), "deleted")}
                onExport={() => apiService.exportAdminTasks(tasks.filters)}
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
                onDelete={(group) => run(() => apiService.deleteAdminGroup(group.id), `Group "${group.name}" deleted`)}
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
                onExport={() => apiService.exportAdminActivity(activity.filters)}
                onPurge={async (days) => {
                  try {
                    const result = await apiService.purgeAdminActivity(days)
                    await run(async () => undefined, `${result.deleted} entries deleted`)
                  } catch (err) {
                    message.error(messageOf(err))
                  }
                }}
              />
            ),
          },
          {
            key: "security",
            label: `Security${report && report.ips.length + report.accounts.length > 0 ? ` (${report.ips.length + report.accounts.length})` : ""}`,
            children: (
              <AdminSecurityPanel
                report={report}
                loading={false}
                hours={secWindow.hours}
                minFailures={secWindow.minFailures}
                onChange={(hours, minFailures) => setSecWindow({ hours, minFailures })}
                onOpenUser={openUser}
                onViewActivity={(email) => showActivity({ a_q: email })}
              />
            ),
          },
        ]}
      />

      <UserDrawer
        userId={openUserId}
        version={version}
        currentUserId={me.id}
        onClose={() => openUser(null)}
        onBan={(user) => setBanTargets([user])}
        onUnban={(user) => run(() => apiService.unbanUser(user.id), `${user.email} unbanned`)}
        onRevokeSessions={(user) => run(() => apiService.revokeUserSessions(user.id), `${user.name} logged out everywhere`)}
        onViewActivity={(id) => showActivity({ a_user_id: id })}
      />

      <Modal
        open={banTargets.length > 0}
        title={banTargets.length === 1 ? `Ban ${banTargets[0].email}?` : `Ban ${banTargets.length} users?`}
        okText="Ban"
        okButtonProps={{ danger: true }}
        onOk={confirmBan}
        onCancel={() => setBanTargets([])}
      >
        <Typography.Paragraph type="secondary">
          Their sessions end right away and they cannot log in until you unban them.
          {banTargets.length > 1 && " Yourself and other admins are skipped."}
        </Typography.Paragraph>
        <Input.TextArea rows={3} maxLength={500} placeholder="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
      </Modal>
    </>
  )
}
