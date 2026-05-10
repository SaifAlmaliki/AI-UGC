'use client'

import { useState } from 'react'
import { Square, Smartphone, Layout, Monitor } from 'lucide-react'

const formats = [
  { id: 'single', name: 'Single', icon: Square, desc: '1:1 Square' },
  { id: 'story', name: 'Story/Reel', icon: Smartphone, desc: '9:16 Vertical' },
  { id: 'landscape', name: 'Landscape', icon: Layout, desc: '16:9 Wide' },
  { id: 'portrait', name: 'Portrait', icon: Monitor, desc: '4:5 High' },
]

export default function PostFormatSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const [selected, setSelected] = useState('single')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Post Format</label>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Aspect Ratio</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {formats.map((format) => {
          const Icon = format.icon
          const isSelected = selected === format.id

          return (
            <button
              key={format.id}
              onClick={() => {
                setSelected(format.id)
                onSelect(format.id)
              }}
              className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 group ${
                isSelected
                  ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                  : 'bg-muted border-border hover:border-primary/30 hover:bg-muted/80 dark:bg-white/5 dark:border-white/5 dark:hover:border-white/10 dark:hover:bg-white/10'
              }`}
            >
              <div className={`p-3 rounded-xl transition-colors ${
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground dark:bg-white/5 dark:text-slate-500 dark:group-hover:text-slate-300'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className={`text-xs font-bold ${isSelected ? 'text-foreground dark:text-white' : 'text-muted-foreground'}`}>
                  {format.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{format.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
