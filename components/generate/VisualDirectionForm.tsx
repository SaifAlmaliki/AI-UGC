'use client'

import { useState } from 'react'
import { Image as ImageIcon, Shirt, Sun, Package } from 'lucide-react'

const scenes = ['Urban', 'Studio', 'Nature', 'Beach', 'Home', 'Abstract']
const outfits = ['Casual', 'Formal', 'Streetwear', 'Luxury', 'Activewear', 'Boho']
const lightings = ['Golden Hour', 'Soft Studio', 'Neon Night', 'High Contrast', 'Natural Light']
const propsOptions = ['Coffee Cup', 'Smartphone', 'Handbag', 'Sunglasses', 'Laptop', 'Flowers']

export default function VisualDirectionForm({ onChange }: { onChange: (data: any) => void }) {
  const [formData, setFormData] = useState({
    scene: 'Studio',
    outfit: 'Casual',
    lighting: 'Soft Studio',
    props: [] as string[]
  })

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onChange(newData)
  }

  const toggleProp = (prop: string) => {
    const newProps = formData.props.includes(prop)
      ? formData.props.filter(p => p !== prop)
      : [...formData.props, prop]
    handleChange('props', newProps)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Visual Direction</label>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Art Direction</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">
          <ImageIcon className="w-3 h-3 text-primary" />
          Scene / Location
        </div>
        <div className="flex flex-wrap gap-2">
          {scenes.map((scene) => (
            <button
              key={scene}
              onClick={() => handleChange('scene', scene)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 border ${
                formData.scene === scene
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-muted border-border text-muted-foreground hover:border-primary/25 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20'
              }`}
            >
              {scene}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">
            <Shirt className="w-3 h-3 text-primary" />
            Outfit Mood
          </div>
          <select
            className="w-full bg-muted dark:bg-white/5 border border-border dark:border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
            value={formData.outfit}
            onChange={(e) => handleChange('outfit', e.target.value)}
          >
            {outfits.map(o => <option key={o} value={o} className="bg-card text-foreground">{o}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">
            <Sun className="w-3 h-3 text-primary" />
            Lighting Style
          </div>
          <select
            className="w-full bg-muted dark:bg-white/5 border border-border dark:border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
            value={formData.lighting}
            onChange={(e) => handleChange('lighting', e.target.value)}
          >
            {lightings.map(l => <option key={l} value={l} className="bg-card text-foreground">{l}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">
          <Package className="w-3 h-3 text-primary" />
          Props (Multi-select)
        </div>
        <div className="flex flex-wrap gap-2">
          {propsOptions.map((prop) => (
            <button
              key={prop}
              onClick={() => toggleProp(prop)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 border ${
                formData.props.includes(prop)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted border-border text-muted-foreground hover:border-primary/25 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20'
              }`}
            >
              {prop}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
