// Environment variables validation for TimeBank
// Ensures all required configuration is present before app starts

interface EnvConfig {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_ENVIRONMENT?: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export const validateEnvironment = (): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Required variables
  const requiredVars: (keyof EnvConfig)[] = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]

  for (const varName of requiredVars) {
    const value = import.meta.env[varName]

    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`)
    } else if (value.includes('your_') || value.includes('_here')) {
      errors.push(`${varName} appears to be a placeholder. Please set actual value.`)
    }
  }

  // Optional but recommended variables
  if (!import.meta.env.VITE_ENVIRONMENT) {
    warnings.push('VITE_ENVIRONMENT not set, defaulting to development mode')
  }

  // Check for Paystack key (required for payments)
  if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
    warnings.push('VITE_PAYSTACK_PUBLIC_KEY not set - payment features will be disabled')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

export const logEnvironmentStatus = (): void => {
  const result = validateEnvironment()

  if (!result.isValid) {
    console.error('❌ Environment Configuration Errors:')
    result.errors.forEach(error => console.error(`  - ${error}`))
    console.error('\n💡 Please check your .env file and ensure all required variables are set.')
    console.error('See .env.example for reference.')
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment Configuration Warnings:')
    result.warnings.forEach(warning => console.warn(`  - ${warning}`))
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ Environment configuration valid')
  }
}

export const getEnvironmentInfo = () => ({
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  hasSupabase: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
  hasPaystack: !!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  hasSentry: !!import.meta.env.VITE_SENTRY_DSN,
})
