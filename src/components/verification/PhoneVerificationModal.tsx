import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import {
  smsVerificationService,
  PhoneVerificationState,
  PhoneVerificationStep,
  SMSVerificationResponse,
  OTPVerificationResponse
} from '@/services/smsVerificationService'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import '@/styles/phone-input.css'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Shield, Phone, MessageSquare, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface PhoneVerificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerificationComplete: (phoneNumber: string) => void
  initialPhoneNumber?: string
  title?: string
  description?: string
  required?: boolean
}

export const PhoneVerificationModal = ({
  open,
  onOpenChange,
  onVerificationComplete,
  initialPhoneNumber = '',
  title = 'Verify Your Phone Number',
  description = 'We need to verify your Nigerian phone number for security and trust.',
  required = false,
}: PhoneVerificationModalProps) => {
  const [state, setState] = useState<PhoneVerificationState>({
    phoneNumber: initialPhoneNumber,
    isValidPhone: false,
    otpSent: false,
    otpCode: '',
    isVerifying: false,
    isResending: false,
  })

  const [currentStep, setCurrentStep] = useState<PhoneVerificationStep>('phone-input')
  const [countdown, setCountdown] = useState(0)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setState({
        phoneNumber: initialPhoneNumber,
        isValidPhone: false,
        otpSent: false,
        otpCode: '',
        isVerifying: false,
        isResending: false,
      })
      setCurrentStep('phone-input')
      setCountdown(0)
    }
  }, [open, initialPhoneNumber])

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handlePhoneChange = (value: string) => {
    const fullNumber = `+${value}`
    const validation = smsVerificationService.validateNigerianPhone(fullNumber)

    setState(prev => ({
      ...prev,
      phoneNumber: fullNumber,
      isValidPhone: validation.valid,
      error: validation.error
    }))
  }

  const handleSendOTP = async () => {
    if (!state.isValidPhone || state.isVerifying) return

    setState(prev => ({ ...prev, isVerifying: true, error: undefined }))

    try {
      const response: SMSVerificationResponse = await smsVerificationService.sendVerificationCode({
        phoneNumber: state.phoneNumber
      })

      if (response.success) {
        setState(prev => ({
          ...prev,
          otpSent: true,
          requestId: response.requestId,
          isVerifying: false
        }))
        setCurrentStep('otp-verification')
        setCountdown(60) // 60-second countdown

        toast({
          title: '📱 SMS Sent!',
          description: 'Check your phone for the verification code.',
        })
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isVerifying: false
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to send verification code. Please try again.',
        isVerifying: false
      }))
    }
  }

  const handleVerifyOTP = async () => {
    if (state.otpCode.length !== 6 || state.isVerifying) return

    setState(prev => ({ ...prev, isVerifying: true, error: undefined }))

    try {
      const response: OTPVerificationResponse = await smsVerificationService.verifyOTP({
        phoneNumber: state.phoneNumber,
        otp: state.otpCode,
        requestId: state.requestId
      })

      if (response.success && response.verified) {
        setState(prev => ({ ...prev, success: true, isVerifying: false }))
        setCurrentStep('verified')

        toast({
          title: '✅ Phone Verified!',
          description: 'Your Nigerian phone number has been verified successfully.',
        })

        // Complete verification after a brief delay
        setTimeout(() => {
          onVerificationComplete(state.phoneNumber)
          onOpenChange(false)
        }, 1500)
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isVerifying: false,
          otpCode: '' // Clear incorrect OTP
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Verification failed. Please try again.',
        isVerifying: false,
        otpCode: ''
      }))
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0 || state.isResending) return

    setState(prev => ({ ...prev, isResending: true, error: undefined }))

    try {
      const response = await smsVerificationService.resendVerificationCode(state.phoneNumber)

      if (response.success) {
        setState(prev => ({
          ...prev,
          requestId: response.requestId,
          isResending: false,
          otpCode: '' // Clear any existing OTP
        }))
        setCountdown(60)

        toast({
          title: '📱 Code Resent',
          description: 'A new verification code has been sent to your phone.',
        })
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isResending: false
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to resend code. Please try again.',
        isResending: false
      }))
    }
  }

  const canClose = !required || currentStep === 'verified'

  return (
    <Dialog open={open} onOpenChange={canClose ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'verified' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'verified'
              ? 'Your phone number has been successfully verified!'
              : description
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Phone Input Step */}
          {currentStep === 'phone-input' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Nigerian Phone Number</Label>
                <div className="phone-input-container">
                  <PhoneInput
                    country={'ng'}
                    value={state.phoneNumber.replace('+', '')}
                    onChange={handlePhoneChange}
                    onlyCountries={['ng']}
                    inputStyle={{
                      width: '100%',
                      height: '40px',
                      fontSize: '14px',
                      paddingLeft: '48px',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    buttonStyle={{
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px 0 0 6px',
                    }}
                    dropdownStyle={{
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                </div>
                {state.phoneNumber && (
                  <p className="text-sm text-muted-foreground">
                    Network: {smsVerificationService.constructor.getNetworkProvider(state.phoneNumber)}
                  </p>
                )}
              </div>

              {state.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Why verify your phone?</p>
                    <ul className="mt-2 text-blue-700 space-y-1">
                      <li>• Secure your account from unauthorized access</li>
                      <li>• Build trust with other Nigerian businesses</li>
                      <li>• Required for offering services and receiving payments</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTP Verification Step */}
          {currentStep === 'otp-verification' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <MessageSquare className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-medium">Enter Verification Code</h3>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to<br />
                  <strong>{smsVerificationService.constructor.formatPhoneNumber(state.phoneNumber)}</strong>
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={state.otpCode}
                    onChange={(value) => setState(prev => ({ ...prev, otpCode: value }))}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {state.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                )}

                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={countdown > 0 || state.isResending}
                  >
                    {state.isResending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : countdown > 0 ? (
                      `Resend in ${countdown}s`
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success Step */}
          {currentStep === 'verified' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-green-900">Phone Number Verified!</h3>
                <p className="text-sm text-green-700">
                  Your Nigerian phone number has been successfully verified.
                  You can now offer services and receive payments.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {currentStep === 'phone-input' && (
            <div className="flex gap-3 w-full">
              {canClose && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {required ? 'Skip for Now' : 'Cancel'}
                </Button>
              )}
              <Button
                onClick={handleSendOTP}
                disabled={!state.isValidPhone || state.isVerifying}
                className="flex-1"
              >
                {state.isVerifying ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </div>
          )}

          {currentStep === 'otp-verification' && (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('phone-input')}
              >
                Change Number
              </Button>
              <Button
                onClick={handleVerifyOTP}
                disabled={state.otpCode.length !== 6 || state.isVerifying}
                className="flex-1"
              >
                {state.isVerifying ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}