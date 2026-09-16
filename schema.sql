-- D1 lead store. Optional but recommended: it means a Resend outage or a
-- mistyped forwarding address can never lose a paying customer.
--
--   npx wrangler d1 create leadslist
--   npx wrangler d1 execute leadslist --remote --file=./schema.sql
--
-- Then bind it as `LEADS` in wrangler.jsonc, using the database_id printed by `d1 create`:
--
--   "d1_databases": [
--     { "binding": "LEADS", "database_name": "leadslist", "database_id": "<id>" }
--   ]
--
-- Not in the dashboard: `wrangler deploy` removes bindings that are not in the config.

-- If the table already exists from an earlier deploy, add the newer column instead:
--   ALTER TABLE leads ADD COLUMN quote_type TEXT;

CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  quote_type   TEXT,             -- 'In-home consultation' or 'Phone ballpark'
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL,
  city         TEXT,
  windows      TEXT,
  project      TEXT,
  timeframe    TEXT,
  message      TEXT,
  ip           TEXT,
  country      TEXT,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_submitted_at ON leads (submitted_at DESC);
