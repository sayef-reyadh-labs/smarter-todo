// Security view: addresses and accounts with repeated failed logins or hostile requests, and the newest hostile events with who, what and from where.
import { Alert, Button, Flex, InputNumber, Select, Table, Tag, Tooltip, Typography, type TableColumnsType } from "antd"
import dayjs from "dayjs"
import type { AdminActivity, SecurityReport, SuspiciousAccount, SuspiciousIp } from "../types/admin"

type Props = {
  report: SecurityReport | null
  loading: boolean
  hours: number
  minFailures: number
  onChange: (hours: number, minFailures: number) => void
  onOpenUser: (userId: string) => void
  onViewActivity: (email: string) => void
}

const labelOf = (action: string) => action.replaceAll("_", " ")

const time = (at: string) => dayjs(at).format("YYYY-MM-DD HH:mm:ss")

const browser = (agent: string | null) =>
  agent ? (
    <Tooltip title={agent}>
      <Typography.Text style={{ maxWidth: 180 }} ellipsis>
        {agent}
      </Typography.Text>
    </Tooltip>
  ) : (
    "-"
  )

export function AdminSecurityPanel({ report, loading, hours, minFailures, onChange, onOpenUser, onViewActivity }: Props) {
  const ipColumns: TableColumnsType<SuspiciousIp> = [
    { title: "IP address", dataIndex: "ip_address" },
    { title: "Failures", dataIndex: "failures", render: (n: number) => <Tag color="red">{n}</Tag>, sorter: (a, b) => a.failures - b.failures },
    {
      title: "What happened",
      dataIndex: "kinds",
      render: (kinds: Record<string, number>) => (
        <Flex wrap gap={4}>
          {Object.entries(kinds).map(([action, n]) => (
            <Tag key={action} color="red">
              {labelOf(action)} x{n}
            </Tag>
          ))}
        </Flex>
      ),
    },
    {
      title: "Emails tried",
      render: (_, ip) =>
        ip.emails.length === 0 ? (
          "-"
        ) : (
          <Flex wrap gap={4}>
            {ip.emails.map((email) => (
              <Tag key={email} bordered={false}>
                {email}
              </Tag>
            ))}
            {ip.distinct_accounts > ip.emails.length && <Tag color="volcano">{ip.distinct_accounts} accounts</Tag>}
          </Flex>
        ),
    },
    { title: "Browser", dataIndex: "user_agent", render: browser },
    { title: "Last seen", dataIndex: "last_seen", render: time },
  ]

  const accountColumns: TableColumnsType<SuspiciousAccount> = [
    {
      title: "Account",
      render: (_, account) => (
        <Flex vertical>
          <Typography.Text>{account.email}</Typography.Text>
          {account.name && <Typography.Text type="secondary">{account.name}</Typography.Text>}
        </Flex>
      ),
    },
    {
      title: "Status",
      render: (_, account) => (
        <Flex wrap gap={4}>
          {account.user_id === null && <Tag>no such account</Tag>}
          {account.is_banned && <Tag color="red">banned</Tag>}
          {account.is_locked && <Tag color="volcano">locked</Tag>}
          {account.user_id !== null && !account.is_banned && !account.is_locked && <Tag color="green">active</Tag>}
        </Flex>
      ),
    },
    { title: "Failures", dataIndex: "failures", render: (n: number) => <Tag color="red">{n}</Tag> },
    {
      title: "From addresses",
      render: (_, account) => (
        <Flex wrap gap={4}>
          {account.ip_addresses.map((ip) => (
            <Tag key={ip} bordered={false}>
              {ip}
            </Tag>
          ))}
          {account.distinct_ips > account.ip_addresses.length && <Tag color="volcano">{account.distinct_ips} addresses</Tag>}
        </Flex>
      ),
    },
    { title: "Browser", dataIndex: "user_agent", render: browser },
    { title: "Last seen", dataIndex: "last_seen", render: time },
    {
      title: "Action",
      render: (_, account) => (
        <Flex gap={4}>
          {account.user_id && (
            <Button size="small" onClick={() => onOpenUser(account.user_id!)}>
              Open user
            </Button>
          )}
          <Button size="small" onClick={() => onViewActivity(account.email)}>
            Activity
          </Button>
        </Flex>
      ),
    },
  ]

  const eventColumns: TableColumnsType<AdminActivity> = [
    { title: "Time", dataIndex: "created_at", render: time, width: 170 },
    { title: "Event", dataIndex: "action", render: (action: string) => <Tag color="red">{labelOf(action)}</Tag> },
    { title: "User", dataIndex: "email", render: (email: string | null) => email ?? <Typography.Text type="secondary">nobody (forged or missing identity)</Typography.Text> },
    { title: "Details", dataIndex: "detail", render: (detail: string | null) => detail ?? "-" },
    { title: "IP address", dataIndex: "ip_address", render: (ip: string | null) => ip ?? "-" },
    { title: "Browser", dataIndex: "user_agent", render: browser },
  ]

  return (
    <>
      <Flex wrap gap={12} align="center" style={{ marginBottom: 12 }}>
        <Typography.Text>Show addresses and accounts with at least</Typography.Text>
        <InputNumber min={1} max={1000} value={minFailures} onChange={(value) => value && onChange(hours, value)} aria-label="Minimum failures" />
        <Typography.Text>failed logins or hostile requests in the last</Typography.Text>
        <Select
          value={hours}
          onChange={(value) => onChange(value, minFailures)}
          options={[
            { value: 1, label: "hour" },
            { value: 24, label: "24 hours" },
            { value: 72, label: "3 days" },
            { value: 168, label: "7 days" },
            { value: 720, label: "30 days" },
          ]}
          style={{ width: 120 }}
          aria-label="Time window"
        />
      </Flex>
      {report && report.ips.length === 0 && report.accounts.length === 0 && report.events.length === 0 && (
        <Alert type="success" showIcon title="Nothing suspicious in this window." style={{ marginBottom: 12 }} />
      )}
      <Typography.Title level={5}>By IP address</Typography.Title>
      <Table rowKey="ip_address" size="small" loading={loading} columns={ipColumns} dataSource={report?.ips ?? []} pagination={false} scroll={{ x: true }} style={{ marginBottom: 24 }} />
      <Typography.Title level={5}>By account</Typography.Title>
      <Table rowKey="email" size="small" loading={loading} columns={accountColumns} dataSource={report?.accounts ?? []} pagination={false} scroll={{ x: true }} style={{ marginBottom: 24 }} />
      <Typography.Title level={5}>Recent security events</Typography.Title>
      <Table rowKey="id" size="small" loading={loading} columns={eventColumns} dataSource={report?.events ?? []} pagination={false} scroll={{ x: true }} />
    </>
  )
}
