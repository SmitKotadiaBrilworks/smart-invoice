-- Workspace integrations table for storing third-party service credentials
CREATE TABLE IF NOT EXISTS workspace_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'email', 'other')),
  publishable_key TEXT,
  secret_key_encrypted TEXT, -- Store encrypted secret key
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB, -- Store additional provider-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_integrations_workspace ON workspace_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_integrations_provider ON workspace_integrations(provider);

-- Trigger to update updated_at
CREATE TRIGGER update_workspace_integrations_updated_at
  BEFORE UPDATE ON workspace_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

