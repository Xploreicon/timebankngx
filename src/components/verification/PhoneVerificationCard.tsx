import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PhoneVerificationModal } from './PhoneVerificationModal'
import { smsVerificationService } from '@/services/smsVerificationService'
import { useAppStore } from '@/store/appStore'
import { toast } from '@/hooks/use-toast'
import { Phone, Shield, CheckCircle, AlertCircle, Star } from 'lucide-react'

interface PhoneVerificationCardProps {
  className?: string
  compact?: boolean
  initialPhoneNumber?: string
  onVerified?: (phone: string) => void
}

export const PhoneVerificationCard = ({
  className = '',
  compact = false,
  initialPhoneNumber,
  onVerified
}: PhoneVerificationCardProps) => {
  const { user, profile, updateProfile } = useAppStore()
  const [showModal, setShowModal] = useState(false)

  const isPhoneVerified =
    profile?.phone_verified ??
    profile?.verification_phone ??
    false
  const phoneNumber = profile?.phone || initialPhoneNumber || ''

  const handleVerificationComplete = async (verifiedPhone: string) => {
    try {
      // Update the user's profile with verified phone
      const { error } = await updateProfile({
        phone: verifiedPhone,
        phone_verified: true
      })

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Profile Update Failed',
          description: error
        })
      } else {
        toast({
          title: '✅ Phone Verified!',
          description: 'Your phone number has been verified and saved to your profile.',
        })
        onVerified?.(verifiedPhone)
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        variant: 'destructive',
        title: 'Update Error',
        description: 'Failed to update your profile. Please try again.'
      })
    }
  }

  const shouldShowVerification = smsVerificationService.constructor.shouldRequirePhoneVerification(profile)

  if (compact) {
    return (
      <>
        <div className={`flex items-center gap-2 ${className}`}>
          {isPhoneVerified ? (
            <>
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Phone Verified
              </Badge>
              {phoneNumber && (
                <span className="text-sm text-muted-foreground">
                  {smsVerificationService.constructor.formatPhoneNumber(phoneNumber)}
                </span>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
          onClick={() => setShowModal(true)}
          className="text-amber-600 border-amber-200 hover:bg-amber-50"
        >
          <Phone className="h-3 w-3 mr-1" />
          Verify Phone
        </Button>
      )}
    </div>

    <PhoneVerificationModal
      open={showModal}
      onOpenChange={setShowModal}
      onVerificationComplete={handleVerificationComplete}
      initialPhoneNumber={phoneNumber}
    />
  </>
)
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPhoneVerified ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Phone className="h-5 w-5 text-primary" />
            )}
            Phone Verification
            {shouldShowVerification && !isPhoneVerified && (
              <Badge variant="destructive" className="ml-auto">Required</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isPhoneVerified
              ? 'Your Nigerian phone number is verified and trusted.'
              : 'Verify your Nigerian phone number to build trust and access all features.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isPhoneVerified ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Verified</p>
                    <p className="text-sm text-green-700">
                      {smsVerificationService.constructor.formatPhoneNumber(phoneNumber)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <Star className="h-3 w-3 mr-1" />
                  Trusted
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <Shield className="h-4 w-4" />
                  <span>Account Secured</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Can Offer Services</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(true)}
                className="w-full"
              >
                Update Phone Number
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">Verification Required</p>
                    <p className="text-amber-700 mt-1">
                      Nigerian businesses need phone verification to:
                    </p>
                    <ul className="mt-2 text-amber-700 space-y-1">
                      <li>• Offer services to other businesses</li>
                      <li>• Receive payments and time credits</li>
                      <li>• Build trust in the community</li>
                    </ul>
                  </div>
                </div>
              </div>

              {phoneNumber && (
                <div className="text-sm text-muted-foreground">
                  Current: {smsVerificationService.constructor.formatPhoneNumber(phoneNumber)}
                </div>
              )}

              <Button
                onClick={() => setShowModal(true)}
                className="w-full"
                size="lg"
              >
                <Phone className="h-4 w-4 mr-2" />
                Verify Phone Number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PhoneVerificationModal
        open={showModal}
        onOpenChange={setShowModal}
        onVerificationComplete={handleVerificationComplete}
        initialPhoneNumber={phoneNumber}
        required={shouldShowVerification}
      />
    </>
  )
}

// Quick verification status indicator
export const PhoneVerificationStatus = ({ userId }: { userId?: string }) => {
  const { profile } = useAppStore()

  if (!profile) return null

  const isVerified = profile.verification_phone

  return (
    <div className="flex items-center gap-1 text-xs">
      {isVerified ? (
        <>
          <CheckCircle className="h-3 w-3 text-green-600" />
          <span className="text-green-600">Phone Verified</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3 text-amber-600" />
          <span className="text-amber-600">Phone Not Verified</span>
        </>
      )}
    </div>
  )
}

// Hook to check if user needs phone verification
export const usePhoneVerificationRequired = () => {
  const { profile } = useAppStore()

  return {
    isRequired: smsVerificationService.constructor.shouldRequirePhoneVerification(profile),
    isVerified: profile?.verification_phone || false,
    phoneNumber: profile?.phone || ''
  }
}
