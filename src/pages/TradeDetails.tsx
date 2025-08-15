import Layout from '@/components/Layout'
import { useParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

export default function TradeDetails(){
  const { id } = useParams()
  const { trades, fetchTrades, addTradeMessage, user } = useAppStore()
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  const trade = useMemo(() => 
    trades.find(t => t.id === id), 
    [trades, id]
  )

  const sendMessage = async () => {
    if (!message.trim() || !trade) return
    
    setIsLoading(true)
    const { error } = await addTradeMessage(trade.id, { text: message })
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      })
    } else {
      setMessage('')
    }
    setIsLoading(false)
  }

  if (!trade) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Trade not found</h2>
          <p className="text-muted-foreground">The trade you're looking for doesn't exist.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <main className="grid lg:grid-cols-[1fr_300px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trade Communication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
              {/* Mock messages for now since we need to implement proper messaging */}
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-secondary rounded-lg p-3">
                  <p className="text-sm">Hello! I'm interested in this trade.</p>
                  <span className="text-xs text-muted-foreground">2 hours ago</span>
                </div>
              </div>
              
              <div className="flex items-start gap-3 justify-end">
                <div className="flex-1 bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%] ml-auto">
                  <p className="text-sm">Great! When can we start?</p>
                  <span className="text-xs opacity-80">1 hour ago</span>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Type your message..." 
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={isLoading || !message.trim()}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">Status</h4>
                <Badge variant="secondary" className="capitalize">
                  {trade.status}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-medium">Service Requested</h4>
                <p className="text-sm text-muted-foreground">
                  {trade.service_requested?.title || 'Service details'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Service Offered</h4>
                <p className="text-sm text-muted-foreground">
                  {trade.service_offered?.title || 'Service details'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Duration</h4>
                <p className="text-sm text-muted-foreground">
                  {trade.hours_requested || 1} hours requested
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </Layout>
  )
}