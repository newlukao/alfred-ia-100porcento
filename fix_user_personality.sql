-- ============================================================================
-- CORREÇÃO RÁPIDA: Adicionar tabela user_personality
-- ============================================================================

-- 1. Criar tabela user_personality que estava faltando
CREATE TABLE IF NOT EXISTS user_personality (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    personality_profile TEXT NOT NULL,
    conversation_count INTEGER DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id)
);

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_user_personality_usuario_id ON user_personality(usuario_id);

-- 3. Verificar se foi criada
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_personality'
ORDER BY ordinal_position;

-- ============================================================================
-- PRONTO! Execute este SQL no Supabase
-- ============================================================================ 