import { Button } from '@/components/ui/button'
import { Plus, Search, Handshake } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const QuickActionsBar = () => {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-3 gap-3">
      <Button onClick={() => navigate('/services')} className="bg-accent text-accent-foreground hover:opacity-90"> <Plus className="mr-2 h-4 w-4"/> Post Service</Button>
      <Button variant="secondary" onClick={() => navigate('/discover')}> <Search className="mr-2 h-4 w-4"/> Find Matches</Button>
      <Button variant="outline" onClick={() => navigate('/trades')}> <Handshake className="mr-2 h-4 w-4"/> New Trade</Button>
    </div>
  )
}
