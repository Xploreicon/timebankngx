import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calculator, TrendingUp } from 'lucide-react'
import CountUp from 'react-countup'

export const ROICalculator = () => {
  const [hoursTraded, setHoursTraded] = useState<number>(0)
  const [avgMarketRate] = useState<number>(2500) // Average hourly rate in Naira
  const [calculatedSavings, setCalculatedSavings] = useState<number>(0)

  const calculateROI = () => {
    const savings = hoursTraded * avgMarketRate
    setCalculatedSavings(savings)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex-1">
          ROI Calculator
        </CardTitle>
        <Calculator className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hours">Hours Traded</Label>
          <Input
            id="hours"
            type="number"
            placeholder="Enter hours"
            value={hoursTraded || ''}
            onChange={(e) => setHoursTraded(Number(e.target.value))}
          />
        </div>
        
        <Button onClick={calculateROI} className="w-full">
          Calculate Savings
        </Button>
        
        {calculatedSavings > 0 && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Estimated Savings
              </span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₦<CountUp start={0} end={calculatedSavings} duration={1.5} separator="," />
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
              Based on ₦{avgMarketRate.toLocaleString()}/hour market rate
            </p>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Market rate varies by service category</p>
          <p>• TimeBank eliminates cash payments</p>
          <p>• Build valuable professional networks</p>
        </div>
      </CardContent>
    </Card>
  )
}