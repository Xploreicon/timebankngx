import { useEffect, useState } from 'react'
import { Clock, FileText, Image as ImageIcon, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TimeLog {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  work_description: string
  progress_notes: string | null
  completion_percentage: number
  deliverable_urls: string[] | null
  screenshot_urls: string[] | null
  is_approved: boolean | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  profiles?: {
    display_name: string
    avatar_url: string | null
  }
}

interface TimeLogsListProps {
  tradeId: string
  currentUserId: string
  canApprove?: boolean
  onApprove?: (logId: string) => void
}

export function TimeLogsList({ tradeId, currentUserId, canApprove = false }: TimeLogsListProps) {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<TimeLog | null>(null)

  useEffect(() => {
    fetchTimeLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId])

  const fetchTimeLogs = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTimeLogs(data || [])
    } catch (error) {
      console.error('Error fetching time logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (logId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('time_logs')
        .update({
          is_approved: approved,
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
          rejection_reason: approved ? null : 'Not approved',
        })
        .eq('id', logId)

      if (error) throw error

      // Refresh logs
      fetchTimeLogs()
    } catch (error) {
      console.error('Error approving time log:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Work History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (timeLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Work History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No work has been logged yet</p>
        </CardContent>
      </Card>
    )
  }

  const totalMinutes = timeLogs
    .filter((log) => log.is_approved !== false)
    .reduce((sum, log) => sum + (log.duration_minutes || 0), 0)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Work History</CardTitle>
            <Badge variant="secondary">
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {timeLogs.map((log) => {
            const isOwnLog = log.user_id === currentUserId
            const needsApproval = canApprove && !isOwnLog && log.is_approved === null

            return (
              <div
                key={log.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {log.profiles?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {log.profiles?.display_name || 'Unknown User'}
                        {isOwnLog && <span className="text-muted-foreground ml-2">(You)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Approval Status */}
                  {log.is_approved === true && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {log.is_approved === false && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                  {log.is_approved === null && needsApproval && (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>

                {/* Work Description */}
                <p className="text-sm">{log.work_description}</p>

                {/* Time & Progress */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {log.duration_minutes
                        ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m`
                        : 'In progress'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Progress:</span>
                    <Progress value={log.completion_percentage} className="h-1 w-16" />
                    <span>{log.completion_percentage}%</span>
                  </div>
                </div>

                {/* Attachments */}
                {((log.deliverable_urls && log.deliverable_urls.length > 0) ||
                  (log.screenshot_urls && log.screenshot_urls.length > 0)) && (
                  <div className="flex items-center gap-2 text-xs">
                    {log.deliverable_urls && log.deliverable_urls.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {log.deliverable_urls.length} file(s)
                      </Badge>
                    )}
                    {log.screenshot_urls && log.screenshot_urls.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {log.screenshot_urls.length} image(s)
                      </Badge>
                    )}
                  </div>
                )}

                {/* Approval Actions */}
                {needsApproval && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApprove(log.id, true)
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApprove(log.id, false)
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Work Session Details</DialogTitle>
            <DialogDescription>
              {selectedLog && formatDistanceToNow(new Date(selectedLog.created_at), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Work Description</h4>
                <p className="text-sm">{selectedLog.work_description}</p>
              </div>

              {selectedLog.progress_notes && (
                <div>
                  <h4 className="font-medium mb-2">Progress Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedLog.progress_notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Duration</h4>
                  <p className="text-sm">
                    {selectedLog.duration_minutes
                      ? `${Math.floor(selectedLog.duration_minutes / 60)}h ${
                          selectedLog.duration_minutes % 60
                        }m`
                      : 'In progress'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Completion</h4>
                  <p className="text-sm">{selectedLog.completion_percentage}%</p>
                </div>
              </div>

              {selectedLog.deliverable_urls && selectedLog.deliverable_urls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Deliverables</h4>
                  <div className="space-y-2">
                    {selectedLog.deliverable_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        Deliverable {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.screenshot_urls && selectedLog.screenshot_urls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Screenshots</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedLog.screenshot_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-video rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                      >
                        <img src={url} alt={`Screenshot ${index + 1}`} className="object-cover w-full h-full" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
