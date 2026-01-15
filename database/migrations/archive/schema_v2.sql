-- Kanban System Database Schema v2
-- PostgreSQL
-- Added: User roles, last_modified_by tracking

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
ALTER TABLE cards ADD CONSTRAINT IF NOT EXISTS fk_cards_last_modified_by 
    FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_cards_last_modified_by ON cards(last_modified_by);

-- Update existing users to have USER role (if any exist)
UPDATE users SET role = 'USER' WHERE role IS NULL;

