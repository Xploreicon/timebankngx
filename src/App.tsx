import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from "react-router-dom";
import { createQueryClient, cacheWarmers } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import { PageLoadingSpinner } from "@/components/common/PageLoadingSpinner";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const DiscoverTinder = lazy(() => import("./pages/DiscoverTinder"));
const Trades = lazy(() => import("./pages/Trades"));
const Services = lazy(() => import("./pages/Services"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const TradeDetails = lazy(() => import("./pages/TradeDetails"));
const TradeProposals = lazy(() => import("./pages/TradeProposals"));
const CreditWallet = lazy(() => import("./pages/CreditWallet"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const OnboardingPage = lazy(() => import("./pages/auth/OnboardingPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
import { AuthGuard } from "./routes/AuthGuard";
import { useAppStore } from "./store/appStore";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { initSentry, setSentryUser } from "./lib/sentry";
import { usePageTracking, usePerformanceObserver } from "@/hooks/usePerformanceMonitoring";
import { registerServiceWorker } from "./lib/offline";
import { logEnvironmentStatus } from "./lib/envCheck";
import { MobileNavigation, MobileHeader, MobileQuickActions } from "./components/layout/MobileNavigation";
import { OfflineIndicator } from "./components/common/OfflineIndicator";
import { MobilePWABanner } from "./components/common/MobilePWABanner";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import "./styles/mobile.css";

// Validate environment configuration on app startup
logEnvironmentStatus();

// Initialize Sentry
initSentry();

// Create optimized query client
const queryClient = createQueryClient();

// Sentry-wrapped router for performance monitoring
const SentryRoutes = Sentry.withSentryRouting(Routes);

function AppContent() {
  const { profile } = useAuth(); // Initialize auth state

  // Initialize performance monitoring and page tracking
  usePageTracking();
  usePerformanceObserver();

  // Set user context for Sentry and warm cache when profile changes
  useEffect(() => {
    if (profile) {
      setSentryUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        location: profile.location,
        category: profile.category,
        trustScore: profile.trust_score,
      });

      // Warm up cache with user's critical data
      cacheWarmers.warmUserCache(queryClient, profile.id).catch(console.warn);
      cacheWarmers.warmDiscoveryCache(queryClient).catch(console.warn);
    }
  }, [profile]);

  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <SentryRoutes>
        <Route path="/" element={<IndexWithRedirect />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard requireOnboarding><Dashboard /></AuthGuard>} />
        <Route path="/discover" element={<AuthGuard requireOnboarding><Discover /></AuthGuard>} />
        <Route path="/discover/swipe" element={<AuthGuard requireOnboarding><DiscoverTinder /></AuthGuard>} />
        <Route path="/trades" element={<AuthGuard requireOnboarding><Trades /></AuthGuard>} />
        <Route path="/trades/:id" element={<AuthGuard requireOnboarding><TradeDetails /></AuthGuard>} />
        <Route path="/proposals" element={<AuthGuard requireOnboarding><TradeProposals /></AuthGuard>} />
        <Route path="/wallet" element={<AuthGuard requireOnboarding><CreditWallet /></AuthGuard>} />
        <Route path="/services" element={<AuthGuard requireOnboarding><Services /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard requireOnboarding><Profile /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard requireOnboarding><Settings /></AuthGuard>} />
        <Route path="/analytics" element={<AuthGuard requireOnboarding><AnalyticsPage /></AuthGuard>} />
        <Route path="*" element={<NotFound />} />
      </SentryRoutes>
    </Suspense>
  )
}

// Component that wraps Index with redirect logic
function IndexWithRedirect() {
  const { isAuthenticated, isOnboarded } = useAppStore()
  const navigate = useNavigate()
  
  useEffect(() => {
    if (isAuthenticated) {
      if (isOnboarded) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [isAuthenticated, isOnboarded, navigate])
  
  return <Index />
}

function App() {
  // Only show DevTools in development mode (NOT in production builds)
  const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

  // Register service worker for offline capabilities
  useEffect(() => {
    registerServiceWorker().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            {/* Offline indicator - now uses toast notifications */}
            <OfflineIndicator />

            <AppContent />

            {/* Mobile navigation and features */}
            <MobileNavigation />
            <MobileQuickActions />
            <MobilePWABanner />

            {/* React Query DevTools - only in development, never in production */}
            {isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
          </TooltipProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
