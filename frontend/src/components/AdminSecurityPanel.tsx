// Security view: addresses and accounts with repeated failed logins or hostile requests in a time window.
import { Alert, Button, Flex, InputNumber, Select, Table, Tag, Typography, type TableColumnsType } from "antd"
import dayjs from "dayjs"
import type { SecurityReport, SuspiciousAccount, SuspiciousIp } from "../types/admin"

type Props = {
  report: SecurityReport | null
  loading: boolean
  hours: number
  minFailures: number
  onChange: (hours: number, minFailures: number) => void
  onOpenUser: (userId: string) => void
  onViewActivity: (email: string) => void
}

export function AdminSecurityPanel({ report, loading, hours, minFailures, onChange, onOpenUser, onViewActivity }: Props) {
  const ipColumns: TableColumnsType<SuspiciousIp> = [
    { title: "IP address", dataIndex: "ip_address" },
    { title: "Failures", dataIndex: "failures", render: (n: number) => <Tag color="red">{n}</Tag>, sorter: (a, b) => a.failures - b.failures },
    { title: "Accounts tried", dataIndex: "distinct_accounts", render: (n: number) => (n > 1 ? <Tag color="volcano">{n} accounts</Tag> : n) },
    { title: "Last seen", dataIndex: "last_seen", render: (at: string) => dayjs(at).format("YYYY-MM-DD HH:mm:ss") },
  ]

  const accountColumns: TableColumnsType<SuspiciousAccount> = [
    { title: "Account", dataIndex: "email" },
    { title: "Failures", dataIndex: "failures", render: (n: number) => <Tag color="red">{n}</Tag> },
    { title: "From addresses", dataIndex: "distinct_ips", render: (n: number) => (n > 1 ? <Tag color="volcano">{n} addresses</Tag> : n) },
    { title: "Last seen", dataIndex: "last_seen", render: (at: string) => dayjs(at).format("YYYY-MM-DD HH:mm:ss") },
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

  return (
    <>
      <Flex wrap gap={12} align="center" style={{ marginBottom: 12 }}>
        <Typography.Text>Show addresses and accounts with at least</Typography.Text>
        <InputNumber min={1} max={1000} value={minFailures} onChange={(value) => value && onChange(hours, value)} aria-label="Minimum failures" />
        <Typography.Text>failed logins in the last</Typography.Text>
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
      {report && report.ips.length === 0 && report.accounts.length === 0 && (
        <Alert type="success" showIcon title="Nothing suspicious in this window." style={{ marginBottom: 12 }} />
      )}
      <Typography.Title level={5}>By IP address</Typography.Title>
      <Table rowKey="ip_address" size="small" loading={loading} columns={ipColumns} dataSource={report?.ips ?? []} pagination={false} scroll={{ x: true }} style={{ marginBottom: 24 }} />
      <Typography.Title level={5}>By account</Typography.Title>
      <Table rowKey="email" size="small" loading={loading} columns={accountColumns} dataSource={report?.accounts ?? []} pagination={false} scroll={{ x: true }} />
    </>
  )
}
