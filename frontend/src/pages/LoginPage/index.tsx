// Login form; after logging in the user returns to the page they came from.
import { Alert, Button, Form, Input, Typography } from "antd"
import { useState } from "react"
import { Link, Navigate, useLocation } from "react-router"
import { useAuth } from "../../context/AuthContext"
import type { LoginInput } from "../../types/auth"
import { emailRules } from "../../utils/authForm"

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const from = (location.state as { from?: string } | null)?.from ?? "/"

  if (user) return <Navigate to={from} replace />

  const handleFinish = async (values: LoginInput) => {
    setError("")
    setSubmitting(true)
    try {
      await login(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Typography.Title level={2}>Log in</Typography.Title>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={handleFinish}>
        <Form.Item label="Email" name="email" rules={emailRules}>
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, message: "Password is required" }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Log in
        </Button>
      </Form>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        No account yet? <Link to="/signup">Sign up</Link>
      </Typography.Paragraph>
    </>
  )
}
