-- ============================================================================
-- PERFORMANCE OPTIMIZATION MIGRATION
-- Production-ready indexes for Nigerian time-banking platform
-- ============================================================================

-- ============================================
-- 1) USER PROFILE PERFORMANCE INDEXES
-- ============================================

-- Primary lookup patterns for user discovery
CREATE INDEX IF NOT EXISTS idx_profiles_discovery
  ON public.profiles (is_onboarded, phone_verified, location, category)
  WHERE phone_verified = true;

-- Trust score and rating lookups for matching algorithm
CREATE INDEX IF NOT EXISTS idx_profiles_trust_rating
  ON public.profiles (trust_score DESC, average_rating DESC, total_trades_completed DESC)
  WHERE is_onboarded = true;

-- Location-based searches (Nigerian states/cities)
CREATE INDEX IF NOT EXISTS idx_profiles_location_active
  ON public.profiles (location, is_onboarded, created_at DESC)
  WHERE phone_verified = true;

-- Response time optimisation for matching
CREATE INDEX IF NOT EXISTS idx_profiles_response_performance
  ON public.profiles (average_response_hours ASC, success_rate DESC)
  WHERE is_onboarded = true;

-- ============================================
-- 2) SERVICES PERFORMANCE INDEXES
-- ============================================

-- Main service discovery by category and availability
CREATE INDEX IF NOT EXISTS idx_services_category_available
  ON public.services (category, is_available, created_at DESC)
  WHERE is_available = true;

-- Price range searches for Nigerian market
CREATE INDEX IF NOT EXISTS idx_services_pricing
  ON public.services (category, base_hourly_rate, credits_per_hour)
  WHERE is_available = true;

-- Skills and rating-based searches
CREATE INDEX IF NOT EXISTS idx_services_skill_rating
  ON public.services (skill_level, average_rating DESC NULLS LAST, completed_orders DESC)
  WHERE is_available = true;

-- Geographic coverage for Nigerian locations
CREATE INDEX IF NOT EXISTS idx_services_coverage_areas
  ON public.services USING GIN (coverage_areas)
  WHERE is_available = true AND coverage_areas IS NOT NULL;

-- Service search by tags (Nigerian business context)
CREATE INDEX IF NOT EXISTS idx_services_tags_search
  ON public.services USING GIN (tags)
  WHERE is_available = true AND array_length(tags, 1) > 0;

-- ============================================
-- 3) TRADES PERFORMANCE INDEXES
-- ============================================

-- User's active trades (most common query)
CREATE INDEX IF NOT EXISTS idx_trades_user_active
  ON public.trades (proposer_id, status, created_at DESC)
  WHERE status IN ('pending', 'negotiating', 'accepted', 'active');

CREATE INDEX IF NOT EXISTS idx_trades_provider_active
  ON public.trades (provider_id, status, created_at DESC)
  WHERE status IN ('pending', 'negotiating', 'accepted', 'active');

-- Trade history and analytics
CREATE INDEX IF NOT EXISTS idx_trades_user_history
  ON public.trades (proposer_id, completed_at DESC NULLS LAST, status);

CREATE INDEX IF NOT EXISTS idx_trades_provider_history
  ON public.trades (provider_id, completed_at DESC NULLS LAST, status);

-- Financial tracking and escrow
CREATE INDEX IF NOT EXISTS idx_trades_financial
  ON public.trades (status, escrow_credits, created_at DESC)
  WHERE escrow_credits > 0;

-- Deadline tracking for Nigerian business efficiency
CREATE INDEX IF NOT EXISTS idx_trades_deadlines
  ON public.trades (delivery_deadline, status)
  WHERE delivery_deadline IS NOT NULL AND status IN ('accepted', 'active');

-- Priority-based trade processing
CREATE INDEX IF NOT EXISTS idx_trades_priority
  ON public.trades (priority_level, created_at, status)
  WHERE status = 'pending';

-- ============================================
-- 4) CREDIT TRANSACTIONS PERFORMANCE INDEXES
-- ============================================

-- User transaction history (primary use case)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_history
  ON public.credit_transactions (user_id, created_at DESC, transaction_type);

-- Financial audit and balance verification
CREATE INDEX IF NOT EXISTS idx_credit_transactions_audit
  ON public.credit_transactions (user_id, processed_at DESC, amount)
  WHERE reversed_at IS NULL;

-- Trade-related transaction tracking
CREATE INDEX IF NOT EXISTS idx_credit_transactions_trades
  ON public.credit_transactions (trade_id, transaction_type, created_at DESC)
  WHERE trade_id IS NOT NULL;

-- Reference number lookups for dispute resolution
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference
  ON public.credit_transactions (reference_number)
  WHERE reversed_at IS NULL;

-- Counterparty transaction analysis
CREATE INDEX IF NOT EXISTS idx_credit_transactions_counterparty
  ON public.credit_transactions (user_id, counterparty_id, created_at DESC)
  WHERE counterparty_id IS NOT NULL;

-- ============================================
-- 5) TRADE MESSAGES PERFORMANCE INDEXES
-- ============================================

-- Message thread retrieval (most common)
CREATE INDEX IF NOT EXISTS idx_trade_messages_thread
  ON public.trade_messages (trade_id, created_at ASC);

-- Unread messages for notifications
CREATE INDEX IF NOT EXISTS idx_trade_messages_unread
  ON public.trade_messages (trade_id, is_read, created_at DESC)
  WHERE is_read = false;

-- User's message activity
CREATE INDEX IF NOT EXISTS idx_trade_messages_sender
  ON public.trade_messages (sender_id, created_at DESC);

-- WhatsApp integration tracking (Nigerian context)
CREATE INDEX IF NOT EXISTS idx_trade_messages_whatsapp
  ON public.trade_messages (trade_id, is_whatsapp_forwarded, created_at DESC)
  WHERE is_whatsapp_forwarded = true;

-- System messages filtering
CREATE INDEX IF NOT EXISTS idx_trade_messages_system
  ON public.trade_messages (trade_id, is_system_message, created_at ASC)
  WHERE is_system_message = true;

-- ============================================
-- 6) ADDITIONAL PRODUCTION TABLES INDEXES
-- ============================================

-- TIME LOGS performance
CREATE INDEX IF NOT EXISTS idx_time_logs_trade_user
  ON public.time_logs (trade_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_logs_approval_pending
  ON public.time_logs (is_approved, created_at DESC)
  WHERE is_approved IS NULL;

-- REFERRALS performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.referrals (referrer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_user
  ON public.referrals (referred_user_id, created_at DESC)
  WHERE referred_user_id IS NOT NULL;

-- NOTIFICATIONS performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_type_priority
  ON public.notifications (type, priority, created_at DESC);

-- REVIEWS performance
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_rating
  ON public.reviews (reviewee_id, overall_rating DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_trade
  ON public.reviews (trade_id);

CREATE INDEX IF NOT EXISTS idx_reviews_service
  ON public.reviews (service_id)
  WHERE service_id IS NOT NULL;

-- ACHIEVEMENTS performance
CREATE INDEX IF NOT EXISTS idx_achievements_user_progress
  ON public.achievements (user_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_achievements_key_level
  ON public.achievements (achievement_key, level);

-- DISPUTES performance
CREATE INDEX IF NOT EXISTS idx_disputes_trade
  ON public.disputes (trade_id);

CREATE INDEX IF NOT EXISTS idx_disputes_reporter
  ON public.disputes (reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_disputes_mediator
  ON public.disputes (mediator_id, created_at DESC)
  WHERE mediator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_disputes_status
  ON public.disputes (status, created_at DESC);

-- ============================================
-- 7) COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================

-- Nigerian business matching algorithm optimization
CREATE INDEX IF NOT EXISTS idx_profiles_matching_algorithm
  ON public.profiles (category, location, trust_score DESC, average_response_hours ASC, is_onboarded)
  WHERE phone_verified = true;

-- Service recommendation engine
CREATE INDEX IF NOT EXISTS idx_services_recommendations
  ON public.services (category, skill_level, average_rating DESC, base_hourly_rate ASC)
  WHERE is_available = true;

-- Trade completion analytics
CREATE INDEX IF NOT EXISTS idx_trades_completion
  ON public.trades (status, completed_at, proposer_rating, provider_rating)
  WHERE status IN ('completed', 'cancelled');

-- Financial reporting and reconciliation
CREATE INDEX IF NOT EXISTS idx_financial_reconciliation
  ON public.credit_transactions (processed_at, transaction_type, amount)
  WHERE reversed_at IS NULL;

-- ============================================
-- 8) TEXT SEARCH OPTIMIZATION
-- ============================================

-- Full-text search for services (Nigerian business names and descriptions)
CREATE INDEX IF NOT EXISTS idx_services_fulltext_search
  ON public.services USING GIN (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
  ) WHERE is_available = true;

-- Profile search by display name and bio
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext_search
  ON public.profiles USING GIN (
    to_tsvector('english', COALESCE(display_name, '') || ' ' || COALESCE(bio, ''))
  ) WHERE is_onboarded = true AND phone_verified = true;

-- ============================================
-- 9) MONITORING AND MAINTENANCE INDEXES
-- ============================================

-- Database maintenance and cleanup
CREATE INDEX IF NOT EXISTS idx_profiles_cleanup
  ON public.profiles (created_at, is_onboarded)
  WHERE is_onboarded = false;

CREATE INDEX IF NOT EXISTS idx_trades_cleanup
  ON public.trades (created_at, status)
  WHERE status IN ('cancelled', 'completed');

-- Performance monitoring
CREATE INDEX IF NOT EXISTS idx_credit_transactions_volume
  ON public.credit_transactions (created_at, transaction_type);

CREATE INDEX IF NOT EXISTS idx_system_activity
  ON public.trade_messages (created_at, message_type)
  WHERE is_system_message = true;

-- ============================================
-- 10) RATE LIMITING AND SECURITY INDEXES
-- ============================================

-- Rate limiting support (from security migration)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
  ON public.rate_limits (user_id, action_type, created_at DESC);

-- Security audit performance
CREATE INDEX IF NOT EXISTS idx_security_audit_monitoring
  ON public.security_audit_log (event_type, created_at DESC, risk_score DESC)
  WHERE success = false OR risk_score > 50;

-- ============================================
-- 11) NIGERIAN TIMEZONE OPTIMIZATION
-- ============================================

-- Ensure timestamp indexes consider West Africa Time (WAT)
CREATE INDEX IF NOT EXISTS idx_profiles_nigerian_activity
  ON public.profiles (last_active_at DESC, is_onboarded)
  WHERE phone_verified = true;

CREATE INDEX IF NOT EXISTS idx_trades_nigerian_timeline
  ON public.trades (created_at DESC, status, priority_level);

CREATE INDEX IF NOT EXISTS idx_notifications_nigerian_delivery
  ON public.notifications (created_at DESC, user_id, is_read)
  WHERE is_read = false;

-- ============================================
-- 12) STATISTICS AND ANALYTICS
-- ============================================

-- Update table statistics for better query planning
ANALYZE public.profiles;
ANALYZE public.services;
ANALYZE public.trades;
ANALYZE public.credit_transactions;
ANALYZE public.trade_messages;

-- Set statistics targets for important columns
ALTER TABLE public.profiles ALTER COLUMN trust_score SET STATISTICS 1000;
ALTER TABLE public.profiles ALTER COLUMN location SET STATISTICS 1000;
ALTER TABLE public.profiles ALTER COLUMN category SET STATISTICS 1000;

ALTER TABLE public.services ALTER COLUMN category SET STATISTICS 1000;
ALTER TABLE public.services ALTER COLUMN base_hourly_rate SET STATISTICS 1000;
ALTER TABLE public.services ALTER COLUMN average_rating SET STATISTICS 1000;

ALTER TABLE public.trades ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE public.trades ALTER COLUMN exchange_rate SET STATISTICS 1000;

-- ============================================
-- 13) INDEX USAGE MONITORING
-- ============================================

-- Create view for index usage monitoring (for production monitoring)
CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  idx_tup_read::float / GREATEST(idx_scan, 1) AS avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Grant access to monitoring view
GRANT SELECT ON public.index_usage_stats TO authenticated;
