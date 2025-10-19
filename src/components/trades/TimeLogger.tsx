import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Progress } from '@/components/ui/progress'

interface TimeLoggerProps {
  tradeId: string
  userId: string
  onLogCreated?: () => void
}

export function TimeLogger({ tradeId, userId, onLogCreated }: TimeLoggerProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [workDescription, setWorkDescription] = useState('')
  const [progressNotes, setProgressNotes] = useState('')
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [deliverableFiles, setDeliverableFiles] = useState<File[]>([])
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const startTimeRef = useRef<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pausedTimeRef = useRef(0)

  useEffect(() => {
    if (isTracking && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isTracking, isPaused])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    if (!workDescription.trim()) {
      toast({
        variant: 'destructive',
        title: 'Work Description Required',
        description: 'Please describe what you\'ll be working on',
      })
      return
    }

    startTimeRef.current = new Date()
    setIsTracking(true)
    setIsPaused(false)
    setElapsedSeconds(0)
    pausedTimeRef.current = 0
  }

  const handlePause = () => {
    setIsPaused(true)
    pausedTimeRef.current = elapsedSeconds
  }

  const handleResume = () => {
    setIsPaused(false)
  }

  const uploadFiles = async (files: File[], bucketName: string): Promise<string[]> => {
    const urls: string[] = []

    for (const file of files) {
      const fileName = `${tradeId}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file)

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName)

      urls.push(urlData.publicUrl)
    }

    return urls
  }

  const handleStop = async () => {
    if (!startTimeRef.current) return

    setIsSaving(true)

    try {
      const endTime = new Date()
      const durationMinutes = Math.floor(elapsedSeconds / 60)

      // Upload files if any
      let deliverableUrls: string[] = []
      let screenshotUrls: string[] = []

      if (deliverableFiles.length > 0) {
        deliverableUrls = await uploadFiles(deliverableFiles, 'trade-attachments')
      }

      if (screenshotFiles.length > 0) {
        screenshotUrls = await uploadFiles(screenshotFiles, 'trade-attachments')
      }

      // Create time log
      const { error } = await supabase
        .from('time_logs')
        .insert({
          trade_id: tradeId,
          user_id: userId,
          started_at: startTimeRef.current.toISOString(),
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          work_description: workDescription,
          progress_notes: progressNotes || null,
          completion_percentage: completionPercentage,
          deliverable_urls: deliverableUrls.length > 0 ? deliverableUrls : null,
          screenshot_urls: screenshotUrls.length > 0 ? screenshotUrls : null,
        })

      if (error) throw error

      toast({
        title: 'Time Log Saved',
        description: `Logged ${durationMinutes} minutes of work`,
      })

      // Reset form
      setIsTracking(false)
      setIsPaused(false)
      setElapsedSeconds(0)
      setWorkDescription('')
      setProgressNotes('')
      setCompletionPercentage(0)
      setDeliverableFiles([])
      setScreenshotFiles([])
      startTimeRef.current = null
      pausedTimeRef.current = 0

      if (onLogCreated) {
        onLogCreated()
      }
    } catch (error) {
      console.error('Error saving time log:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save time log',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Time Logger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="flex items-center justify-center">
          <div className="text-4xl font-mono font-bold text-primary">
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {isTracking && (
            <Badge variant={isPaused ? 'secondary' : 'default'}>
              {isPaused ? 'Paused' : 'In Progress'}
            </Badge>
          )}
        </div>

        {/* Work Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">What are you working on?</label>
          <Textarea
            placeholder="Describe the work you're doing..."
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            disabled={isTracking}
            rows={3}
          />
        </div>

        {/* Progress Notes (shown when tracking) */}
        {isTracking && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Progress Notes (Optional)</label>
              <Textarea
                placeholder="Any updates or challenges encountered..."
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Completion Percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Completion Progress</label>
                <span className="text-sm font-medium text-primary">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={completionPercentage}
                onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="deliverables" className="text-sm font-medium cursor-pointer">
                  <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="text-xs">Upload Deliverables</span>
                  </div>
                </label>
                <input
                  id="deliverables"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setDeliverableFiles(Array.from(e.target.files || []))}
                />
                {deliverableFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {deliverableFiles.length} file(s) selected
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="screenshots" className="text-sm font-medium cursor-pointer">
                  <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-xs">Add Screenshots</span>
                  </div>
                </label>
                <input
                  id="screenshots"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setScreenshotFiles(Array.from(e.target.files || []))}
                />
                {screenshotFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {screenshotFiles.length} image(s) selected
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button onClick={handleStart} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Start Timer
            </Button>
          ) : (
            <>
              {!isPaused ? (
                <Button onClick={handlePause} variant="secondary" className="flex-1">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button onClick={handleResume} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button
                onClick={handleStop}
                variant="destructive"
                className="flex-1"
                disabled={isSaving}
              >
                <Square className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Stop & Save'}
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Track your work time accurately to build trust and ensure fair credit exchange
        </p>
      </CardContent>
    </Card>
  )
}
