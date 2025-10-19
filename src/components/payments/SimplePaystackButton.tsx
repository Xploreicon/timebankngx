import { useState } from 'react'
import { usePaystackPayment, PaystackProps } from 'react-paystack'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { PaymentService, PaymentResponse, CreditPackage } from '@/services/paymentService'
import { useAppStore } from '@/store/appStore'
import { CreditCard, Shield, Zap, Clock, CheckCircle } from 'lucide-react'

interface SimplePaystackButtonProps {
  creditPackage: CreditPackage
  onSuccess?: (response: PaymentResponse, packageData: CreditPackage) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

export const SimplePaystackButton = ({
  creditPackage,
  onSuccess,
  onError,
  disabled = false,
  className = '',
}: SimplePaystackButtonProps) => {
  const { user } = useAppStore()
  const [isProcessing, setIsProcessing] = useState(false)

  // Prepare payment configuration
  const paymentConfig: PaystackProps = {
    reference: PaymentService.generateReference(`credits_${creditPackage.id}`),
    email: user?.email || '',
    amount: PaymentService.nairaToKobo(creditPackage.price),
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    currency: 'NGN',
    channels: ['card', 'bank', 'ussd', 'bank_transfer'],
    metadata: {
      userId: user?.id,
      packageId: creditPackage.id,
      credits: creditPackage.credits,
      bonus: creditPackage.bonus || 0,
      description: `Purchase ${creditPackage.name} - ${creditPackage.credits} credits`,
      custom_fields: [
        {
          display_name: 'Package',
          variable_name: 'package',
          value: creditPackage.name,
        },
        {
          display_name: 'Credits',
          variable_name: 'credits',
          value: creditPackage.credits.toString(),
        },
      ],
    },
    onSuccess: (response: PaymentResponse) => {
      setIsProcessing(false)

      toast({
        title: '🎉 Payment Successful!',
        description: `You've purchased ${creditPackage.credits} time credits. They'll be added to your wallet shortly.`,
      })

      if (onSuccess) {
        onSuccess(response, creditPackage)
      }
    },
    onClose: () => {
      setIsProcessing(false)
    },
  }

  const initializePayment = usePaystackPayment(paymentConfig)

  const handlePayment = () => {
    if (!user?.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please log in to purchase time credits',
      })
      return
    }

    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
      toast({
        variant: 'destructive',
        title: 'Payment Not Configured',
        description: 'Paystack payment is not properly configured. Please contact support.',
      })
      return
    }

    if (disabled || isProcessing) {
      return
    }

    // Validate payment data
    const validation = PaymentService.validatePaymentData({
      email: user.email,
      amount: PaymentService.nairaToKobo(creditPackage.price),
      currency: 'NGN',
    })

    if (!validation.valid) {
      toast({
        variant: 'destructive',
        title: 'Invalid Payment Data',
        description: validation.errors.join(', '),
      })
      return
    }

    setIsProcessing(true)

    try {
      initializePayment()
    } catch (error) {
      setIsProcessing(false)
      const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed'

      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: errorMessage,
      })

      if (onError) {
        onError(errorMessage)
      }
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      className={`w-full ${className}`}
      size="lg"
    >
      {isProcessing ? (
        <>
          <Clock className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Pay {PaymentService.formatNaira(creditPackage.price / 100)}
          {creditPackage.bonus && (
            <Badge variant="secondary" className="ml-2">
              +{creditPackage.bonus} bonus
            </Badge>
          )}
        </>
      )}
    </Button>
  )
}

interface CreditPackageCardProps {
  creditPackage: CreditPackage
  onPurchaseSuccess?: (response: PaymentResponse, packageData: CreditPackage) => void
}

export const CreditPackageCard = ({ creditPackage, onPurchaseSuccess }: CreditPackageCardProps) => {
  const totalCredits = creditPackage.credits + (creditPackage.bonus || 0)
  const priceFormatted = PaymentService.formatNaira(creditPackage.price / 100)

  return (
    <Card className={`relative ${creditPackage.popular ? 'border-primary shadow-lg' : 'border-border'}`}>
      {creditPackage.popular && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
          Most Popular
        </Badge>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl font-brand">{creditPackage.name}</CardTitle>
        <CardDescription>{creditPackage.description}</CardDescription>

        <div className="mt-4">
          <div className="text-3xl font-bold text-primary">
            {priceFormatted}
          </div>
          {creditPackage.savings && (
            <Badge variant="outline" className="mt-2 text-green-600 border-green-200">
              {creditPackage.savings}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Base Credits:</span>
            <span className="font-medium">{creditPackage.credits}</span>
          </div>

          {creditPackage.bonus && (
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm">Bonus Credits:</span>
              <span className="font-medium">+{creditPackage.bonus}</span>
            </div>
          )}

          <div className="border-t pt-2 flex items-center justify-between font-semibold">
            <span>Total Credits:</span>
            <span className="text-primary">{totalCredits}</span>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            <span>Secure payment via Paystack</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3" />
            <span>Credits added instantly</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3" />
            <span>No expiration date</span>
          </div>
        </div>

        <SimplePaystackButton
          creditPackage={creditPackage}
          onSuccess={onPurchaseSuccess}
          className="mt-4"
        />
      </CardContent>
    </Card>
  )
}

// Nigerian payment methods info component
export const PaymentMethodsInfo = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Secure Nigerian Payment Methods
        </CardTitle>
        <CardDescription>
          We accept all major Nigerian payment methods via Paystack
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Card Payments</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Visa & Mastercard</li>
              <li>• Verve Cards</li>
              <li>• International Cards</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Bank Transfers</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All Nigerian Banks</li>
              <li>• USSD Payments</li>
              <li>• Instant Transfers</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <Shield className="w-4 h-4 inline mr-1" />
            All payments are secured by Paystack, Nigeria's leading payment processor
          </p>
        </div>
      </CardContent>
    </Card>
  )
}