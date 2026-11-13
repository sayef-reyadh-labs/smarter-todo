// Centered card for the login and signup forms: title, optional error, the form, and a footer link.
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
    <Card style={{ maxWidth: 440, margin: "24px auto 0" }} styles={{ body: { padding: 32 } }}>
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
