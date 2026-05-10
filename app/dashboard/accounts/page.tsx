'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Video,
  Hash,
  Users,
  CircleCheck,
  X,
  CircleAlert,
  Loader,
  RefreshCw,
  ExternalLink,
  Trash2,
  Share2,
  CirclePlay,
  Bookmark,
  Music2,
  Plus
} from 'lucide-react'
import {
  getConnectedAccountsAction,
  getSocialConnectUrlAction,
  syncSocialAccountsAction,
  disconnectSocialAccountAction
} from '../../../lib/actions/social-accounts'

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Camera, color: 'from-purple-500 via-pink-500 to-orange-500' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'from-black to-slate-800' },
  { id: 'facebook', name: 'Facebook', icon: Users, color: 'from-blue-600 to-blue-400' },
  { id: 'pinterest', name: 'Pinterest', icon: Bookmark, color: 'from-red-600 to-red-400' },
  { id: 'twitter', name: 'X / Twitter', icon: Hash, color: 'from-slate-900 to-slate-800' },
  { id: 'youtube', name: 'YouTube', icon: Video, color: 'from-red-600 to-red-500' },
]

function AccountsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = async () => {
    setLoading(true)
    const accounts = await getConnectedAccountsAction()
    setConnectedAccounts(accounts)
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const status = searchParams.get('status')
      if (status === 'success') {
        setSyncing(true)
        await handleSync()
        setSyncing(false)
        // Clear search params
        router.replace('/dashboard/accounts')
      } else {
        await fetchAccounts()
      }
    }
    init()
  }, [searchParams])

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform)
    setError(null)
    const result = await getSocialConnectUrlAction(platform, window.location.origin)

    if (result.success && result.authUrl) {
      // Open in new tab or redirect
      window.location.href = result.authUrl
    } else {
      setError(result.error || 'Failed to get connection URL')
      setConnectingPlatform(null)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return

    setSyncing(true)
    const result = await disconnectSocialAccountAction(accountId)
    if (result.success) {
      await fetchAccounts()
    } else {
      setError(result.error || 'Failed to disconnect account')
    }
    setSyncing(false)
  }

  const handleSync = async () => {
    setSyncing(true)
    const result = await syncSocialAccountsAction()
    if (result.success) {
      await fetchAccounts()
    } else {
      setError(result.error || 'Failed to sync accounts')
    }
    setSyncing(false)
  }

  const getAccountsForPlatform = (platformId: string) => {
    return connectedAccounts.filter(acc => acc.platform.toLowerCase() === platformId.toLowerCase())
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Social Accounts</h1>
          <p className="text-muted-foreground mt-2">Connect and manage your social media presence for AI-automated posting.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted border border-border text-foreground hover:bg-muted/80 transition-all disabled:opacity-50 group dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
        >
          <RefreshCw className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Accounts'}
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3"
        >
          <CircleAlert className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:text-red-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLATFORMS.map((platform, index) => {
          const accounts = getAccountsForPlatform(platform.id)
          const isConnecting = connectingPlatform === platform.id

          return (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass rounded-3xl p-6 border border-border hover:border-primary/25 transition-all group relative overflow-hidden dark:border-white/10 dark:hover:border-white/20"
            >
              {/* Background Glow */}
              <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${platform.color} opacity-[0.03] blur-3xl group-hover:opacity-[0.08] transition-opacity`} />

              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.color} p-[1px]`}>
                  <div className="w-full h-full rounded-2xl bg-slate-950/80 flex items-center justify-center">
                    <platform.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                {accounts.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    <CircleCheck className="w-3 h-3" />
                    {accounts.length} Connected
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground dark:text-white">{platform.name}</h3>
                
                <div className="mt-4 space-y-3">
                  {accounts.map((account: any) => (
                    <div key={account.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted border border-border hover:bg-muted/80 transition-colors group/acc dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-secondary border border-border flex-shrink-0 dark:bg-slate-800 dark:border-white/10">
                        {account.account_image ? (
                          <img src={account.account_image} alt={account.account_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary-foreground font-bold text-xs">
                            {account.account_name?.[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate dark:text-white">{account.account_name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter">ID: {account.zernio_account_id.slice(0, 8)}...</p>
                      </div>
                      <button 
                        onClick={() => handleDisconnect(account.zernio_account_id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover/acc:opacity-100"
                        title="Disconnect"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {accounts.length === 0 && (
                    <p className="text-sm text-slate-500">No accounts connected yet.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/60 dark:border-white/5">
                <button
                  onClick={() => handleConnect(platform.id)}
                  disabled={isConnecting || loading}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                    accounts.length > 0 
                      ? 'bg-muted border border-border text-foreground hover:bg-muted/80 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10' 
                      : 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:opacity-90'
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {accounts.length > 0 ? 'Add Another' : 'Connect Account'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Info Card */}
      <div className="glass rounded-3xl p-8 border border-border bg-gradient-to-br from-muted/50 to-transparent relative overflow-hidden dark:border-white/10 dark:from-white/5">
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-foreground mb-4 dark:text-white">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
              <h3 className="font-bold text-foreground text-sm dark:text-white">Choose Platform</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Select the social media platform you want to connect to your profile.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
              <h3 className="font-bold text-foreground text-sm dark:text-white">Authorize Zernio</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">You will be redirected to the platform's official site to authorize the connection safely.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
              <h3 className="font-bold text-foreground text-sm dark:text-white">Automate & Scale</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Once connected, you can schedule AI-generated posts to multiple accounts at once.</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-0" />
      </div>
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <AccountsContent />
    </Suspense>
  )
}
