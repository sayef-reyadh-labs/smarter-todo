// Last line of defence: a render error shows a friendly message and a reload button instead of a blank page.
import { Button, Result } from "antd"
import { Component, type ErrorInfo, type ReactNode } from "react"

type State = { failed: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <Result
        status="error"
        title="Something went wrong"
        subTitle="An unexpected error happened. Reloading usually fixes it."
        extra={
          <Button type="primary" onClick={() => window.location.assign("/")}>
            Reload the app
          </Button>
        }
      />
    )
  }
}
