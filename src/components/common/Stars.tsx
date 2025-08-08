import { Star } from 'lucide-react'

export const Stars = ({ score }: { score: number }) => {
  const stars = Math.round((score / 100) * 5)
  return (
    <div className="flex items-center gap-1 text-accent">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < stars ? 'fill-current' : ''}`} />
      ))}
    </div>
  )
}
