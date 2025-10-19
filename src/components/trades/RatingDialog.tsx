import { useState } from 'react'
import { Star, ThumbsUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface RatingDialogProps {
  isOpen: boolean
  onClose: () => void
  tradeId: string
  reviewerId: string
  revieweeId: string
  revieweeName: string
  serviceId?: string
  onReviewSubmitted?: () => void
}

interface RatingDimension {
  key: string
  label: string
  description: string
}

const ratingDimensions: RatingDimension[] = [
  {
    key: 'communication',
    label: 'Communication',
    description: 'How well did they communicate throughout the trade?',
  },
  {
    key: 'quality',
    label: 'Quality',
    description: 'What was the quality of work delivered?',
  },
  {
    key: 'timeliness',
    label: 'Timeliness',
    description: 'Did they meet deadlines and deliver on time?',
  },
  {
    key: 'professionalism',
    label: 'Professionalism',
    description: 'How professional was their conduct?',
  },
]

export function RatingDialog({
  isOpen,
  onClose,
  tradeId,
  reviewerId,
  revieweeId,
  revieweeName,
  serviceId,
  onReviewSubmitted,
}: RatingDialogProps) {
  const [overallRating, setOverallRating] = useState(5)
  const [communicationRating, setCommunicationRating] = useState(5)
  const [qualityRating, setQualityRating] = useState(5)
  const [timelinessRating, setTimelinessRating] = useState(5)
  const [professionalismRating, setProfessionalismRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState(true)
  const [workLocation, setWorkLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const ratingStateMap: Record<string, [number, (value: number) => void]> = {
    communication: [communicationRating, setCommunicationRating],
    quality: [qualityRating, setQualityRating],
    timeliness: [timelinessRating, setTimelinessRating],
    professionalism: [professionalismRating, setProfessionalismRating],
  }

  const handleStarClick = (ratingKey: string, value: number) => {
    if (ratingKey === 'overall') {
      setOverallRating(value)
    } else {
      const [, setter] = ratingStateMap[ratingKey]
      setter(value)
    }
  }

  const renderStars = (ratingKey: string, currentRating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(ratingKey, star)}
            className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= currentRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  const handleSubmit = async () => {
    // Validation
    if (!reviewTitle.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title Required',
        description: 'Please provide a title for your review',
      })
      return
    }

    if (reviewTitle.length < 5 || reviewTitle.length > 100) {
      toast({
        variant: 'destructive',
        title: 'Invalid Title',
        description: 'Title must be between 5 and 100 characters',
      })
      return
    }

    if (!reviewText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Review Required',
        description: 'Please write your review',
      })
      return
    }

    if (reviewText.length < 10 || reviewText.length > 1000) {
      toast({
        variant: 'destructive',
        title: 'Invalid Review',
        description: 'Review must be between 10 and 1000 characters',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('reviews').insert({
        trade_id: tradeId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        service_id: serviceId || null,
        overall_rating: overallRating,
        communication_rating: communicationRating,
        quality_rating: qualityRating,
        timeliness_rating: timelinessRating,
        professionalism_rating: professionalismRating,
        review_title: reviewTitle.trim(),
        review_text: reviewText.trim(),
        would_recommend: wouldRecommend,
        work_location: workLocation.trim() || null,
        language_used: 'english',
        is_verified: false,
      })

      if (error) throw error

      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!',
      })

      // Update trust score (this should ideally be done via a database trigger)
      // For now, we'll calculate a simple average
      const avgRating = (
        (overallRating +
          communicationRating +
          qualityRating +
          timelinessRating +
          professionalismRating) /
        5
      ).toFixed(1)

      // Update reviewee's trust score
      // This is a simplified version - should be more sophisticated
      await supabase.rpc('update_user_trust_score', {
        user_id: revieweeId,
        new_rating: parseFloat(avgRating),
      }).catch(console.error) // Don't fail if RPC doesn't exist yet

      onClose()

      if (onReviewSubmitted) {
        onReviewSubmitted()
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Your Experience with {revieweeName}</DialogTitle>
          <DialogDescription>
            Your honest feedback helps build trust in the TimeBank community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Rating */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Overall Rating</Label>
            <p className="text-sm text-muted-foreground">
              How would you rate your overall experience?
            </p>
            <div className="flex items-center gap-3">
              {renderStars('overall', overallRating)}
              <span className="text-sm font-medium">{overallRating}/5</span>
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-4">
            <h4 className="font-semibold">Detailed Ratings</h4>
            {ratingDimensions.map((dimension) => {
              const [currentRating] = ratingStateMap[dimension.key]
              return (
                <div key={dimension.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">{dimension.label}</Label>
                      <p className="text-xs text-muted-foreground">{dimension.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(dimension.key, currentRating)}
                      <span className="text-sm w-8">{currentRating}/5</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="review-title">Review Title *</Label>
            <Input
              id="review-title"
              placeholder="e.g., Great experience working together"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {reviewTitle.length}/100 characters
            </p>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review-text">Your Review *</Label>
            <Textarea
              id="review-text"
              placeholder="Share your experience in detail. What went well? What could be improved?"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {reviewText.length}/1000 characters (minimum 10)
            </p>
          </div>

          {/* Work Location (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="work-location">Work Location (Optional)</Label>
            <Input
              id="work-location"
              placeholder="e.g., Lagos, Nigeria"
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Where was the work performed? (for physical services)
            </p>
          </div>

          {/* Would Recommend */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="would-recommend"
              checked={wouldRecommend}
              onCheckedChange={(checked) => setWouldRecommend(checked as boolean)}
            />
            <label
              htmlFor="would-recommend"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
            >
              <ThumbsUp className="h-4 w-4 text-primary" />
              I would recommend this trader to others
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Reviews are public and help build trust in the TimeBank community
        </p>
      </DialogContent>
    </Dialog>
  )
}
