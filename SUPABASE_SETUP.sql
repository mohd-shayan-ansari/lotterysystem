-- ============================================================
-- SUPABASE SQL: Add visibility toggle feature
-- ============================================================
-- Run these commands in your Supabase SQL Editor

-- 1. Add the is_day_visible column to lottery_results table
ALTER TABLE lottery_results 
ADD COLUMN is_day_visible BOOLEAN DEFAULT true;

-- 2. Create the RPC function to toggle day visibility
CREATE OR REPLACE FUNCTION set_day_visibility(
    p_date TEXT,
    p_is_visible BOOLEAN,
    p_password TEXT
) RETURNS void AS $$
DECLARE
    v_correct_password TEXT;
BEGIN
    -- Get the correct admin password from shared_state table
    SELECT value INTO v_correct_password 
    FROM shared_state 
    WHERE key = 'lotteryAdminPassword';
    
    -- Default password if not found
    IF v_correct_password IS NULL THEN 
        v_correct_password := 'admin123'; 
    END IF;
    
    -- Check password
    IF p_password != v_correct_password THEN
        RAISE EXCEPTION 'Unauthorized: Incorrect admin password';
    END IF;
    
    -- Update visibility for all slots on that date
    UPDATE lottery_results 
    SET is_day_visible = p_is_visible 
    WHERE date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions for authenticated users to call this function
GRANT EXECUTE ON FUNCTION set_day_visibility(TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_day_visibility(TEXT, BOOLEAN, TEXT) TO anon;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify the column exists:
-- SELECT column_name FROM information_schema.columns WHERE table_name='lottery_results' AND column_name='is_day_visible';
--
-- Run this to verify the function exists:
-- SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'set_day_visibility');
