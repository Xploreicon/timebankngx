import { lazy, Suspense, ComponentType } from 'react'
import { Loader2 } from 'lucide-react'

// Generic loading component for lazy components
export const ComponentLoading = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

// HOC to wrap components with loading state
export function withLazyLoading<T extends object>(
  Component: ComponentType<T>,
  loadingMessage?: string
) {
  return function LazyWrappedComponent(props: T) {
    return (
      <Suspense fallback={<ComponentLoading message={loadingMessage} />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Heavy chart components - these are the main bundle size culprits
export const LazyTimeFlowChart = lazy(() =>
  import('@/components/analytics/TimeFlowChart').then(module => ({
    default: module.TimeFlowChart
  }))
);

export const LazyNetworkGraph = lazy(() =>
  import('@/components/analytics/NetworkGraph').then(module => ({
    default: module.NetworkGraph
  }))
);

// Create wrapped chart components with proper loading
export const TimeFlowChartWithLoading = withLazyLoading(
  LazyTimeFlowChart,
  "Loading time flow charts..."
);

export const NetworkGraphWithLoading = withLazyLoading(
  LazyNetworkGraph,
  "Loading network visualization..."
);

// Placeholder components for future features - use dynamic imports with fallbacks
export const LazyNigerianPaymentSetup = lazy(() =>
  Promise.resolve().then(() => ({
    default: () => (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
        <h3 className="font-semibold mb-2">Payment Setup</h3>
        <p>Paystack integration coming soon</p>
      </div>
    )
  }))
);

export const LazyNigerianBankVerification = lazy(() =>
  Promise.resolve().then(() => ({
    default: () => (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
        <h3 className="font-semibold mb-2">Bank Verification</h3>
        <p>Nigerian bank verification coming soon</p>
      </div>
    )
  }))
);