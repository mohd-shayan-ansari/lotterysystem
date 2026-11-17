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

-- 2. Create lottery_results table (ONLY sl, gl, dm — NO andar, bahar, or result)
CREATE TABLE IF NOT EXISTS lottery_results (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    sl TEXT NOT NULL DEFAULT '0',
    gl TEXT NOT NULL DEFAULT '0',
    dm TEXT NOT NULL DEFAULT '0',
    is_confirmed BOOLEAN DEFAULT false,
    is_day_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, time)
);

-- Remove legacy columns if the table already existed previously
ALTER TABLE lottery_results DROP COLUMN IF EXISTS andar;
ALTER TABLE lottery_results DROP COLUMN IF EXISTS bahar;
ALTER TABLE lottery_results DROP COLUMN IF EXISTS result;

CREATE INDEX IF NOT EXISTS idx_lottery_date ON lottery_results(date);

-- Enable realtime safely (skip if already a member to prevent error 42710)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'shared_state'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE shared_state;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'lottery_results'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE lottery_results;
    END IF;
END $$;


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

-- DROP ALL previous overloads of update_lottery_result dynamically to eliminate candidate collision
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure::text AS func_sig
        FROM pg_proc
        WHERE proname = 'update_lottery_result'
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- Update lottery result function (strictly SL / GL / DM only)
CREATE OR REPLACE FUNCTION update_lottery_result(
    p_date TEXT,
    p_time TEXT,
    p_sl TEXT,
    p_gl TEXT,
    p_dm TEXT,
    p_password TEXT DEFAULT ''
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

    INSERT INTO lottery_results (date, time, sl, gl, dm, is_confirmed, updated_at)
    VALUES (p_date::DATE, p_time, p_sl, p_gl, p_dm, true, CURRENT_TIMESTAMP)
    ON CONFLICT (date, time) DO UPDATE
    SET sl = EXCLUDED.sl,
        gl = EXCLUDED.gl,
        dm = EXCLUDED.dm,
        is_confirmed = true,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION update_state(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION delete_state(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_day_visibility(TEXT, BOOLEAN, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_lottery_result(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

-- 5. Row Level Security (RLS)
ALTER TABLE lottery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_results" ON lottery_results;
CREATE POLICY "public_read_results" ON lottery_results
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_state" ON shared_state;
CREATE POLICY "public_read_state" ON shared_state
    FOR SELECT USING (true);

-- 6. Insert initial seed data for today so table is not empty
DO $$
DECLARE
    v_time TEXT;
    v_times TEXT[] := ARRAY[
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00', '19:30', '20:00'
    ];
BEGIN
    FOREACH v_time IN ARRAY v_times LOOP
        INSERT INTO lottery_results (date, time, sl, gl, dm, is_confirmed, is_day_visible)
        VALUES (
            CURRENT_DATE,
            v_time,
            floor(random() * 10)::TEXT,
            floor(random() * 10)::TEXT,
            floor(random() * 10)::TEXT,
            false,
            true
        )
        ON CONFLICT (date, time) DO NOTHING;
    END LOOP;
END $$;
