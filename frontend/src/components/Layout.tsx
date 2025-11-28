import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/store'
import { useUser, useClerk } from '@clerk/clerk-react'
import logo from '../assets/logo.png'
import { Toaster } from '@/components/ui/toaster'

export default function Layout() {
    const navigate = useNavigate()
    const { user: storeUser, logout: storeLogout } = useAuthStore()
    const { user: clerkUser, isLoaded } = useUser()
    const { signOut } = useClerk()

    const handleLogout = async () => {
        await signOut()
        storeLogout()
        navigate('/sign-in')
    }

    // Use Clerk user if available, otherwise fallback to store user (for legacy/dev support if needed)
    const displayName = clerkUser ? clerkUser.fullName : storeUser?.name
    const displayEmail = clerkUser ? clerkUser.primaryEmailAddress?.emailAddress : storeUser?.email

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 bg-white dark:bg-gray-800 shadow-lg" style={{ width: '180px' }}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <img src={logo} alt="Atomik Logo" className="w-7 h-7 object-contain" />
                            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Atomik</span>
                        </Link>
                    </div>

                    <nav className="flex-1 p-3 space-y-1">
                        <Link
                            to="/dashboard"
                            className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Dashboard
                        </Link>
                        <Link
                            to="/clients"
                            className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Clients
                        </Link>
                        <Link
                            to="/projects"
                            className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Projects
                        </Link>
                        <Link
                            to="/findings"
                            className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Findings
                        </Link>
                        <Link
                            to="/reports"
                            className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Reports
                        </Link>
                        <Link
                            to="/settings"
                            className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Settings
                        </Link>
                    </nav>

                    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="space-y-2">
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={displayName || ''}>
                                    {displayName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={displayEmail || ''}>
                                    {displayEmail}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-center"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="p-8" style={{ marginLeft: '180px' }}>
                <Outlet />
            </div>
            <Toaster />
        </div>
    )
}
