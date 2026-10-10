import { Typography } from "antd"

export function AboutPage() {
  return (
    <>
      <Typography.Title level={2}>About Smarter Todo</Typography.Title>
      <Typography.Paragraph type="secondary">
        Smarter Todo is a task manager built as a FastAPI REST API with a React frontend. This MVP covers task create, list, view, update, complete and delete.
      </Typography.Paragraph>

      <Typography.Title level={4}>Tech stack</Typography.Title>
      <Typography.Paragraph type="secondary">
        React 19 · TypeScript · Vite · Ant Design · React Router · FastAPI · SQLModel · SQLite (local) / PostgreSQL (production)
      </Typography.Paragraph>

      <Typography.Title level={4}>Backend layers</Typography.Title>
      <Typography.Paragraph type="secondary">
        Controller (routes) → Service (business rules) → Repository (database) → Model (table), with schemas for request and response shapes.
      </Typography.Paragraph>

      <Typography.Title level={4}>Built by</Typography.Title>
      <Typography.Paragraph type="secondary">SayefReyadh</Typography.Paragraph>
    </>
  )
}
