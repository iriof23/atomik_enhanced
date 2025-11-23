import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './lib/store'
import Login from './pages/Login'
import LicenseEntry from './pages/LicenseEntry'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Projects from './pages/Projects'
import Findings from './pages/Findings'
import ReportBuilder from './pages/ReportBuilder'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function App() {
    const { isAuthenticated, deploymentMode } = useAuthStore()

    return (
        <BrowserRouter>
            <Routes>
                {/* Authentication routes */}
                <Route
                    path="/login"
                    element={
                        deploymentMode === 'docker' ? (
                            isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
                        ) : (
                            <Navigate to="/license" />
                        )
                    }
                />
                <Route
                    path="/license"
                    element={
                        deploymentMode === 'desktop' ? (
                            isAuthenticated ? <Navigate to="/dashboard" /> : <LicenseEntry />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />

                {/* Protected routes */}
                <Route
                    path="/"
                    element={
                        isAuthenticated ? (
                            <Layout />
                        ) : (
                            <Navigate to={deploymentMode === 'docker' ? '/login' : '/license'} />
                        )
                    }
                >
                    <Route index element={<Navigate to="/dashboard" />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="findings" element={<Findings />} />
                    <Route path="reports" element={<ReportBuilder />} />
                    <Route path="settings" element={<Settings />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
