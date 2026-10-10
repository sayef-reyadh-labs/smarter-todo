import { App as AntApp, ConfigProvider, theme } from "antd"
import { useState } from "react"
import { BrowserRouter, Route, Routes } from "react-router"
import { AppLayout } from "./layouts/AppLayout"
import { AboutPage } from "./pages/AboutPage"
import { HomePage } from "./pages/HomePage"
import { TaskDetailsPage } from "./pages/TaskDetailsPage"

function App() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <ConfigProvider theme={{ algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { borderRadius: 6 } }}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout darkMode={darkMode} onToggleDark={() => setDarkMode((prev) => !prev)} />}>
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
