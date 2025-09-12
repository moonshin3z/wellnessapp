CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Asegurar columna user_id existe (ya la tienes en V2, pero por si acaso)
ALTER TABLE assessment_results
  ADD COLUMN IF NOT EXISTS user_id BIGINT;

ALTER TABLE assessment_results
  DROP CONSTRAINT IF EXISTS fk_results_user,
  ADD CONSTRAINT fk_results_user
    FOREIGN KEY (user_id) REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
