// Login form; after logging in the user returns to the page they came from.
import { WarningOutlined } from "@ant-design/icons"
import { Button, Checkbox, Form, Input, Typography } from "antd"
import { useState, type KeyboardEvent } from "react"
import { Link, Navigate, useLocation } from "react-router"
import { AuthCard } from "../../components/AuthCard"
import { useAuth } from "../../context/AuthContext"
import type { LoginInput } from "../../types/auth"
import { emailRules } from "../../utils/authForm"

const EMAIL_KEY = "smarter_todo_remembered_email"

type LoginValues = LoginInput & { remember: boolean }

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [error, setError] = useState("")
  const [failures, setFailures] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [savedEmail] = useState(() => localStorage.getItem(EMAIL_KEY) ?? "")
  const from = (location.state as { from?: string } | null)?.from ?? "/"

  if (user) return <Navigate to={from} replace />

  const handleFinish = async ({ remember, ...values }: LoginValues) => {
    setError("")
    setSubmitting(true)
    try {
      await login(values)
      if (remember) localStorage.setItem(EMAIL_KEY, values.email.trim())
      else localStorage.removeItem(EMAIL_KEY)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setFailures((n) => n + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const watchCapsLock = (e: KeyboardEvent) => setCapsLock(e.getModifierState("CapsLock"))

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back. Log in to see your tasks."
      error={error}
      errorKey={failures}
      footer={
        <>
          No account yet? <Link to="/signup">Sign up</Link>
        </>
      }
    >
      <Form<LoginValues> layout="vertical" onFinish={handleFinish} requiredMark={false} initialValues={{ email: savedEmail, remember: savedEmail !== "" }}>
        <Form.Item label="Email" name="email" rules={emailRules} validateTrigger={["onBlur", "onChange"]} validateFirst hasFeedback>
          <Input size="large" autoComplete="email" autoFocus={savedEmail === ""} />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Password is required" }]}
          extra={
            capsLock && (
              <Typography.Text type="warning">
                <WarningOutlined /> Caps Lock is on
              </Typography.Text>
            )
          }
        >
          <Input.Password size="large" autoComplete="current-password" autoFocus={savedEmail !== ""} onKeyUp={watchCapsLock} onKeyDown={watchCapsLock} onBlur={() => setCapsLock(false)} />
        </Form.Item>
        <Form.Item name="remember" valuePropName="checked">
          <Checkbox>Remember my email on this device</Checkbox>
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          Log in
        </Button>
      </Form>
    </AuthCard>
  )
}
