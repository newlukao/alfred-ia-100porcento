-- ============================================================================
-- VERIFICAÇÃO E CORREÇÃO DO SCHEMA SUPABASE
-- ============================================================================
-- Execute este SQL para verificar e corrigir problemas no banco
-- ============================================================================

-- 1. VERIFICAR TABELAS EXISTENTES
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'users', 'expenses', 'notification_history', 'notification_settings',
        'budgets', 'goals', 'achievements', 'user_stats', 
        'conversation_history', 'configuration'
    )
ORDER BY tablename;

-- 2. VERIFICAR SE TRIGGERS JÁ EXISTEM
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%updated_at%';

-- 3. CRIAR TABELAS QUE FALTAM (SE NECESSÁRIO)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CONFIGURATION TABLE (mais importante para o sistema funcionar)
CREATE TABLE IF NOT EXISTS configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrucoes_personalizadas TEXT DEFAULT 'Você é um assistente financeiro amigável e motivacional. Use emojis e seja positivo ao ajudar os usuários a organizarem seus gastos.',
    modelo_usado VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    openai_api_key TEXT DEFAULT '',
    criterios_sucesso TEXT DEFAULT 'O usuário confirmou que suas dúvidas foram esclarecidas.',
    situacoes_interrupcao TEXT DEFAULT 'Usuário solicita falar com atendente humano.',
    contexto_geral TEXT DEFAULT 'Somos uma empresa de tecnologia focada em soluções financeiras.',
    instrucoes_individuais TEXT DEFAULT 'Personalize a conversa com base no histórico do usuário.',
    mensagem_inicial TEXT DEFAULT '👋 Olá! Sou seu assistente financeiro pessoal.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONVERSATION_HISTORY TABLE (para o chat funcionar)
CREATE TABLE IF NOT EXISTS conversation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER_PERSONALITY TABLE (para personalização do chat)
CREATE TABLE IF NOT EXISTS user_personality (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    personality_profile TEXT NOT NULL,
    conversation_count INTEGER DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id)
);

-- 4. INSERIR CONFIGURAÇÃO PADRÃO SE NÃO EXISTIR
INSERT INTO configuration (
    instrucoes_personalizadas, 
    modelo_usado, 
    openai_api_key, 
    criterios_sucesso, 
    situacoes_interrupcao, 
    contexto_geral, 
    instrucoes_individuais, 
    mensagem_inicial
) 
SELECT 
    'Você é um assistente financeiro amigável e motivacional. Use emojis e seja positivo ao ajudar os usuários a organizarem seus gastos. Sempre parabenize quando eles registrarem gastos e dê dicas financeiras úteis.',
    'gpt-3.5-turbo',
    '',
    'O usuário confirmou que suas dúvidas foram esclarecidas, expressou satisfação com as informações recebidas, ou indicou que não precisa de mais ajuda no momento.',
    'Usuário solicita falar com atendente humano, apresenta problema técnico complexo, demonstra insatisfação extrema, ou faz perguntas fora do escopo do assistente.',
    'Somos uma empresa de tecnologia focada em soluções financeiras inovadoras. Ajudamos pessoas a organizarem melhor seus gastos e tomarem decisões financeiras mais inteligentes.',
    'Personalize a conversa com base no histórico do usuário: {{nome_usuario}}, {{historico_gastos}}, {{categoria_preferida}}.',
    '👋 Olá! Sou seu assistente financeiro pessoal. Estou aqui para ajudar você a organizar seus gastos e melhorar sua vida financeira. Como posso te ajudar hoje?'
WHERE NOT EXISTS (SELECT 1 FROM configuration);

-- 5. VERIFICAR SE OS USUÁRIOS DE TESTE EXISTEM
SELECT 
    id,
    nome,
    email,
    is_admin
FROM users 
WHERE email IN ('demo@exemplo.com', 'admin@exemplo.com');

-- 6. INSERIR USUÁRIOS DE TESTE SE NÃO EXISTIREM
INSERT INTO users (nome, email, is_admin) 
SELECT 'Demo User', 'demo@exemplo.com', FALSE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@exemplo.com');

INSERT INTO users (nome, email, is_admin) 
SELECT 'Admin User', 'admin@exemplo.com', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@exemplo.com');

-- 7. CRIAR INDEXES IMPORTANTES SE NÃO EXISTIREM
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_expenses_usuario_id ON expenses(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_usuario_id ON notification_history(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_usuario_id ON conversation_history(usuario_id);
CREATE INDEX IF NOT EXISTS idx_user_personality_usuario_id ON user_personality(usuario_id);

-- 8. FUNÇÃO PARA UPDATE TIMESTAMP (SE NÃO EXISTIR)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. CRIAR TRIGGERS APENAS SE NÃO EXISTIREM
DO $$
BEGIN
    -- Trigger para configuration
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_configuration_updated_at') THEN
        CREATE TRIGGER update_configuration_updated_at 
        BEFORE UPDATE ON configuration 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger para users (pode já existir)
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger para expenses (pode já existir)
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_expenses_updated_at') THEN
        CREATE TRIGGER update_expenses_updated_at 
        BEFORE UPDATE ON expenses 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 10. VERIFICAÇÃO FINAL - CONTAR REGISTROS
SELECT 'users' as table_name, COUNT(*) as records FROM users
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'configuration', COUNT(*) FROM configuration
UNION ALL
SELECT 'notification_history', COUNT(*) FROM notification_history
UNION ALL
SELECT 'conversation_history', COUNT(*) FROM conversation_history
ORDER BY table_name;

-- 11. VERIFICAR CONFIGURAÇÃO ESPECÍFICA
SELECT 
    id,
    modelo_usado,
    CASE 
        WHEN openai_api_key = '' THEN 'NÃO CONFIGURADA'
        WHEN LENGTH(openai_api_key) > 10 THEN 'CONFIGURADA'
        ELSE 'INVÁLIDA'
    END as status_api_key,
    created_at
FROM configuration;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- ✅ Todas as tabelas necessárias criadas
-- ✅ Usuários de teste inseridos (demo@exemplo.com e admin@exemplo.com)
-- ✅ Configuração padrão inserida
-- ✅ Triggers funcionando sem conflito
-- ✅ Indexes criados para performance
-- ============================================================================ 