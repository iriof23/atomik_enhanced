import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
    UserProfile, 
    OrganizationProfile, 
    useOrganization, 
    useOrganizationList 
} from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users, User, CreditCard, Plus, Palette, Bell, Shield, ChevronRight, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import BillingSettings from '@/components/settings/BillingSettings'

export default function Settings() {
    const { organization } = useOrganization()
    const { createOrganization } = useOrganizationList()
    const [searchParams, setSearchParams] = useSearchParams()
    
    // Initialize activeTab from URL query parameter, default to 'account'
    const [activeTab, setActiveTab] = useState<'account' | 'team' | 'billing' | 'preferences'>(
        (searchParams.get('tab') as 'account' | 'team' | 'billing' | 'preferences') || 'account'
    )

    // Sync activeTab changes to URL query parameter
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam !== activeTab) {
            const newSearchParams = new URLSearchParams(searchParams)
            if (activeTab === 'account') {
                // Remove tab param for default tab (cleaner URL)
                newSearchParams.delete('tab')
            } else {
                newSearchParams.set('tab', activeTab)
            }
            setSearchParams(newSearchParams, { replace: true })
        }
    }, [activeTab, searchParams, setSearchParams])

    // Listen for URL changes (browser back/forward)
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && ['account', 'team', 'billing', 'preferences'].includes(tabParam)) {
            setActiveTab(tabParam as 'account' | 'team' | 'billing' | 'preferences')
        } else if (!tabParam) {
            setActiveTab('account')
        }
    }, [searchParams])

    // Navigation Items
    const navItems = [
        { id: 'account', label: 'Account', icon: User, description: 'Profile & security' },
        { id: 'team', label: 'Team', icon: Users, description: 'Members & roles' },
        { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Plans & credits' },
        { id: 'preferences', label: 'Preferences', icon: Palette, description: 'App settings' },
    ] as const

    // Create Organization Handler
    const handleCreateOrg = () => {
        createOrganization?.({ name: "My Organization" })
    }

    // Content Renderer
    const renderContent = () => {
        switch (activeTab) {
            case 'account':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Account Settings</h2>
                            <p className="text-sm text-slate-500 mt-1">Manage your profile, email, and security settings</p>
                        </div>
                        <UserProfile 
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    card: "w-full shadow-none border border-slate-200 bg-white rounded-xl",
                                    navbar: "hidden",
                                    navbarMobileMenuButton: "hidden",
                                    headerTitle: "hidden",
                                    headerSubtitle: "hidden",
                                    pageScrollBox: "p-0",
                                    page: "p-6",
                                    profileSectionTitle: "text-slate-900 font-semibold text-sm",
                                    profileSectionSubtitle: "text-slate-500 text-sm",
                                    formFieldLabel: "text-slate-700 font-medium text-sm",
                                    formFieldInput: "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg text-sm",
                                    formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm",
                                }
                            }}
                        />
                    </div>
                )
            case 'team':
                if (!organization) {
                    return (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Team Management</h2>
                                <p className="text-sm text-slate-500 mt-1">Invite team members and manage roles</p>
                            </div>
                            <Card className="w-full bg-white border-slate-200">
                                <CardContent className="py-16 px-8">
                                    <div className="text-center max-w-md mx-auto">
                                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                            <Building2 className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Create Your Organization</h3>
                                        <p className="text-sm text-slate-500 mb-8">
                                            Set up an organization to collaborate with your team, share findings, and manage client access together.
                                        </p>
                                        <Button 
                                            size="lg" 
                                            onClick={handleCreateOrg}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2"
                                        >
                                            <Plus className="w-4 h-4 shrink-0" /> <span>Create Organization</span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                }
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Team Management</h2>
                            <p className="text-sm text-slate-500 mt-1">Invite team members and manage roles</p>
                        </div>
                        <OrganizationProfile 
                            routing="hash"
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    card: "w-full bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden",
                                    navbar: "bg-slate-50 border-r border-slate-200",
                                    navbarButton: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm",
                                    navbarButtonActive: "text-slate-900 bg-slate-100",
                                    headerTitle: "text-slate-900 text-sm",
                                    headerSubtitle: "text-slate-500 text-sm",
                                    scrollBox: "bg-white",
                                    formFieldLabel: "text-slate-700 font-medium text-sm",
                                    formFieldInput: "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg text-sm",
                                    formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm",
                                }
                            }}
                        />
                    </div>
                )
            case 'billing':
                return <BillingSettings />
            case 'preferences':
                 return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Preferences</h2>
                            <p className="text-sm text-slate-500 mt-1">Customize your workspace and application settings</p>
                        </div>

                        <div className="space-y-3">
                            {/* Appearance */}
                            <Card className="bg-white border-slate-200 hover:shadow-card-hover transition-shadow">
                                <CardContent className="p-0">
                                    <button className="w-full flex items-center justify-between p-4 text-left">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-slate-100 rounded-xl">
                                                <Palette className="w-5 h-5 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-slate-900">Appearance</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Theme and display settings</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                                                Light
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </button>
                                    <div className="px-4 pb-4 pt-0">
                                        <p className="text-xs text-slate-500 ml-14">
                                            The application is optimized for light mode. Dark mode support coming soon.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notifications */}
                            <Card className="bg-white border-slate-200 hover:shadow-card-hover transition-shadow">
                                <CardContent className="p-0">
                                    <button className="w-full flex items-center justify-between p-4 text-left">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-emerald-100 rounded-xl">
                                                <Bell className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-slate-900">Notifications</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Email and in-app alerts</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-medium">
                                                Enabled
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </button>
                                    <div className="px-4 pb-4 pt-0">
                                        <p className="text-xs text-slate-500 ml-14">
                                            Receive notifications for report updates, team activity, and security alerts.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Security */}
                            <Card className="bg-white border-slate-200 hover:shadow-card-hover transition-shadow">
                                <CardContent className="p-0">
                                    <button className="w-full flex items-center justify-between p-4 text-left">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-emerald-100 rounded-xl">
                                                <Shield className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-slate-900">Security</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Two-factor authentication</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                                                Configure
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </button>
                                    <div className="px-4 pb-4 pt-0">
                                        <p className="text-xs text-slate-500 ml-14">
                                            Enhance your account security with two-factor authentication. Managed in Account settings.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Info Banner */}
                        <div className="flex items-start gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                            <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <Palette className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">More Customization Coming Soon</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    We're working on additional preferences including keyboard shortcuts, default views, and export settings.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage your account, team, billing, and preferences
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Sidebar Navigation */}
                <Card className="w-full lg:w-72 shrink-0 border-slate-200 bg-white">
                    <CardContent className="p-3">
                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = activeTab === item.id
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-all",
                                            isActive 
                                                ? "bg-emerald-50 text-emerald-700" 
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            isActive ? "bg-emerald-100" : "bg-slate-100"
                                        )}>
                                            <Icon className={cn(
                                                "w-4 h-4",
                                                isActive ? "text-emerald-600" : "text-slate-500"
                                            )} />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className={cn(
                                                "font-medium text-sm",
                                                isActive ? "text-emerald-700" : "text-slate-900"
                                            )}>
                                                {item.label}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">{item.description}</div>
                                        </div>
                                        {isActive && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        )}
                                    </button>
                                )
                            })}
                        </nav>
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                <div className="flex-1 w-full min-w-0">
                    {renderContent()}
                </div>
            </div>
        </div>
    )
}