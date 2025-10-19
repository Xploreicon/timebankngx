import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface Message {
  id: string
  trade_id: string
  sender_id: string
  message_text: string
  message_type: 'text' | 'image' | 'file' | 'system'
  attachment_urls: string[] | null
  is_read: boolean
  is_system_message: boolean
  created_at: string
  sender?: {
    id: string
    display_name: string
    avatar_url: string | null
  }
}

interface TradeMessagingProps {
  tradeId: string
  currentUserId: string
  otherPartyId: string
  otherPartyName?: string
  otherPartyAvatar?: string | null
}

export function TradeMessaging({
  tradeId,
  currentUserId,
  otherPartyId,
  otherPartyName = 'User',
  otherPartyAvatar,
}: TradeMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages()

    // Mark messages as read
    markMessagesAsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId])

  // Subscribe to real-time message updates
  useEffect(() => {
    const channel = supabase
      .channel(`trade_messages:${tradeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_messages',
          filter: `trade_id=eq.${tradeId}`,
        },
        async (payload) => {
          // Fetch the new message with sender info
          const { data, error } = await supabase
            .from('trade_messages')
            .select(`
              *,
              sender:sender_id (
                id,
                display_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (!error && data) {
            setMessages((prev) => [...prev, data as Message])

            // Mark as read if not sent by current user
            if (data.sender_id !== currentUserId) {
              markMessageAsRead(data.id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tradeId, currentUserId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchMessages = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('trade_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages((data || []) as Message[])
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load messages',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('trade_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('trade_id', tradeId)
        .eq('is_read', false)
        .neq('sender_id', currentUserId)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('trade_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId)
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const uploadAttachments = async (files: File[]): Promise<string[]> => {
    const urls: string[] = []

    for (const file of files) {
      const fileName = `${tradeId}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from('trade-attachments')
        .upload(fileName, file)

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trade-attachments')
        .getPublicUrl(fileName)

      urls.push(urlData.publicUrl)
    }

    return urls
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachmentFiles.length === 0) return

    setIsSending(true)

    try {
      let attachmentUrls: string[] = []

      // Upload attachments if any
      if (attachmentFiles.length > 0) {
        attachmentUrls = await uploadAttachments(attachmentFiles)
      }

      // Determine message type
      const messageType = attachmentUrls.some((url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url))
        ? 'image'
        : attachmentUrls.length > 0
        ? 'file'
        : 'text'

      // Insert message
      const { error } = await supabase
        .from('trade_messages')
        .insert({
          trade_id: tradeId,
          sender_id: currentUserId,
          message_text: newMessage.trim() || '(Attachment)',
          message_type: messageType,
          attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null,
          is_system_message: false,
        })

      if (error) throw error

      // Reset form
      setNewMessage('')
      setAttachmentFiles([])
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + attachmentFiles.length > 5) {
      toast({
        variant: 'destructive',
        title: 'Too Many Files',
        description: 'You can only attach up to 5 files per message',
      })
      return
    }
    setAttachmentFiles([...attachmentFiles, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachmentFiles(attachmentFiles.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages List */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUserId
              const isSystemMessage = message.is_system_message

              if (isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <Badge variant="secondary" className="text-xs">
                      {message.message_text}
                    </Badge>
                  </div>
                )
              }

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${isOwnMessage ? 'justify-end' : ''}`}
                >
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender?.avatar_url || otherPartyAvatar || ''} />
                      <AvatarFallback>
                        {message.sender?.display_name?.charAt(0) || otherPartyName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`flex-1 max-w-[70%] ${
                      isOwnMessage ? 'ml-auto' : ''
                    }`}
                  >
                    <div
                      className={`rounded-lg p-3 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>

                      {/* Attachments */}
                      {message.attachment_urls && message.attachment_urls.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachment_urls.map((url, index) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)

                            if (isImage) {
                              return (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={url}
                                    alt={`Attachment ${index + 1}`}
                                    className="rounded max-w-full h-auto"
                                  />
                                </a>
                              )
                            }

                            return (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm underline"
                              >
                                <Paperclip className="h-3 w-3" />
                                Attachment {index + 1}
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <p
                      className={`text-xs text-muted-foreground mt-1 ${
                        isOwnMessage ? 'text-right' : ''
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      {isOwnMessage && message.is_read && <span className="ml-2">✓✓</span>}
                    </p>
                  </div>

                  {isOwnMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Attachment Preview */}
      {attachmentFiles.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {attachmentFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  <span className="text-xs max-w-[150px] truncate">{file.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isSending}
            className="flex-1"
          />

          <Button onClick={handleSendMessage} disabled={isSending || (!newMessage.trim() && attachmentFiles.length === 0)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
