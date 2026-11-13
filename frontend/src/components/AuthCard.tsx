// Login and signup frame: a feature panel on wide screens next to a card with logo, title, optional error, the form, and a footer link.
import { CheckCircleOutlined, CheckSquareOutlined, SafetyCertificateOutlined, TeamOutlined } from "@ant-design/icons"
import { Alert, Card, Typography } from "antd"
import type { ReactNode } from "react"

type Props = {
  title: string
  subtitle: string
  error?: string
  // Changes on every failed attempt so the error shakes again even when the message is the same.
  errorKey?: number
  footer: ReactNode
  children: ReactNode
}

const HIGHLIGHTS = [
  { icon: <CheckCircleOutlined />, text: "A private list with categories, due dates and search" },
  { icon: <TeamOutlined />, text: "Groups to share and assign tasks with your team" },
  { icon: <SafetyCertificateOutlined />, text: "See and control every device you are logged in on" },
]

export function AuthCard({ title, subtitle, error, errorKey = 0, footer, children }: Props) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside" aria-hidden="true">
        <CheckSquareOutlined className="auth-aside-logo" />
        <h2>Plan it. Share it. Finish it.</h2>
        <ul>
          {HIGHLIGHTS.map((item) => (
            <li key={item.text}>
              {item.icon}
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </aside>
      <Card className="auth-card" styles={{ body: { padding: 32 } }}>
        <div className="auth-logo" aria-hidden="true">
          <CheckSquareOutlined />
        </div>
        <Typography.Title level={2} style={{ marginTop: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph type="secondary">{subtitle}</Typography.Paragraph>
        {error && <Alert key={errorKey} className="shake" type="error" title={error} showIcon style={{ marginBottom: 16 }} role="alert" />}
        {children}
        <Typography.Paragraph type="secondary" style={{ margin: "20px 0 0", textAlign: "center" }}>
          {footer}
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
