-- Migration script to add board members and multiple card assignees
-- Run this script on your database

-- 1. Create board_members table for board-level user assignments
CREATE TABLE IF NOT EXISTS board_members (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_board_members_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_board_user_member UNIQUE (board_id, user_id, is_deleted)
);

CREATE INDEX idx_board_members_board_id ON board_members(board_id);
CREATE INDEX idx_board_members_user_id ON board_members(user_id);
CREATE INDEX idx_board_members_is_deleted ON board_members(is_deleted);

-- 2. Create card_assignees join table for multiple assignees
CREATE TABLE IF NOT EXISTS card_assignees (
    card_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (card_id, user_id),
    CONSTRAINT fk_card_assignees_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_card_assignees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_card_assignees_card_id ON card_assignees(card_id);
CREATE INDEX idx_card_assignees_user_id ON card_assignees(user_id);

-- 3. Migrate existing assigned_to data to card_assignees
INSERT INTO card_assignees (card_id, user_id)
SELECT id, assigned_to
FROM cards
WHERE assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Note: The assigned_to column in cards table will be kept for backward compatibility
-- but will be deprecated. New code should use card_assignees table.
-- You can drop the column later after confirming everything works:
-- ALTER TABLE cards DROP COLUMN assigned_to;
-- ALTER TABLE cards DROP CONSTRAINT fk_cards_assigned_to;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_board_members_updated_at BEFORE UPDATE ON board_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

