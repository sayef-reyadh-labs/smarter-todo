// One group at /groups/:groupId: its members and its tasks; the owner can rename or delete it, a member can leave.
import { Alert, App as AntApp, Button, Card, Popconfirm, Skeleton, Space, Tag } from "antd"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { GroupMembers } from "../../components/GroupMembers"
import { GroupTasks } from "../../components/GroupTasks"
import { PageHeader } from "../../components/PageHeader"
import { useAuth } from "../../context/AuthContext"
import { apiService } from "../../services/api"
import type { Group, GroupTask, Member } from "../../types/group"

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function GroupDetailPage() {
  const { groupId = "" } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const reload = async () => {
    const [g, m, t] = await Promise.all([
      apiService.getGroup(groupId),
      apiService.getMembers(groupId),
      apiService.getGroupTasks(groupId),
    ])
    setGroup(g)
    setMembers(m)
    setTasks(t.items)
  }

  useEffect(() => {
    const loadOnOpen = async () => {
      try {
        await reload()
      } catch (err) {
        setError(messageOf(err))
      } finally {
        setLoading(false)
      }
    }
    loadOnOpen()
  }, [groupId])

  // Runs a change, refreshes the page data and reports the result; returns false on failure.
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action()
      await reload()
      message.success(success)
      return true
    } catch (err) {
      message.error(messageOf(err))
      return false
    }
  }

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />
  if (!group || !user) {
    return (
      <>
        <Alert type="error" title={error || "Group not found"} showIcon style={{ marginBottom: 16 }} />
        <Link to="/groups">Back to groups</Link>
      </>
    )
  }

  const isOwner = group.my_role === "owner"

  const leaveOrDelete = async () => {
    try {
      await (isOwner ? apiService.deleteGroup(group.id) : apiService.removeMember(group.id, user.id))
      message.success(isOwner ? "Group deleted" : "You left the group")
      navigate("/groups")
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  return (
    <>
      <PageHeader
        back={{ to: "/groups", label: "Back to groups" }}
        title={group.name}
        onTitleChange={
          isOwner ? (name) => name.trim() && name !== group.name && run(() => apiService.renameGroup(group.id, name.trim()), "Group renamed") : undefined
        }
        extra={
          <Space>
            <Tag color={isOwner ? "gold" : undefined}>{group.my_role}</Tag>
            <Popconfirm
              title={isOwner ? "Delete this group and all its tasks?" : "Leave this group?"}
              okText={isOwner ? "Delete" : "Leave"}
              okButtonProps={{ danger: true }}
              onConfirm={leaveOrDelete}
            >
              <Button danger>{isOwner ? "Delete group" : "Leave group"}</Button>
            </Popconfirm>
          </Space>
        }
      />

      <Card style={{ marginBottom: 24 }}>
        <GroupMembers
          members={members}
          isOwner={isOwner}
          onAdd={(email) => run(() => apiService.addMember(group.id, email), "Member added")}
          onRemove={(member) => run(() => apiService.removeMember(group.id, member.user_id), `${member.name} removed`)}
        />
      </Card>

      <Card>
        <GroupTasks
        tasks={tasks}
        members={members}
        currentUserId={user.id}
        isOwner={isOwner}
        onAdd={(data) => run(() => apiService.createGroupTask(group.id, data), "Task added")}
        onEdit={(task, patch) => run(() => apiService.updateGroupTask(group.id, task.id, patch), "Task updated")}
        onToggle={(task) => run(() => apiService.updateGroupTask(group.id, task.id, { is_completed: !task.is_completed }), "Task updated")}
        onAssign={(task, assigneeId) => run(() => apiService.updateGroupTask(group.id, task.id, { assignee_id: assigneeId }), "Assignee updated")}
        onDelete={(task) => run(() => apiService.deleteGroupTask(group.id, task.id), "Task deleted")}
      />
      </Card>
    </>
  )
}
