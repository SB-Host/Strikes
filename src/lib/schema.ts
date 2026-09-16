export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS members (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    handle          TEXT NOT NULL UNIQUE,
    pin_hash        TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'MEMBER',
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    accent          TEXT NOT NULL DEFAULT 'slate',
    must_change_pin INTEGER NOT NULL DEFAULT 1,
    created_at      INTEGER NOT NULL,
    last_seen_at    INTEGER
  )`,

  `CREATE TABLE IF NOT EXISTS strikes (
    id                 TEXT PRIMARY KEY,
    member_id          TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    reason             TEXT NOT NULL,
    category           TEXT NOT NULL DEFAULT 'Other',
    weight             INTEGER NOT NULL DEFAULT 1,
    note               TEXT,
    task               TEXT,
    issued_by          TEXT NOT NULL REFERENCES members(id),
    issued_at          INTEGER NOT NULL,
    expires_at         INTEGER,
    status             TEXT NOT NULL DEFAULT 'ACTIVE',
    resolved_at        INTEGER,
    resolved_by        TEXT,
    resolution_note    TEXT,
    task_submitted_at  INTEGER,
    task_submitted_note TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS appeals (
    id           TEXT PRIMARY KEY,
    strike_id    TEXT NOT NULL REFERENCES strikes(id) ON DELETE CASCADE,
    member_id    TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    message      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'OPEN',
    created_at   INTEGER NOT NULL,
    resolved_at  INTEGER,
    resolved_by  TEXT,
    response     TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS events (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,
    actor_id   TEXT,
    member_id  TEXT,
    strike_id  TEXT,
    summary    TEXT NOT NULL,
    detail     TEXT,
    created_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_strikes_member ON strikes(member_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_strikes_issued ON strikes(issued_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status, created_at DESC)`,
];
