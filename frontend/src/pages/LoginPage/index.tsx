// Login form; after logging in the user returns to the page they came from.
import { Button, Form, Input } from "antd"
import { useState } from "react"
import { Link, Navigate, useLocation } from "react-router"
import { AuthCard } from "../../components/AuthCard"
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
    <AuthCard
      title="Log in"
      subtitle="Welcome back. Log in to see your tasks."
      error={error}
      footer={
        <>
          No account yet? <Link to="/signup">Sign up</Link>
        </>
      }
    >
      <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item label="Email" name="email" rules={emailRules}>
          <Input size="large" autoComplete="email" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, message: "Password is required" }]}>
          <Input.Password size="large" autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          Log in
        </Button>
      </Form>
    </AuthCard>
  )
}
