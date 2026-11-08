-- Migración: Tabla de auditoría para operaciones del Servidor MCP
-- Fecha: 2026-11-08
-- Descripción: Registra de forma inmutable todas las propuestas, actualizaciones y reversiones realizadas
-- por agentes de IA o usuarios autorizados a través del Model Context Protocol (MCP).

CREATE TABLE IF NOT EXISTS mcp_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  operation_id UUID NOT NULL,
  repair_id BIGINT NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  repair_codigo VARCHAR(30) NOT NULL,
  actor VARCHAR(100) NOT NULL DEFAULT 'AI_AGENT',
  action VARCHAR(30) NOT NULL CHECK (action IN ('preparar', 'actualizar', 'revertir')),
  status VARCHAR(30) NOT NULL CHECK (status IN ('propuesto', 'aplicado', 'revertido', 'error')),
  cambios JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_anterior JSONB,
  snapshot_nuevo JSONB,
  verificacion JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda rápida por operación, código de reparación y fecha
CREATE INDEX IF NOT EXISTS idx_mcp_audit_operation_id ON mcp_audit_logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_repair_id ON mcp_audit_logs(repair_id);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_repair_codigo ON mcp_audit_logs(repair_codigo);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_created_at ON mcp_audit_logs(created_at DESC);
