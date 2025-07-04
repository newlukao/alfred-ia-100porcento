ALTER TABLE users ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;
-- Opcional: criar índice para facilitar buscas por bloqueados
CREATE INDEX idx_users_is_blocked ON users(is_blocked); 