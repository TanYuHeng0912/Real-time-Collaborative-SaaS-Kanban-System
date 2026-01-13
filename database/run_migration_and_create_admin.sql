-- Combined Migration and Admin User Creation Script
-- Run this script in pgAdmin Query Tool or via psql

-- ============================================
-- STEP 1: Run Migration (schema_v2.sql)
-- ============================================

-- Add user_role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to users table (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'USER';

-- Add last_modified_by to cards table (if not exists)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS last_modified_by BIGINT;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS fk_cards_last_modified_by;
ALTER TABLE cards ADD CONSTRAINT fk_cards_last_modified_by 
    FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_cards_last_modified_by ON cards(last_modified_by);

-- Update existing users to have USER role (if any exist)
UPDATE users SET role = 'USER' WHERE role IS NULL;

-- ============================================
-- STEP 2: Create Admin User
-- ============================================

-- Insert admin user
-- Password: password
-- BCrypt hash: $2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.H/HiKl.Js8LvK9r7KHLeK
INSERT INTO users (username, email, password_hash, full_name, role, is_deleted, created_at, updated_at)
VALUES (
    'admin',
    'admin@example.com',
    '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.H/HiKl.Js8LvK9r7KHLeK',
    'System Administrator',
    'ADMIN',
    FALSE,
    NOW(),
    NOW()
)
ON CONFLICT (username) DO UPDATE SET
    role = 'ADMIN',
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

-- Verify admin user was created
SELECT username, email, role, full_name FROM users WHERE username = 'admin';

