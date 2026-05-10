'use client'

import { useState } from 'react'
import { Camera, Music, Globe, Users, Pin, Share2, Plus, ExternalLink, Loader2 } from 'lucide-react'
import { getSocialConnectUrlAction } from '@/lib/actions/social-accounts'

const ALL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Camera, color: 'hover:text-pink-500', brandColor: 'from-purple-500 via-pink-500 to-orange-500' },
  { id: 'tiktok', name: 'TikTok', icon: Music, color: 'hover:text-cyan-400', brandColor: 'from-black to-slate-800' },
  { id: 'twitter', name: 'X / Twitter', icon: Globe, color: 'hover:text-blue-400', brandColor: 'from-slate-900 to-slate-800' },
  { id: 'linkedin', name: 'LinkedIn', icon: Users, color: 'hover:text-blue-600', brandColor: 'from-blue-700 to-blue-500' },
  { id: 'pinterest', name: 'Pinterest', icon: Pin, color: 'hover:text-red-500', brandColor: 'from-red-600 to-red-400' },
  { id: 'facebook', name: 'Facebook', icon: Share2, color: 'hover:text-blue-500', brandColor: 'from-blue-600 to-blue-400' },
]

interface PlatformTabsProps {
  onSelect: (ids: string[]) => void
  connectedAccounts: any[]
}

export default function PlatformTabs({ onSelect, connectedAccounts }: PlatformTabsProps) {
  const [selected, setSelected] = useState<string[]>(['instagram'])
  const [connecting, setConnecting] = useState<string | null>(null)

  const isConnected = (platformId: string) => {
    return connectedAccounts.some(acc => acc.platform.toLowerCase() === platformId.toLowerCase())
  }

  const handleSelect = (id: string) => {
    let nextSelected: string[]
    if (selected.includes(id)) {
      // Don't deselect if it's the last one
      if (selected.length === 1) return
      nextSelected = selected.filter(p => p !== id)
    } else {
      nextSelected = [...selected, id]
    }
    setSelected(nextSelected)
    onSelect(nextSelected)
  }

  const handleConnect = async (platform: string) => {
    setConnecting(platform)
    const result = await getSocialConnectUrlAction(platform, window.location.origin)
    if (result.success && result.authUrl) {
      window.location.href = result.authUrl
    } else {
      setConnecting(null)
      alert(result.error || 'Failed to get connection URL')
    }
  }

  const connectedPlatforms = ALL_PLATFORMS.filter(p => isConnected(p.id))
  const otherPlatforms = ALL_PLATFORMS.filter(p => !isConnected(p.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Select Platforms</label>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Multi-Select Active</span>
      </div>

      <div className="space-y-6">
        {/* Connected Platforms */}
        {connectedPlatforms.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-emerald-500/80 ml-1">Connected Accounts</h4>
            <div className="flex flex-wrap gap-3">
              {connectedPlatforms.map((platform) => {
                const Icon = platform.icon
                const isSelected = selected.includes(platform.id)

                return (
                  <button
                    key={platform.id}
                    onClick={() => handleSelect(platform.id)}
                    className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-300 group ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-foreground shadow-[0_0_20px_rgba(14,165,233,0.12)] dark:text-white dark:shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:border-primary/20 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 dark:hover:border-white/20'
                    }`}
                  >
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${platform.brandColor} ${isSelected ? 'opacity-100' : 'opacity-40 grayscale'} transition-all`}>
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className={`text-xs font-bold ${isSelected ? 'text-foreground dark:text-white' : 'text-muted-foreground'}`}>
                      {platform.name}
                    </span>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Other Platforms */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">
            {connectedPlatforms.length > 0 ? 'Connect More Platforms' : 'Available Platforms'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {otherPlatforms.map((platform) => {
              const Icon = platform.icon
              const isSelected = selected.includes(platform.id)
              const isConnecting = connecting === platform.id

              const rowClass = `flex w-full items-center gap-2 rounded-xl border transition-all duration-300 ${
                isSelected
                  ? 'bg-primary/10 border-primary/40 text-foreground dark:bg-white/10 dark:border-white/20 dark:text-white'
                  : 'bg-muted border-border text-muted-foreground hover:bg-muted/80 dark:bg-white/5 dark:border-white/5 dark:text-slate-500 dark:hover:bg-white/[0.08]'
              }`

              return (
                <div key={platform.id} className="relative group">
                  <div className={`${rowClass} overflow-hidden`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(platform.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary dark:text-white' : 'text-muted-foreground dark:text-slate-600'}`} />
                      <span className="text-[11px] font-medium">{platform.name}</span>
                    </button>
                    {isSelected && !isConnecting && (
                      <button
                        type="button"
                        onClick={() => handleConnect(platform.id)}
                        className="shrink-0 p-1.5 mr-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                        title="Connect Account"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    {isConnecting && (
                      <Loader2 className="shrink-0 w-3 h-3 mr-3 animate-spin text-primary" aria-hidden />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground italic ml-1">* Select multiple to post to all networks at once.</p>
        </div>
      </div>
    </div>
  )
}
