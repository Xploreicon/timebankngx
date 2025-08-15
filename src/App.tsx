import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Trades from "./pages/Trades";
import Services from "./pages/Services";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import TradeDetails from "./pages/TradeDetails";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/auth/AuthPage";
import AuthCallback from "./pages/auth/AuthCallback";
import OnboardingPage from "./pages/auth/OnboardingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import { AuthGuard } from "./routes/AuthGuard";
import { useAppStore } from "./store/appStore";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const queryClient = new QueryClient();

function AppContent() {
  useAuth() // Initialize auth state

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexWithRedirect />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard requireOnboarding><Dashboard /></AuthGuard>} />
        <Route path="/discover" element={<AuthGuard requireOnboarding><Discover /></AuthGuard>} />
        <Route path="/trades" element={<AuthGuard requireOnboarding><Trades /></AuthGuard>} />
        <Route path="/trades/:id" element={<AuthGuard requireOnboarding><TradeDetails /></AuthGuard>} />
        <Route path="/services" element={<AuthGuard requireOnboarding><Services /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard requireOnboarding><Profile /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard requireOnboarding><Settings /></AuthGuard>} />
        <Route path="/analytics" element={<AuthGuard requireOnboarding><AnalyticsPage /></AuthGuard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
