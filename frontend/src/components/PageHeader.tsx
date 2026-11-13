// Title block shared by every page: optional back link, title, subtitle and a slot for actions on the right.
import { ArrowLeftOutlined } from "@ant-design/icons"
import { Flex, Typography } from "antd"
import type { ReactNode } from "react"
import { Link } from "react-router"

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  extra?: ReactNode
  back?: { to: string; label: string }
  // When set (and the title is text), the title can be renamed in place.
  onTitleChange?: (title: string) => void
}

export function PageHeader({ title, subtitle, extra, back, onTitleChange }: Props) {
  const editable = onTitleChange && typeof title === "string" ? { onChange: onTitleChange, tooltip: "Rename" } : false
  return (
    <div style={{ marginBottom: 24 }}>
      {back && (
        <Link to={back.to} style={{ display: "inline-block", marginBottom: 8 }}>
          <ArrowLeftOutlined /> {back.label}
        </Link>
      )}
      <Flex justify="space-between" align="center" wrap gap={12}>
        <div style={{ minWidth: 0 }}>
          <Typography.Title level={2} style={{ margin: 0 }} editable={editable}>
            {title}
          </Typography.Title>
          {subtitle && (
            <Typography.Paragraph type="secondary" style={{ margin: "4px 0 0" }}>
              {subtitle}
            </Typography.Paragraph>
          )}
        </div>
        {extra}
      </Flex>
    </div>
  )
}
