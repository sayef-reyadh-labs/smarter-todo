import { Layout, Menu, Switch, Typography } from "antd"
import { Link, Outlet, useLocation } from "react-router"

type Props = {
  darkMode: boolean
  onToggleDark: () => void
}

export function AppLayout({ darkMode, onToggleDark }: Props) {
  const { pathname } = useLocation()

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Typography.Text strong style={{ fontSize: 18, color: "white" }}>
          Smarter Todo
        </Typography.Text>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[pathname === "/about" ? "about" : "home"]}
          style={{ flex: 1, minWidth: 0 }}
          items={[
            { key: "home", label: <Link to="/">Home</Link> },
            { key: "about", label: <Link to="/about">About</Link> },
          ]}
        />
        <Switch checked={darkMode} onChange={onToggleDark} checkedChildren="Dark" unCheckedChildren="Light" />
      </Layout.Header>
      <Layout.Content style={{ maxWidth: 720, width: "100%", margin: "0 auto", padding: "32px 16px" }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
