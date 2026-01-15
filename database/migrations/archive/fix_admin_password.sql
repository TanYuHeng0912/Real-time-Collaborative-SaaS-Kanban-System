-- Fix Admin User Password
-- This script updates/creates the admin user with password "password"
-- Run this in pgAdmin Query Tool if login fails
-- 
-- NOTE: The password hash below should match "password"
-- If this doesn't work, you may need to generate a new BCrypt hash
-- using the application's PasswordEncoder

-- First, try to update existing admin user
UPDATE users 
SET 
    password_hash = '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.H/HiKl.Js8LvK9r7KHLeK',
    role = 'ADMIN',
    email = 'admin@example.com',
    full_name = 'System Administrator',
    is_deleted = FALSE,
    updated_at = NOW()
WHERE username = 'admin';

-- If no rows were updated (user doesn't exist), insert it
INSERT INTO users (username, email, password_hash, full_name, role, is_deleted, created_at, updated_at)
SELECT 
    'admin',
    'admin@example.com',
    '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.H/HiKl.Js8LvK9r7KHLeK',
    'System Administrator',
    'ADMIN',
    FALSE,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Verify admin user exists and check details
SELECT username, email, role, full_name, is_deleted, 
       LEFT(password_hash, 20) || '...' as password_hash_preview
FROM users WHERE username = 'admin';

