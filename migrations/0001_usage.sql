CREATE TABLE IF NOT EXISTS usage_reservations (
 id TEXT PRIMARY KEY,
 day TEXT NOT NULL,
 visitor TEXT NOT NULL,
 created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_day ON usage_reservations(day);
CREATE INDEX IF NOT EXISTS usage_visitor_time ON usage_reservations(visitor, created);
