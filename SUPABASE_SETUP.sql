-- ============================================================
-- FULL SUPABASE SETUP FOR LOTTERY SYSTEM
-- ============================================================
-- Run these commands in your Supabase SQL Editor

-- 1. Create shared_state table (used for admin password and synced configs)
CREATE TABLE IF NOT EXISTS shared_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default admin password
INSERT INTO shared_state (key, value)
VALUES ('lotteryAdminPassword', 'matka123ratan')
ON CONFLICT (key) DO NOTHING;

-- 2. Create lottery_results table
CREATE TABLE IF NOT EXISTS lottery_results (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    andar TEXT,
    bahar TEXT,
    result TEXT,
    is_confirmed BOOLEAN DEFAULT false,
    is_day_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, time)
);

CREATE INDEX IF NOT EXISTS idx_lottery_date ON lottery_results(date);

-- Enable realtime for both tables
alter publication supabase_realtime add table shared_state;
alter publication supabase_realtime add table lottery_results;


-- 3. Create RPC functions for state management

-- Update state function
CREATE OR REPLACE FUNCTION update_state(
    p_key TEXT,
    p_value TEXT,
    p_password TEXT
) RETURNS void AS $$
DECLARE
    v_correct_password TEXT;
BEGIN
    SELECT value INTO v_correct_password 
    FROM shared_state 
    WHERE key = 'lotteryAdminPassword';
    
    IF v_correct_password IS NULL THEN 
        v_correct_password := 'matka123ratan'; 
    END IF;
    
    IF p_password != v_correct_password THEN
        RAISE EXCEPTION 'Unauthorized: Incorrect admin password';
    END IF;
    
    INSERT INTO shared_state (key, value, updated_at)
    VALUES (p_key, p_value, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete state function
CREATE OR REPLACE FUNCTION delete_state(
    p_key TEXT,
    p_password TEXT
) RETURNS void AS $$
DECLARE
    v_correct_password TEXT;
BEGIN
    SELECT value INTO v_correct_password 
    FROM shared_state 
    WHERE key = 'lotteryAdminPassword';
    
    IF v_correct_password IS NULL THEN 
        v_correct_password := 'matka123ratan'; 
    END IF;
    
    IF p_password != v_correct_password THEN
        RAISE EXCEPTION 'Unauthorized: Incorrect admin password';
    END IF;
    
    DELETE FROM shared_state WHERE key = p_key AND key != 'lotteryAdminPassword';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set day visibility function
CREATE OR REPLACE FUNCTION set_day_visibility(
    p_date TEXT,
    p_is_visible BOOLEAN,
    p_password TEXT
) RETURNS void AS $$
DECLARE
    v_correct_password TEXT;
BEGIN
    SELECT value INTO v_correct_password 
    FROM shared_state 
    WHERE key = 'lotteryAdminPassword';
    
    IF v_correct_password IS NULL THEN 
        v_correct_password := 'matka123ratan'; 
    END IF;
    
    IF p_password != v_correct_password THEN
        RAISE EXCEPTION 'Unauthorized: Incorrect admin password';
    END IF;
    
    UPDATE lottery_results 
    SET is_day_visible = p_is_visible 
    WHERE date = p_date::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update lottery result function
CREATE OR REPLACE FUNCTION update_lottery_result(
    p_date TEXT,
    p_time TEXT,
    p_andar TEXT,
    p_result TEXT,
    p_bahar TEXT,
    p_password TEXT
) RETURNS void AS $$
DECLARE
    v_correct_password TEXT;
BEGIN
    SELECT value INTO v_correct_password 
    FROM shared_state 
    WHERE key = 'lotteryAdminPassword';
    
    IF v_correct_password IS NULL THEN 
        v_correct_password := 'matka123ratan'; 
    END IF;
    
    IF p_password != v_correct_password THEN
        RAISE EXCEPTION 'Unauthorized: Incorrect admin password';
    END IF;
    
    INSERT INTO lottery_results (date, time, andar, result, bahar, is_confirmed, updated_at)
    VALUES (p_date::DATE, p_time, p_andar, p_result, p_bahar, true, CURRENT_TIMESTAMP)
    ON CONFLICT (date, time) DO UPDATE 
    SET andar = EXCLUDED.andar,
        result = EXCLUDED.result,
        bahar = EXCLUDED.bahar,
        is_confirmed = true,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION update_state(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION delete_state(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_day_visibility(TEXT, BOOLEAN, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_lottery_result(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

-- Note: In Supabase, the default RLS policy for newly created tables allows public access if RLS is not explicitly enabled.
