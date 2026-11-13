// Signup form; a new account is logged in right away.
import { Button, Form, Input } from "antd"
import { useState } from "react"
import { Link, Navigate } from "react-router"
import { AuthCard } from "../../components/AuthCard"
import { useAuth } from "../../context/AuthContext"
import type { SignupInput } from "../../types/auth"
import { emailRules, nameRules, newPasswordRules } from "../../utils/authForm"

type SignupValues = SignupInput & { confirm: string }

export function SignupPage() {
  const { user, signup } = useAuth()
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleFinish = async ({ confirm: _confirm, ...values }: SignupValues) => {
    setError("")
    setSubmitting(true)
    try {
      await signup(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Sign up"
      subtitle="Create an account to keep your own tasks and join groups."
      error={error}
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item label="Name" name="name" rules={nameRules}>
          <Input size="large" autoComplete="name" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={emailRules}>
          <Input size="large" autoComplete="email" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={newPasswordRules} extra="At least 8 characters.">
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Confirm password"
          name="confirm"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Confirm your password" },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("Passwords do not match")),
            }),
          ]}
        >
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          Create account
        </Button>
      </Form>
    </AuthCard>
  )
}
