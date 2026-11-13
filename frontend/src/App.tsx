// Routes and the Ant Design theme; every page renders inside AppLayout, and the task and profile pages need a login.
import { App as AntApp, ConfigProvider, theme } from "antd"
import { BrowserRouter, Route, Routes } from "react-router"
import { AdminRoute } from "./components/AdminRoute"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { useTheme } from "./context/ThemeContext"
import { AppLayout } from "./layouts/AppLayout"
import { AboutPage } from "./pages/AboutPage"
import { AdminPage } from "./pages/AdminPage"
import { GroupDetailPage } from "./pages/GroupDetailPage"
import { GroupsPage } from "./pages/GroupsPage"
import { HomePage } from "./pages/HomePage"
import { LoginPage } from "./pages/LoginPage"
import { NotFoundPage } from "./pages/NotFoundPage"
import { ProfilePage } from "./pages/ProfilePage"
import { SignupPage } from "./pages/SignupPage"
import { TaskDetailsPage } from "./pages/TaskDetailsPage"

function App() {
  const { darkMode } = useTheme()

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: "#4f46e5", colorInfo: "#4f46e5", colorLink: darkMode ? "#818cf8" : "#4f46e5", borderRadius: 8, fontSize: 15 },
        components: { Layout: { headerHeight: 60 } },
      }}
    >
      <AntApp>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="signup" element={<SignupPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route index element={<HomePage />} />
                  <Route path="tasks/:taskId" element={<TaskDetailsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="groups" element={<GroupsPage />} />
                  <Route path="groups/:groupId" element={<GroupDetailPage />} />
                  <Route element={<AdminRoute />}>
                    <Route path="admin" element={<AdminPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  )
}

export default App
