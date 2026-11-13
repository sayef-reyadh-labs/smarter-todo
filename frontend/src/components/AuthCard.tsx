// Centered card for the login and signup forms: logo, title, optional error, the form, and a footer link.
import { CheckSquareOutlined } from "@ant-design/icons"
import { Alert, Card, Typography } from "antd"
import type { ReactNode } from "react"

type Props = {
  title: string
  subtitle: string
  error?: string
  footer: ReactNode
  children: ReactNode
}

export function AuthCard({ title, subtitle, error, footer, children }: Props) {
  return (
    <Card className="auth-card" style={{ maxWidth: 440, margin: "24px auto 0" }} styles={{ body: { padding: 32 } }}>
      <div className="auth-logo" aria-hidden="true">
        <CheckSquareOutlined />
      </div>
      <Typography.Title level={2} style={{ marginTop: 0 }}>
        {title}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{subtitle}</Typography.Paragraph>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} role="alert" />}
      {children}
      <Typography.Paragraph type="secondary" style={{ margin: "20px 0 0", textAlign: "center" }}>
        {footer}
      </Typography.Paragraph>
    </Card>
  )
}
