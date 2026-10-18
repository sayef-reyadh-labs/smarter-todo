// Routes and the Ant Design theme; every page renders inside AppLayout, and the task and profile pages need a login.
import { App as AntApp, ConfigProvider, theme } from "antd"
import { BrowserRouter, Route, Routes } from "react-router"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { useTheme } from "./context/ThemeContext"
import { AppLayout } from "./layouts/AppLayout"
import { AboutPage } from "./pages/AboutPage"
import { HomePage } from "./pages/HomePage"
import { LoginPage } from "./pages/LoginPage"
import { ProfilePage } from "./pages/ProfilePage"
import { SignupPage } from "./pages/SignupPage"
import { TaskDetailsPage } from "./pages/TaskDetailsPage"

function App() {
  const { darkMode } = useTheme()

  return (
    <ConfigProvider theme={{ algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { borderRadius: 6 } }}>
      <AntApp>
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
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}

export default App
