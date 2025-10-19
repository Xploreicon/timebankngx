import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MessageSquare, X, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface MatchNotificationProps {
  show: boolean
  userName: string
  userIcon: string
  matchScore: number
  tradeId?: string
  onClose: () => void
  onMessage?: () => void
}

export const MatchNotification = ({
  show,
  userName,
  userIcon,
  matchScore,
  tradeId,
  onClose,
  onMessage
}: MatchNotificationProps) => {
  const navigate = useNavigate()

  const handleViewTrade = () => {
    if (tradeId) {
      navigate(`/trades/${tradeId}`)
    } else {
      navigate('/trades')
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 100 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-4"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-purple-50 border-2 border-pink-200">
              {/* Close button */}
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 rounded-full"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Confetti/sparkles animation */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      opacity: 1,
                      scale: 0,
                      x: '50%',
                      y: '50%'
                    }}
                    animate={{
                      opacity: 0,
                      scale: 1,
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.05,
                      ease: "easeOut"
                    }}
                    className="absolute"
                  >
                    <Sparkles className={`w-4 h-4 ${i % 2 === 0 ? 'text-pink-400' : 'text-purple-400'}`} />
                  </motion.div>
                ))}
              </div>

              <div className="p-8 text-center relative">
                {/* Match badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mb-6"
                >
                  <div className="text-6xl mb-2">🎉</div>
                  <h2 className="text-3xl font-brand font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                    It's a Match!
                  </h2>
                </motion.div>

                {/* User icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="mb-4"
                >
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-5xl shadow-lg">
                    {userIcon}
                  </div>
                </motion.div>

                {/* User name */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-2"
                >
                  <p className="text-xl font-semibold text-gray-800">
                    {userName}
                  </p>
                </motion.div>

                {/* Match score */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <p className="text-sm text-muted-foreground">
                    🎯 {matchScore}% match • Perfect for trading!
                  </p>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-3"
                >
                  <Button
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    size="lg"
                    onClick={handleViewTrade}
                  >
                    View Trade Proposal
                  </Button>

                  {onMessage && (
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        onMessage()
                        onClose()
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={onClose}
                  >
                    Keep Swiping
                  </Button>
                </motion.div>

                {/* Success message */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4 text-xs text-muted-foreground"
                >
                  Trade proposal sent successfully! 🚀
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
