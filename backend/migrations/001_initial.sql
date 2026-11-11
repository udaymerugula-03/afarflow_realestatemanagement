CREATE TABLE agencies (
  id UUID PRIMARY KEY, name VARCHAR(150) NOT NULL
);
CREATE TABLE users (
  id UUID PRIMARY KEY, agency_id UUID NOT NULL REFERENCES agencies(id),
  full_name VARCHAR(150) NOT NULL, email VARCHAR(254) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin','agent'))
);
CREATE INDEX users_agency_idx ON users(agency_id);
CREATE TABLE sessions (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE properties (
  id UUID PRIMARY KEY, agency_id UUID NOT NULL REFERENCES agencies(id),
  reference_code VARCHAR(60) NOT NULL, title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL, purpose TEXT NOT NULL CHECK (purpose IN ('sale','rent')),
  type VARCHAR(60) NOT NULL, price NUMERIC(16,2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'PKR', area DOUBLE PRECISION NOT NULL CHECK (area > 0),
  area_unit TEXT NOT NULL CHECK (area_unit IN ('sq ft','marla','kanal')),
  bedrooms INTEGER NOT NULL DEFAULT 0, bathrooms INTEGER NOT NULL DEFAULT 0,
  address VARCHAR(300) NOT NULL, city VARCHAR(100) NOT NULL, locality VARCHAR(150) NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','available','reserved','sold','rented','inactive')),
  published BOOLEAN NOT NULL DEFAULT FALSE, assigned_agent_id UUID REFERENCES users(id),
  images JSONB NOT NULL DEFAULT '[]', archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (agency_id,reference_code)
);
CREATE INDEX properties_agency_idx ON properties(agency_id);
CREATE INDEX properties_public_idx ON properties(published,status,city);
CREATE TABLE leads (
  id UUID PRIMARY KEY, agency_id UUID NOT NULL REFERENCES agencies(id),
  property_id UUID NOT NULL REFERENCES properties(id), name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL, phone VARCHAR(30) NOT NULL, message TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','visit_scheduled','negotiation','converted','lost')),
  assigned_agent_id UUID REFERENCES users(id), next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX leads_agency_agent_idx ON leads(agency_id,assigned_agent_id);
CREATE TABLE activities (
  id UUID PRIMARY KEY, agency_id UUID NOT NULL REFERENCES agencies(id),
  lead_id UUID NOT NULL REFERENCES leads(id), actor_id UUID REFERENCES users(id),
  body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX activities_lead_idx ON activities(agency_id,lead_id);
CREATE TABLE visits (
  id UUID PRIMARY KEY, agency_id UUID NOT NULL REFERENCES agencies(id),
  lead_id UUID NOT NULL REFERENCES leads(id), property_id UUID NOT NULL REFERENCES properties(id),
  agent_id UUID NOT NULL REFERENCES users(id), starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL, notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('requested','confirmed','completed','cancelled','no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CHECK (ends_at > starts_at)
);
CREATE INDEX visits_agent_time_idx ON visits(agency_id,agent_id,starts_at,ends_at);
CREATE TABLE deals (
  id UUID PRIMARY KEY, agency_id UUID NOT NULL REFERENCES agencies(id),
  lead_id UUID NOT NULL REFERENCES leads(id), property_id UUID NOT NULL REFERENCES properties(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  stage TEXT NOT NULL DEFAULT 'inquiry' CHECK (stage IN ('inquiry','qualified','visit','offer','negotiation','booking','documentation','closed_won','closed_lost')),
  offer_amount NUMERIC(16,2) NOT NULL CHECK (offer_amount >= 0),
  notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX deals_agency_agent_idx ON deals(agency_id,agent_id);
CREATE UNIQUE INDEX one_confirmed_deal_per_property ON deals(property_id) WHERE stage IN ('booking','documentation','closed_won');
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY, agency_id UUID NOT NULL REFERENCES agencies(id),
  actor_id UUID REFERENCES users(id), action VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL, details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_agency_idx ON audit_logs(agency_id,created_at);
CREATE TABLE rate_buckets (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX rate_expiry_idx ON rate_buckets(expires_at);
