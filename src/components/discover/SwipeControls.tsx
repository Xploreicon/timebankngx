import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Heart, Info, RotateCcw, Keyboard } from 'lucide-react'
import { motion } from 'framer-motion'

interface SwipeControlsProps {
  onPass: () => void
  onTrade: () => void
  onInfo: () => void
  onUndo?: () => void
  canUndo?: boolean
  disabled?: boolean
}

export const SwipeControls = ({
  onPass,
  onTrade,
  onInfo,
  onUndo,
  canUndo = false,
  disabled = false
}: SwipeControlsProps) => {
  return (
    <div className="py-6 space-y-3 text-center">
      <div className="flex items-center justify-center gap-4">
        {canUndo && onUndo && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full w-14 h-14 p-0 hover:bg-yellow-100"
              onClick={onUndo}
              disabled={disabled}
              aria-label="Undo last swipe"
            >
              <RotateCcw className="w-6 h-6 text-yellow-600" />
            </Button>
          </motion.div>
        )}

        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full w-16 h-16 p-0 border-2 border-red-500 hover:bg-red-50 shadow-lg transition-all"
            onClick={onPass}
            disabled={disabled}
            aria-label="Pass on this match"
          >
            <X className="w-8 h-8 text-red-500" />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full w-14 h-14 p-0 border-2 border-blue-500 hover:bg-blue-50 shadow-lg transition-all"
            onClick={onInfo}
            disabled={disabled}
            aria-label="See more details"
          >
            <Info className="w-6 h-6 text-blue-500" />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}>
          <Button
            size="lg"
            className="rounded-full w-16 h-16 p-0 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 shadow-lg transition-all"
            onClick={onTrade}
            disabled={disabled}
            aria-label="Propose a trade"
          >
            <Heart className="w-8 h-8 text-white fill-current" />
          </Button>
        </motion.div>
      </div>
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Keyboard className="w-4 h-4" />
        Use ← → arrows, ↑ for details, ↓ to undo
      </div>
    </div>
  )
}

export const useSwipeKeyboard = (
  {
    onPass,
    onTrade,
    onInfo,
    onUndo,
    disabled = false
  }: {
    onPass: () => void
    onTrade: () => void
    onInfo: () => void
    onUndo?: () => void
    disabled?: boolean
  }
) => {
  useEffect(() => {
    if (typeof window === 'undefined' || disabled) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (disabled) return
      switch (e.key) {
        case 'ArrowLeft':
          onPass()
          break
        case 'ArrowRight':
          onTrade()
          break
        case 'ArrowUp':
        case 'i':
        case 'I':
          onInfo()
          break
        case 'ArrowDown':
        case 'u':
        case 'U':
        case 'z':
        case 'Z':
          if (onUndo) onUndo()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [onPass, onTrade, onInfo, onUndo, disabled])
}
