-- Update Admin Password with Generated BCrypt Hash
-- Run this in pgAdmin Query Tool

UPDATE users 
SET 
    password_hash = '$2a$12$qRkPrAvGyRccw0unfCAeBOZTl5oh1UTIaqUrBlUklJxu5BKKxLNky',
    role = 'ADMIN',
    email = 'admin@example.com',
    full_name = 'System Administrator',
    is_deleted = FALSE,
    updated_at = NOW()
WHERE username = 'admin';

-- If admin user doesn't exist, create it
INSERT INTO users (username, email, password_hash, full_name, role, is_deleted, created_at, updated_at)
SELECT 
    'admin',
    'admin@example.com',
    '$2a$12$qRkPrAvGyRccw0unfCAeBOZTl5oh1UTIaqUrBlUklJxu5BKKxLNky',
    'System Administrator',
    'ADMIN',
    FALSE,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Verify the update
SELECT username, email, role, full_name, is_deleted, 
       LEFT(password_hash, 30) || '...' as password_hash_preview
FROM users WHERE username = 'admin';

