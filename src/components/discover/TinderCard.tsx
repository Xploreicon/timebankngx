import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, Star, TrendingUp, ArrowRightLeft, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NIGERIAN_CATEGORIES } from '@/config/categories'
import { Progress } from '@/components/ui/progress'

type LoopRelation = 'deliver_to' | 'receive_from' | 'mutual'

export interface LoopPartner {
  userId: string
  userName: string
  location?: string
  offersCategory: string
  needsCategory: string
  trustScore: number
  relation: LoopRelation
  hoursTheyProvide: number
  hoursYouProvide: number
}

export interface TinderCardMatch {
  type: '2-way' | '3-way'
  score: number
  groupId?: string
  participantId?: string
  userB: {
    userId: string
    userName: string
    location?: string
    category: string
    offersCategory: string
    needsCategory: string
    hoursOffered: number
    trustScore: number
  }
  exchangeRateAtoB: number
  exchangeRateBtoA: number
  isBalancedTrade: boolean
  estimatedSavings: { userA: number; userB: number }
  myOfferCategory: string
  myNeedCategory: string
  loopPartners: LoopPartner[]
}

interface TinderCardProps {
  match: TinderCardMatch
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onInfo: () => void
  style?: React.CSSProperties
}

export const TinderCard = ({ match, onSwipeLeft, onSwipeRight, onInfo, style }: TinderCardProps) => {
  const [exitX, setExitX] = useState(0)
  const [activePartnerIndex, setActivePartnerIndex] = useState(0)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-20, 20])
  const opacity = useTransform(x, [-240, -120, 0, 120, 240], [0, 1, 1, 1, 0])
  const passOpacity = useTransform(x, [-120, -60, 0], [1, 0.4, 0])
  const tradeOpacity = useTransform(x, [0, 60, 120], [0, 0.4, 1])

  useEffect(() => {
    setActivePartnerIndex(0)
    setExitX(0)
    x.set(0)
  }, [match.groupId, x])

  const partnerList = match.loopPartners.length > 0
    ? match.loopPartners
    : [{
        userId: match.userB.userId,
        userName: match.userB.userName,
        location: match.userB.location,
        offersCategory: match.userB.offersCategory,
        needsCategory: match.userB.needsCategory,
        trustScore: match.userB.trustScore,
        relation: 'mutual' as LoopRelation,
        hoursTheyProvide: match.userB.hoursOffered,
        hoursYouProvide: match.userB.hoursOffered
      }]

  const activePartner = partnerList[activePartnerIndex] ?? partnerList[0]

  const category = useMemo(() => NIGERIAN_CATEGORIES.find(c =>
    c.id === activePartner?.offersCategory || c.name === activePartner?.offersCategory
  ), [activePartner?.offersCategory])

  const needsCategory = useMemo(() => NIGERIAN_CATEGORIES.find(c =>
    c.id === activePartner?.needsCategory || c.name === activePartner?.needsCategory
  ), [activePartner?.needsCategory])

  const myOfferCategory = useMemo(() => NIGERIAN_CATEGORIES.find(c =>
    c.id === match.myOfferCategory || c.name === match.myOfferCategory
  ), [match.myOfferCategory])

  const myNeedCategory = useMemo(() => NIGERIAN_CATEGORIES.find(c =>
    c.id === match.myNeedCategory || c.name === match.myNeedCategory
  ), [match.myNeedCategory])

  const receivePartner = useMemo(() => partnerList.find(
    partner => partner.relation === 'receive_from' || partner.relation === 'mutual'
  ) ?? partnerList[0], [partnerList])

  const deliverPartner = useMemo(() => partnerList.find(
    partner => partner.relation === 'deliver_to' && partner.userId !== receivePartner.userId
  ) ?? receivePartner, [partnerList, receivePartner])

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-500 text-white'
    if (score >= 70) return 'bg-blue-500 text-white'
    if (score >= 50) return 'bg-yellow-500 text-white'
    return 'bg-gray-500 text-white'
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      setExitX(200)
      onSwipeRight()
    } else if (info.offset.x < -100) {
      setExitX(-200)
      onSwipeLeft()
    }
  }

  return (
    <motion.div
      className="absolute w-full h-full"
      style={{
        x,
        rotate,
        opacity,
        ...style
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX * 2 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="relative w-full h-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent pointer-events-none" />

        <div className="flex-1 p-6 flex flex-col relative">
          <div className="flex items-center justify-between mb-5">
            <Badge className={`${getScoreColor(match.score)} text-sm font-semibold px-3 py-1.5`}>
              🎯 {match.score}% Match
            </Badge>
            <div className="flex items-center gap-2">
              <div className="w-24">
                <Progress value={match.score} className="h-1.5" />
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={onInfo}
                className="rounded-full hover:bg-primary/10"
                aria-label="More info"
              >
                <Info className="w-4 h-4 text-primary" />
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-4 flex-col sm:flex-row sm:items-center sm:gap-6">
            <div className="w-28 h-28 shrink-0 rounded-2xl bg-gradient-to-tr from-primary/25 via-accent/30 to-white flex items-center justify-center text-5xl shadow-inner border border-white">
              {category?.icon || '👤'}
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h2 className="text-3xl font-brand font-semibold">{activePartner.userName}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-muted-foreground text-sm">
                {activePartner.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {activePartner.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Trust {activePartner.trustScore.toFixed(1)}
                </span>
                <Badge variant="outline" className="uppercase tracking-wide text-xs">
                  {activePartner.relation === 'receive_from'
                    ? 'You receive from'
                    : activePartner.relation === 'deliver_to'
                      ? 'You deliver to'
                      : 'Mutual partner'}
                </Badge>
              </div>
            </div>
          </div>

          {partnerList.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {partnerList.map((partner, index) => {
                const isActive = index === activePartnerIndex
                const label = partner.relation === 'receive_from'
                  ? 'You receive from'
                  : partner.relation === 'deliver_to'
                    ? 'You deliver to'
                    : 'Mutual partner'

                return (
                  <Button
                    key={partner.userId}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full h-9 px-3"
                    onClick={() => setActivePartnerIndex(index)}
                  >
                    <div className="flex flex-col leading-tight text-left">
                      <span className="text-xs font-semibold">{partner.userName}</span>
                      <span className="text-[10px] uppercase tracking-wide opacity-80">
                        {label}
                      </span>
                    </div>
                  </Button>
                )
              })}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="text-xs uppercase tracking-wide text-primary/70">
                They offer
              </div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {category?.icon} {category?.name || activePartner.offersCategory}
              </div>
              <div className="text-xs text-muted-foreground">
                {activePartner.hoursTheyProvide} hrs available this cycle
              </div>
            </div>
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 space-y-2">
              <div className="text-xs uppercase tracking-wide text-accent-foreground/80">
                They need
              </div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {needsCategory?.icon} {needsCategory?.name || activePartner.needsCategory}
              </div>
              <div className="text-xs text-muted-foreground">
                Exchange rate proposes {match.exchangeRateBtoA.toFixed(1)} hrs from you
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4">
              <div className="text-xs font-semibold text-green-600 tracking-wide uppercase">
                Potential Savings
              </div>
              <div className="text-2xl font-bold text-green-700 mt-1">
                ₦{match.estimatedSavings.userA.toLocaleString()}
              </div>
              <div className="text-xs text-green-700 mt-1">
                by trading time instead of cash
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Match insights
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fair trade</span>
                <span className="font-medium">{match.isBalancedTrade ? '✅ Balanced' : 'Review terms'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exchange parity</span>
                <span className="font-medium">
                  1:{match.exchangeRateBtoA.toFixed(1)} hrs
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>You receive from</span>
                <span className="font-medium text-foreground">
                  {receivePartner.userName}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>You deliver to</span>
                <span className="font-medium text-foreground">
                  {deliverPartner.userName}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2 justify-center sm:justify-start">
              <TrendingUp className="w-4 h-4 text-primary" />
              Proposed exchange
            </div>

            <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <div className="text-xs text-blue-600 font-semibold uppercase">You offer</div>
                  <div className="text-sm font-bold">
                    {deliverPartner.hoursYouProvide.toFixed(1)} hrs of {myOfferCategory?.name || match.myOfferCategory}
                  </div>
                </div>
              </div>

              <div className="text-primary">
                <ArrowRightLeft className="w-6 h-6 mx-auto" />
              </div>

              <div className="p-3 rounded-lg border border-green-200 bg-green-50 flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <div className="text-xs text-green-600 font-semibold uppercase">You get</div>
                  <div className="text-sm font-bold">
                    {receivePartner.hoursTheyProvide.toFixed(1)} hrs of {NIGERIAN_CATEGORIES.find(c =>
                      c.id === receivePartner.offersCategory || c.name === receivePartner.offersCategory
                    )?.name || receivePartner.offersCategory}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 text-center text-xs text-muted-foreground">
            Swipe left to pass • Swipe right to trade • Press ↑ for more details
          </div>
        </div>
      </div>

      <motion.div
        className="absolute top-1/2 left-8 transform -translate-y-1/2"
        style={{ opacity: passOpacity }}
      >
        <div className="bg-red-500 text-white text-4xl font-bold rounded-full w-20 h-20 flex items-center justify-center shadow-lg rotate-[-20deg]">
          ❌
        </div>
      </motion.div>

      <motion.div
        className="absolute top-1/2 right-8 transform -translate-y-1/2"
        style={{ opacity: tradeOpacity }}
      >
        <div className="bg-green-500 text-white text-4xl font-bold rounded-full w-20 h-20 flex items-center justify-center shadow-lg rotate-[20deg]">
          ❤️
        </div>
      </motion.div>
    </motion.div>
  )
}
