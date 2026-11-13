// Static page that describes the project.
import { Card, Typography } from "antd"
import { PageHeader } from "../../components/PageHeader"

export function AboutPage() {
  return (
    <>
      <PageHeader title="About Smarter Todo" subtitle="A task manager for individuals and teams." />

      <Card style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          What it does
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Keep a private task list with due dates, share task lists with a team in groups and assign tasks to members. Admins get a dashboard with
          usage stats, user management and an activity log.
        </Typography.Paragraph>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Tech stack
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          React 19 · TypeScript · Vite · Ant Design · React Router · FastAPI · SQLModel · SQLite (local) / PostgreSQL on Supabase (production)
        </Typography.Paragraph>
        <Typography.Title level={4}>Backend layers</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Router → Service (business rules) → Repository (database) → Model (table), with schemas for request and response shapes and an RBAC
          module for permissions.
        </Typography.Paragraph>
      </Card>

      <Card>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Built by
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          SayefReyadh
        </Typography.Paragraph>
      </Card>
    </>
  )
}
