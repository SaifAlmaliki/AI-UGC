import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BRAND_NAME } from '@/lib/brand'
import {
  LayoutDashboard,
  Sparkles,
  Calendar,
  Users,
  Settings,
  LogOut,
  FilePlus,
  Menu,
} from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Models/Studio', href: '/dashboard/studio', icon: Sparkles },
    { name: 'Create Post', href: '/dashboard/create-post', icon: FilePlus },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Accounts', href: '/dashboard/accounts', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 border-r border-border glass">
        <div className="p-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.4)] shrink-0">
              <Sparkles className="text-primary-foreground w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground tracking-tight truncate">{BRAND_NAME}</h1>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Studio</p>
            </div>
          </div>
          <ThemeToggle className="h-9 w-9" />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/5 transition-all group"
            >
              <item.icon className="w-5 h-5 group-hover:text-primary transition-colors" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="glass-dark rounded-2xl p-4 border border-border dark:border-white/5 bg-muted dark:bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border dark:bg-slate-800 dark:border-white/10 shrink-0">
                <span className="text-foreground font-bold">{user.email?.[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-6 border-b border-border glass sticky top-0 z-50 gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary w-6 h-6" />
            <span className="font-bold text-foreground truncate">{BRAND_NAME}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle className="h-9 w-9" />
            <button type="button" className="text-muted-foreground p-2 rounded-lg hover:bg-muted" aria-label="Open menu">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
