import { App as AntApp, ConfigProvider, theme } from "antd"
import { BrowserRouter, Route, Routes } from "react-router"
import { useTheme } from "./context/ThemeContext"
import { AppLayout } from "./layouts/AppLayout"
import { AboutPage } from "./pages/AboutPage"
import { HomePage } from "./pages/HomePage"
import { TaskDetailsPage } from "./pages/TaskDetailsPage"

function App() {
  const { darkMode } = useTheme()

  return (
    <ConfigProvider theme={{ algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { borderRadius: 6 } }}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="tasks/:taskId" element={<TaskDetailsPage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}

export default App
