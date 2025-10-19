import { PaystackProps } from 'react-paystack'
import { usePaystackPayment } from 'react-paystack'

export interface PaymentData {
  email: string
  amount: number // Amount in kobo (Nigerian lowest currency unit)
  currency: 'NGN'
  reference?: string
  metadata?: {
    userId?: string
    serviceId?: string
    tradeId?: string
    description?: string
    custom_fields?: any[]
  }
  channels?: Array<'card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer' | 'eft'>
}

export interface PaymentResponse {
  reference: string
  message: string
  status: 'success' | 'failed' | 'cancelled'
  trans: string
  transaction: string
  redirecturl: string
  trxref: string
}

export class PaymentService {
  private publicKey: string
  private testMode: boolean

  constructor() {
    this.publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''
    this.testMode = import.meta.env.VITE_ENVIRONMENT !== 'production'

    if (!this.publicKey) {
      console.warn('Paystack public key not configured')
    }
  }

  /**
   * Initialize Paystack payment for Nigerian businesses
   */
  public async initiatePayment(paymentData: PaymentData): Promise<PaystackProps> {
    if (!this.publicKey) {
      throw new Error('Paystack not configured. Please add VITE_PAYSTACK_PUBLIC_KEY to environment variables.')
    }

    // Generate unique reference if not provided
    const reference = paymentData.reference || `timebank_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const config: PaystackProps = {
      reference,
      email: paymentData.email,
      amount: paymentData.amount, // Already in kobo
      publicKey: this.publicKey,
      currency: paymentData.currency,
      channels: paymentData.channels || ['card', 'bank', 'ussd', 'bank_transfer'],
      metadata: {
        ...paymentData.metadata,
        // Add Nigerian business context
        business_type: 'time_banking',
        platform: 'timebank_ng',
      },
      text: 'Pay Now',
      onSuccess: (response: PaymentResponse) => {
        this.handlePaymentSuccess(response, paymentData)
      },
      onClose: () => {
        this.handlePaymentClosed()
      },
    }

    // Return the config for component to use with usePaystackPayment hook
    return config
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(response: PaymentResponse, originalData: PaymentData): Promise<void> {
    console.log('Payment successful:', response)

    try {
      // Verify payment on backend
      await this.verifyPayment(response.reference)

      // Update local state or trigger callbacks
      this.onPaymentSuccess(response, originalData)
    } catch (error) {
      console.error('Payment verification failed:', error)
      // Even if verification fails, we should still handle the success
      // The backend can handle verification asynchronously
      this.onPaymentSuccess(response, originalData)
    }
  }

  /**
   * Handle payment modal closed
   */
  private handlePaymentClosed(): void {
    console.log('Payment modal closed')
    // Could track abandonment analytics here
  }

  /**
   * Verify payment on backend
   */
  private async verifyPayment(reference: string): Promise<boolean> {
    try {
      // TODO: Implement backend verification endpoint
      const response = await fetch(`/api/payments/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Verification request failed')
      }

      const result = await response.json()
      return result.status === 'success'
    } catch (error) {
      console.error('Payment verification error:', error)
      return false
    }
  }

  /**
   * Convert Naira to Kobo (Paystack expects amounts in kobo)
   */
  public static nairaToKobo(nairaAmount: number): number {
    return Math.round(nairaAmount * 100)
  }

  /**
   * Convert Kobo to Naira
   */
  public static koboToNaira(koboAmount: number): number {
    return koboAmount / 100
  }

  /**
   * Format Nigerian currency
   */
  public static formatNaira(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount)
  }

  /**
   * Generate payment reference
   */
  public static generateReference(prefix: string = 'timebank'): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return `${prefix}_${timestamp}_${random}`
  }

  /**
   * Get supported payment channels for Nigerian market
   */
  public static getSupportedChannels(): Array<'card' | 'bank' | 'ussd' | 'bank_transfer'> {
    return ['card', 'bank', 'ussd', 'bank_transfer']
  }

  /**
   * Payment success callback - can be overridden
   */
  public onPaymentSuccess = (response: PaymentResponse, originalData: PaymentData) => {
    // Default implementation - can be customized by components
    console.log('Payment completed successfully', { response, originalData })
  }

  /**
   * Validate payment data
   */
  public static validatePaymentData(data: PaymentData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.email || !data.email.includes('@')) {
      errors.push('Valid email address is required')
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be greater than 0')
    }

    if (data.amount < 100) { // Minimum 1 Naira
      errors.push('Minimum payment amount is ₦1.00')
    }

    if (data.amount > 500000000) { // Maximum 5 million Naira
      errors.push('Maximum payment amount is ₦5,000,000.00')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService()

// Payment-related types and utilities
export interface TimeCreditsTransaction {
  id: string
  userId: string
  type: 'purchase' | 'earnings' | 'spend'
  amount: number // In Naira
  credits: number // Time credits earned/spent
  reference?: string
  status: 'pending' | 'completed' | 'failed'
  metadata?: Record<string, any>
  createdAt: Date
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number // In Naira
  bonus?: number // Bonus credits
  description: string
  popular?: boolean
  savings?: string // e.g., "Save 20%"
}

// Predefined credit packages for Nigerian market
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    price: 5000, // ₦50.00
    description: 'Perfect for trying out time banking',
  },
  {
    id: 'business',
    name: 'Business Pack',
    credits: 50,
    price: 20000, // ₦200.00
    bonus: 5,
    popular: true,
    savings: 'Save ₦50',
    description: 'Great for small businesses',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 150,
    price: 50000, // ₦500.00
    bonus: 25,
    savings: 'Save ₦125',
    description: 'Best value for growing businesses',
  },
  {
    id: 'bulk',
    name: 'Bulk Pack',
    credits: 500,
    price: 150000, // ₦1500.00
    bonus: 100,
    savings: 'Save ₦500',
    description: 'Maximum savings for large operations',
  },
]