ALTER TABLE payments ADD COLUMN IF NOT EXISTS renewal_applied_at TIMESTAMP;

-- Existing verified renewal orders may already have extended a subscription.
-- Mark them consumed rather than allowing an old order to extend it again.
UPDATE payments SET renewal_applied_at = COALESCE(verified_at, created_at, CURRENT_TIMESTAMP)
WHERE sub_admin_id IS NOT NULL AND status = 'paid' AND renewal_applied_at IS NULL;
