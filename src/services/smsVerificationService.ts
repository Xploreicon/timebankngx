import { isValidPhoneNumber, parsePhoneNumber, CountryCode } from 'libphonenumber-js'

export interface SMSVerificationRequest {
  phoneNumber: string
  countryCode?: CountryCode
  channel?: 'sms' | 'voice'
}

export interface SMSVerificationResponse {
  success: boolean
  message: string
  sid?: string
  requestId?: string
  error?: string
}

export interface OTPVerificationRequest {
  phoneNumber: string
  otp: string
  requestId?: string
}

export interface OTPVerificationResponse {
  success: boolean
  message: string
  verified: boolean
  error?: string
}

export class SMSVerificationService {
  private apiBaseUrl: string
  private environment: string

  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    this.environment = import.meta.env.VITE_ENVIRONMENT || 'development'
  }

  /**
   * Validate Nigerian phone number format
   */
  public validateNigerianPhone(phoneNumber: string): { valid: boolean; formatted?: string; error?: string } {
    try {
      // Remove any non-digit characters except +
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '')

      // Check if it's a valid Nigerian number
      if (!isValidPhoneNumber(cleanNumber, 'NG')) {
        return {
          valid: false,
          error: 'Please enter a valid Nigerian phone number'
        }
      }

      // Parse and format the number
      const parsed = parsePhoneNumber(cleanNumber, 'NG')
      const formatted = parsed.formatInternational()

      // Additional Nigerian-specific validation
      const nationalNumber = parsed.nationalNumber

      // Nigerian numbers should be 10 digits (without country code)
      if (nationalNumber.length !== 10) {
        return {
          valid: false,
          error: 'Nigerian phone numbers must be 10 digits'
        }
      }

      // Check for valid Nigerian network prefixes
      const validPrefixes = [
        '070', '080', '081', '090', '091', // MTN
        '080', '081', '070', '090',       // GLO
        '080', '081', '070', '090',       // Airtel
        '081', '070', '090'               // 9mobile
      ]

      const prefix = nationalNumber.substring(0, 3)
      // Note: This is a simplified check - in practice you'd have a more comprehensive list

      return {
        valid: true,
        formatted: formatted
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid phone number format'
      }
    }
  }

  /**
   * Send SMS verification code
   */
  public async sendVerificationCode(request: SMSVerificationRequest): Promise<SMSVerificationResponse> {
    // Validate phone number first
    const validation = this.validateNigerianPhone(request.phoneNumber)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || 'Invalid phone number',
        error: validation.error
      }
    }

    try {
      // In development mode, simulate SMS sending
      if (this.environment === 'development') {
        console.log('🔔 SMS Verification (Development Mode)')
        console.log('Phone:', validation.formatted)
        console.log('Mock OTP: 123456')

        return {
          success: true,
          message: 'Verification code sent successfully (Development Mode)',
          requestId: `dev_${Date.now()}_${Math.random().toString(36).substring(7)}`
        }
      }

      // Production mode - call actual SMS service
      const response = await fetch(`${this.apiBaseUrl}/sms/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: validation.formatted,
          countryCode: 'NG',
          channel: request.channel || 'sms'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      return {
        success: result.success || false,
        message: result.message || 'Verification code sent',
        sid: result.sid,
        requestId: result.requestId
      }
    } catch (error) {
      console.error('SMS sending failed:', error)

      return {
        success: false,
        message: 'Failed to send verification code. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verify OTP code
   */
  public async verifyOTP(request: OTPVerificationRequest): Promise<OTPVerificationResponse> {
    if (!request.otp || request.otp.length !== 6) {
      return {
        success: false,
        message: 'Please enter a valid 6-digit verification code',
        verified: false,
        error: 'Invalid OTP format'
      }
    }

    try {
      // In development mode, accept 123456 as valid OTP
      if (this.environment === 'development') {
        const isValid = request.otp === '123456'

        console.log('🔑 OTP Verification (Development Mode)')
        console.log('Entered OTP:', request.otp)
        console.log('Valid:', isValid)

        return {
          success: isValid,
          message: isValid ? 'Phone number verified successfully' : 'Invalid verification code',
          verified: isValid,
          error: isValid ? undefined : 'Invalid OTP'
        }
      }

      // Production mode - verify with actual SMS service
      const response = await fetch(`${this.apiBaseUrl}/sms/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: request.phoneNumber,
          otp: request.otp,
          requestId: request.requestId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      return {
        success: result.success || false,
        message: result.message || (result.verified ? 'Verified successfully' : 'Invalid verification code'),
        verified: result.verified || false,
        error: result.error
      }
    } catch (error) {
      console.error('OTP verification failed:', error)

      return {
        success: false,
        message: 'Verification failed. Please try again.',
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Resend verification code
   */
  public async resendVerificationCode(phoneNumber: string): Promise<SMSVerificationResponse> {
    return this.sendVerificationCode({ phoneNumber })
  }

  /**
   * Format phone number for display
   */
  public static formatPhoneNumber(phoneNumber: string): string {
    try {
      const parsed = parsePhoneNumber(phoneNumber, 'NG')
      return parsed.formatInternational()
    } catch {
      return phoneNumber
    }
  }

  /**
   * Get Nigerian network provider from phone number
   */
  public static getNetworkProvider(phoneNumber: string): string {
    try {
      const parsed = parsePhoneNumber(phoneNumber, 'NG')
      const nationalNumber = parsed.nationalNumber
      const prefix = nationalNumber.substring(0, 3)

      // Nigerian network prefixes (simplified mapping)
      const networks = {
        '080': 'MTN/GLO/Airtel',
        '081': 'MTN/GLO/9mobile',
        '070': 'MTN/GLO/Airtel',
        '090': 'MTN/GLO/Airtel',
        '091': 'MTN',
        // Add more specific mappings as needed
      }

      return networks[prefix as keyof typeof networks] || 'Nigerian Network'
    } catch {
      return 'Unknown'
    }
  }

  /**
   * Check if phone verification is required for user
   */
  public static shouldRequirePhoneVerification(userProfile: any): boolean {
    // Require phone verification if:
    // 1. Phone number is not verified
    // 2. User is offering services (trust requirement)
    // 3. User wants to receive payments (KYC requirement)

    if (!userProfile?.verification_phone) {
      return true
    }

    if (userProfile?.services && userProfile.services.length > 0) {
      return !userProfile.verification_phone
    }

    return false
  }
}

// Export singleton instance
export const smsVerificationService = new SMSVerificationService()

// Helper types for phone verification UI
export interface PhoneVerificationState {
  phoneNumber: string
  isValidPhone: boolean
  otpSent: boolean
  otpCode: string
  isVerifying: boolean
  isResending: boolean
  requestId?: string
  error?: string
  success?: boolean
}

// Phone verification flow states
export type PhoneVerificationStep =
  | 'phone-input'
  | 'otp-sent'
  | 'otp-verification'
  | 'verified'
  | 'failed'

export interface PhoneVerificationFlow {
  step: PhoneVerificationStep
  phoneNumber?: string
  requestId?: string
  error?: string
  attempts: number
  maxAttempts: number
}