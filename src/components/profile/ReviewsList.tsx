import { useEffect, useState } from 'react'
import { Star, ThumbsUp, MapPin, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Progress } from '@/components/ui/progress'

interface Review {
  id: string
  trade_id: string
  reviewer_id: string
  overall_rating: number
  communication_rating: number | null
  quality_rating: number | null
  timeliness_rating: number | null
  professionalism_rating: number | null
  review_title: string
  review_text: string
  would_recommend: boolean
  work_location: string | null
  is_verified: boolean
  is_featured: boolean
  response_text: string | null
  response_date: string | null
  created_at: string
  reviewer?: {
    id: string
    display_name: string
    avatar_url: string | null
    category: string | null
  }
}

interface ReviewsListProps {
  userId: string
  isOwnProfile?: boolean
}

interface RatingBreakdown {
  average: number
  count: number
  distribution: { stars: number; count: number; percentage: number }[]
  dimensions: {
    communication: number
    quality: number
    timeliness: number
    professionalism: number
  }
}

export function ReviewsList({ userId, isOwnProfile = false }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const fetchReviews = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id (
            id,
            display_name,
            avatar_url,
            category
          )
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setReviews((data || []) as Review[])
      calculateRatingBreakdown(data || [])
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateRatingBreakdown = (reviewsData: Review[]) => {
    if (reviewsData.length === 0) {
      setRatingBreakdown(null)
      return
    }

    const totalRating = reviewsData.reduce((sum, review) => sum + review.overall_rating, 0)
    const average = totalRating / reviewsData.length

    // Star distribution
    const distribution = [5, 4, 3, 2, 1].map((stars) => {
      const count = reviewsData.filter((r) => r.overall_rating === stars).length
      return {
        stars,
        count,
        percentage: (count / reviewsData.length) * 100,
      }
    })

    // Average dimension ratings
    const dimensions = {
      communication:
        reviewsData.reduce((sum, r) => sum + (r.communication_rating || 0), 0) /
        reviewsData.filter((r) => r.communication_rating).length || 0,
      quality:
        reviewsData.reduce((sum, r) => sum + (r.quality_rating || 0), 0) /
        reviewsData.filter((r) => r.quality_rating).length || 0,
      timeliness:
        reviewsData.reduce((sum, r) => sum + (r.timeliness_rating || 0), 0) /
        reviewsData.filter((r) => r.timeliness_rating).length || 0,
      professionalism:
        reviewsData.reduce((sum, r) => sum + (r.professionalism_rating || 0), 0) /
        reviewsData.filter((r) => r.professionalism_rating).length || 0,
    }

    setRatingBreakdown({
      average,
      count: reviewsData.length,
      distribution,
      dimensions,
    })
  }

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) return

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          response_text: responseText.trim(),
          response_date: new Date().toISOString(),
        })
        .eq('id', reviewId)

      if (error) throw error

      // Refresh reviews
      fetchReviews()
      setRespondingTo(null)
      setResponseText('')
    } catch (error) {
      console.error('Error submitting response:', error)
    }
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading reviews...</p>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {isOwnProfile ? "You haven't received any reviews yet" : 'No reviews yet'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {ratingBreakdown && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Overall Rating */}
              <div>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-5xl font-bold">{ratingBreakdown.average.toFixed(1)}</span>
                  <div className="pb-2">
                    {renderStars(Math.round(ratingBreakdown.average), 'lg')}
                    <p className="text-sm text-muted-foreground mt-1">
                      {ratingBreakdown.count} {ratingBreakdown.count === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </div>

                {/* Star Distribution */}
                <div className="space-y-2">
                  {ratingBreakdown.distribution.map(({ stars, count, percentage }) => (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-sm w-12">{stars} stars</span>
                      <Progress value={percentage} className="h-2" />
                      <span className="text-sm text-muted-foreground w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimension Ratings */}
              <div>
                <h4 className="font-semibold mb-4">Rating Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Communication</span>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(ratingBreakdown.dimensions.communication), 'sm')}
                      <span className="text-sm font-medium w-8">
                        {ratingBreakdown.dimensions.communication.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quality</span>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(ratingBreakdown.dimensions.quality), 'sm')}
                      <span className="text-sm font-medium w-8">
                        {ratingBreakdown.dimensions.quality.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Timeliness</span>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(ratingBreakdown.dimensions.timeliness), 'sm')}
                      <span className="text-sm font-medium w-8">
                        {ratingBreakdown.dimensions.timeliness.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Professionalism</span>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(ratingBreakdown.dimensions.professionalism), 'sm')}
                      <span className="text-sm font-medium w-8">
                        {ratingBreakdown.dimensions.professionalism.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.reviewer?.avatar_url || ''} />
                    <AvatarFallback>
                      {review.reviewer?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{review.reviewer?.display_name || 'Anonymous'}</h4>
                      {review.is_verified && <Badge variant="secondary">Verified</Badge>}
                      {review.is_featured && <Badge variant="default">Featured</Badge>}
                    </div>
                    {review.reviewer?.category && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {review.reviewer.category}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {renderStars(review.overall_rating)}
                  <span className="text-sm font-medium">{review.overall_rating}/5</span>
                </div>
              </div>

              {/* Review Title */}
              <h3 className="font-semibold text-lg mb-2">{review.review_title}</h3>

              {/* Review Text */}
              <p className="text-sm text-muted-foreground mb-4">{review.review_text}</p>

              {/* Review Meta */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                {review.would_recommend && (
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3 text-primary" />
                    <span>Would recommend</span>
                  </div>
                )}
                {review.work_location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{review.work_location}</span>
                  </div>
                )}
              </div>

              {/* Response */}
              {review.response_text && (
                <div className="bg-muted rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Response from business owner</span>
                  </div>
                  <p className="text-sm">{review.response_text}</p>
                  {review.response_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(review.response_date), { addSuffix: true })}
                    </p>
                  )}
                </div>
              )}

              {/* Response Form (for own profile) */}
              {isOwnProfile && !review.response_text && (
                <div className="mt-4">
                  {respondingTo === review.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write your response..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitResponse(review.id)}
                          disabled={!responseText.trim()}
                        >
                          Submit Response
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRespondingTo(null)
                            setResponseText('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRespondingTo(review.id)}
                      className="text-primary"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Respond to this review
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
