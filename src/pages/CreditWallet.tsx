import Layout from '@/components/Layout'
import { useAppStore } from '@/store/appStore'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { creditWalletService, CreditTransaction, WalletBalance, CreditEarningOpportunity } from '@/services/creditWallet'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  Gift,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Target,
  Calendar,
  BarChart3
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { CreditPackageCard, PaymentMethodsInfo } from '@/components/payments/SimplePaystackButton.tsx'
import { CREDIT_PACKAGES, PaymentResponse, CreditPackage } from '@/services/paymentService'

export default function CreditWallet() {
  const { user } = useAppStore()
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [opportunities, setOpportunities] = useState<CreditEarningOpportunity[]>([])
  const [monthlySummary, setMonthlySummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadWalletData()
    }
  }, [user])

  const handlePurchaseSuccess = async (response: PaymentResponse, packageData: CreditPackage) => {
    // Refresh wallet data after successful purchase
    await loadWalletData()

    // Optional: Track analytics
    console.log('Credit purchase completed:', { response, packageData })
  }

  const loadWalletData = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const [balanceResult, transactionsResult, opportunitiesResult, summaryResult] = await Promise.all([
        creditWalletService.getWalletBalance(user.id),
        creditWalletService.getTransactionHistory(user.id, 20),
        creditWalletService.getEarningOpportunities(user.id),
        creditWalletService.getMonthlySummary(user.id, new Date().getFullYear(), new Date().getMonth() + 1)
      ])

      setBalance(balanceResult.balance)
      setTransactions(transactionsResult.transactions)
      setOpportunities(opportunitiesResult.opportunities)
      setMonthlySummary(summaryResult.summary)

    } catch (error) {
      console.error('Error loading wallet data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowUpRight className="w-4 h-4 text-green-600" />
    } else {
      return <ArrowDownRight className="w-4 h-4 text-red-600" />
    }
  }

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return 'text-green-600'
    return 'text-red-600'
  }

  const formatCredits = (credits: number) => {
    return credits.toFixed(1)
  }

  const TransactionItem = ({ transaction }: { transaction: CreditTransaction }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        {getTransactionIcon(transaction.type, transaction.amount)}
        <div>
          <p className="font-medium text-sm">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(transaction.createdAt)} ago
            {transaction.metadata?.otherUserName && ` • with ${transaction.metadata.otherUserName}`}
          </p>
          {transaction.metadata?.category && (
            <Badge variant="outline" className="text-xs mt-1">
              {transaction.metadata.category}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${getTransactionColor(transaction.type, transaction.amount)}`}>
          {transaction.amount > 0 ? '+' : ''}{formatCredits(transaction.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          ≈₦{Math.abs(transaction.amount * 1000).toLocaleString()}
        </p>
      </div>
    </div>
  )

  const OpportunityCard = ({ opportunity }: { opportunity: CreditEarningOpportunity }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            {opportunity.type === 'trade' && <TrendingUp className="w-5 h-5 text-green-600" />}
            {opportunity.type === 'referral' && <Users className="w-5 h-5 text-green-600" />}
            {opportunity.type === 'bonus' && <Gift className="w-5 h-5 text-green-600" />}
          </div>
          <div>
            <h4 className="font-medium text-sm">{opportunity.description}</h4>
            <p className="text-xs text-green-600 font-bold">
              +{formatCredits(opportunity.potentialCredits)} credits
            </p>
          </div>
        </div>
        {opportunity.actionUrl && (
          <Button asChild size="sm" variant="outline">
            <Link to={opportunity.actionUrl}>{opportunity.action}</Link>
          </Button>
        )}
      </div>
    </Card>
  )

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-4">💰</div>
            <p>Loading your wallet...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-brand flex items-center justify-center gap-2">
            <Wallet className="w-8 h-8 text-primary" />
            Credit Wallet
          </h1>
          <p className="text-muted-foreground">
            Track your time credits and transaction history
          </p>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCredits(balance?.availableCredits || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                ≈₦{((balance?.availableCredits || 0) * 1000).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCredits(balance?.totalEarned || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCredits(balance?.totalSpent || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                All time spending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Escrow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCredits(balance?.pendingCredits || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Locked in active trades
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="purchase">Buy Credits</TabsTrigger>
            <TabsTrigger value="opportunities">Earn More</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>
                  Your latest credit activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center p-8">
                    <div className="text-4xl mb-4">💸</div>
                    <h3 className="font-semibold mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground">
                      Start trading to see your credit history here
                    </p>
                    <Button asChild className="mt-4">
                      <Link to="/discover">Start Trading</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {transactions.map(transaction => (
                      <TransactionItem key={transaction.id} transaction={transaction} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Earning Opportunities
                </CardTitle>
                <CardDescription>
                  Ways to earn more credits in the Nigerian business network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {opportunities.map((opportunity, index) => (
                    <OpportunityCard key={index} opportunity={opportunity} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>💡 Credit Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-sm">Legal and Tech services typically earn the highest credits per hour</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-sm">Complete trades quickly to build trust and earn bonus credits</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-sm">Refer other Nigerian businesses to earn 10 credits per successful referral</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase" className="space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-brand">Purchase Time Credits</h2>
              <p className="text-muted-foreground">
                Buy time credits to access Nigerian business services without using cash
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {CREDIT_PACKAGES.map((creditPackage) => (
                <CreditPackageCard
                  key={creditPackage.id}
                  creditPackage={creditPackage}
                  onPurchaseSuccess={handlePurchaseSuccess}
                />
              ))}
            </div>

            <div className="mt-8">
              <PaymentMethodsInfo />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Credits Earned</span>
                    <span className="font-bold text-green-600">+{monthlySummary?.earned || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Credits Spent</span>
                    <span className="font-bold text-red-600">-{monthlySummary?.spent || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Net Credits</span>
                    <span className={`font-bold ${(monthlySummary?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(monthlySummary?.net || 0) >= 0 ? '+' : ''}{monthlySummary?.net || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Categories</CardTitle>
                  <CardDescription>Where you're earning the most</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(monthlySummary?.topCategories || {}).map(([category, credits]) => (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{category}</span>
                          <span className="font-medium">{credits} credits</span>
                        </div>
                        <Progress value={Math.min((credits as number) / 50 * 100, 100)} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>💰 Financial Impact</CardTitle>
                <CardDescription>How much money you've saved by trading time instead of paying cash</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ₦{((monthlySummary?.earned || 0) * 1000).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Earned This Month</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      ₦{((balance?.totalEarned || 0) * 1000).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Value Earned</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {monthlySummary?.transactionCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Trades This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Settings</CardTitle>
                <CardDescription>Manage your credit wallet preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Get notified about credit transactions</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Monthly Statements</h4>
                    <p className="text-sm text-muted-foreground">Receive monthly credit summaries</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-Save Goals</h4>
                    <p className="text-sm text-muted-foreground">Set monthly credit saving targets</p>
                  </div>
                  <Button variant="outline" size="sm">Set Goals</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}