/**
 * Global state management with Zustand
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
    id: string
    email: string
    name: string
    role: string
    organization_id?: string
}

interface AuthState {
    user: User | null
    accessToken: string | null
    refreshToken: string | null
    deploymentMode: 'desktop' | 'docker'
    isAuthenticated: boolean
    setAuth: (user: User, accessToken: string, refreshToken: string) => void
    logout: () => void
    setDeploymentMode: (mode: 'desktop' | 'docker') => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            deploymentMode: 'docker', // Default to docker mode
            isAuthenticated: false,

            setAuth: (user, accessToken, refreshToken) => {
                localStorage.setItem('access_token', accessToken)
                localStorage.setItem('refresh_token', refreshToken)
                set({ user, accessToken, refreshToken, isAuthenticated: true })
            },

            logout: () => {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
            },

            setDeploymentMode: (mode) => {
                set({ deploymentMode: mode })
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                deploymentMode: state.deploymentMode,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)
