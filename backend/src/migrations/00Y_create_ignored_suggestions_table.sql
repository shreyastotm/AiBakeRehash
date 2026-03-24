-- Migration to support persisting ignored ingredient suggestions
CREATE TABLE IF NOT EXISTS ignored_ingredient_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE CASCADE,
    ignored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, source_id, target_id)
);

CREATE INDEX idx_ignored_suggestions_user ON ignored_ingredient_suggestions(user_id);
