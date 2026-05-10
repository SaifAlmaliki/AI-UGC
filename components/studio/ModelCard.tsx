import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

interface Model {
  id: string
  name: string
  gender: string
  vibe_aesthetic: string
  portrait_image_url: string
  age_range: string
}

export function ModelCard({ model }: { model: Model }) {
  return (
    <div className="group relative bg-muted dark:bg-white/5 border border-border rounded-3xl overflow-hidden glass-dark hover:border-primary/50 transition-all duration-500 dark:border-white/10">
      {/* Image Section */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={model.portrait_image_url}
          alt={model.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
        
        {/* Floating Badge */}
        <div className="absolute top-4 right-4">
          <div className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">{model.vibe_aesthetic}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-foreground font-bold text-lg leading-tight group-hover:text-primary transition-colors dark:text-white">
          {model.name}
        </h3>
        
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{model.gender}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{model.age_range}</span>
        </div>

        <Link
          href={`/dashboard/create-post?modelId=${encodeURIComponent(model.id)}`}
          className="w-full mt-4 py-2 rounded-xl bg-muted hover:bg-primary border border-border hover:border-primary transition-all duration-300 flex items-center justify-center gap-2 group/btn dark:bg-white/5 dark:border-white/5"
        >
          <span className="text-xs font-bold text-foreground dark:text-white group-hover/btn:text-primary-foreground">Generate Post</span>
          <ArrowRight className="w-3.5 h-3.5 text-foreground dark:text-white group-hover/btn:text-primary-foreground group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
