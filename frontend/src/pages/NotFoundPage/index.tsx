// Shown for any address that matches no page.
import { Button, Result } from "antd"
import { Link } from "react-router"

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Page not found"
      subTitle="The page you are looking for does not exist or was moved."
      extra={
        <Link to="/">
          <Button type="primary">Back to home</Button>
        </Link>
      }
    />
  )
}
