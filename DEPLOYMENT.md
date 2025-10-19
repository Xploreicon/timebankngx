# TimeBank NG - Deployment Guide

## Environment Setup

### Local Development
1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in `.env`

3. Start development server:
   ```bash
   npm run dev
   ```

### Production Deployment on Vercel

#### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Xploreicon/time-buoy-ng.git)

#### Manual Setup
1. **Connect Repository**
   - Connect your GitHub repository to Vercel
   - Import the `time-buoy-ng` project

2. **Configure Environment Variables**
   Add the following environment variables in your Vercel project settings:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_ENVIRONMENT=production
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_ERROR_MONITORING=true
   VITE_ENABLE_DEBUG_MODE=false
   ```

3. **Deploy Commands**
   - Build Command: `npm run build:prod`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Custom Domain (Optional)**
   - Add your custom domain in Vercel project settings
   - Configure DNS settings as instructed

### Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_ENVIRONMENT` | Current environment | ✅ | `production` |
| `VITE_SENTRY_DSN` | Sentry error monitoring | ❌ | `https://xyz@sentry.io/123` |
| `VITE_GA_TRACKING_ID` | Google Analytics ID | ❌ | `G-XXXXXXXXXX` |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack public key | ❌ | `pk_live_xxx` |
| `VITE_FLUTTERWAVE_PUBLIC_KEY` | Flutterwave public key | ❌ | `FLWPUBK_xxx` |

### Performance Optimizations

The production build includes:

- ✅ **Code Splitting**: Automatic vendor and route-based chunking
- ✅ **Tree Shaking**: Remove unused code
- ✅ **Minification**: Terser minification with console.log removal
- ✅ **Asset Optimization**: Optimized asset file names and caching
- ✅ **Bundle Analysis**: Use `npm run analyze` to analyze bundle size

### Security Headers

Production deployment includes:
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy

### Monitoring Setup

1. **Error Monitoring**: Configure Sentry DSN
2. **Analytics**: Set up Google Analytics tracking
3. **Performance**: Monitor Core Web Vitals in Vercel dashboard

### Nigerian Business Features

For full functionality, configure:
- Paystack integration for payments
- Flutterwave for alternative payments
- SMS providers for phone verification

### Troubleshooting

#### Build Failures
- Ensure all required environment variables are set
- Check TypeScript errors with `npm run type-check`
- Verify dependencies with `npm install`

#### Runtime Errors
- Check browser console for environment variable issues
- Verify Supabase connection and RLS policies
- Monitor error tracking (Sentry) for production issues

### Rollback Strategy

- Use Vercel's deployment rollback feature
- Keep previous environment variable configurations
- Test changes in staging environment first

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test build locally with `npm run build:prod`
4. Contact support with specific error messages