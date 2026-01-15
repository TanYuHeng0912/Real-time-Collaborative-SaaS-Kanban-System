-- Fix workspace_role column type mismatch
-- Change the column from enum type to VARCHAR to match JPA @Enumerated(EnumType.STRING)

-- First, add a new VARCHAR column
ALTER TABLE workspace_members ADD COLUMN role_temp VARCHAR(20);

-- Copy data from enum column to VARCHAR column (cast to text)
UPDATE workspace_members SET role_temp = role::text;

-- Drop the old enum column
ALTER TABLE workspace_members DROP COLUMN role;

-- Rename the new column
ALTER TABLE workspace_members RENAME COLUMN role_temp TO role;

-- Add NOT NULL constraint
ALTER TABLE workspace_members ALTER COLUMN role SET NOT NULL;

-- Add default value
ALTER TABLE workspace_members ALTER COLUMN role SET DEFAULT 'MEMBER';

-- Optional: Drop the enum type if not used elsewhere (uncomment if needed)
-- DROP TYPE IF EXISTS workspace_role;

