/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // Environment
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production'

  // Analytics & Monitoring
  readonly VITE_SENTRY_DSN: string
  readonly VITE_GA_TRACKING_ID: string

  // Nigerian Business Context
  readonly VITE_PAYSTACK_PUBLIC_KEY: string
  readonly VITE_FLUTTERWAVE_PUBLIC_KEY: string

  // API Configuration
  readonly VITE_API_BASE_URL: string

  // Feature Flags
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_ERROR_MONITORING: string
  readonly VITE_ENABLE_DEBUG_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global constants injected by Vite
declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string