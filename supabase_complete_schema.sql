-- ============================================================================
-- SISTEMA IA FINANCEIRA - SCHEMA COMPLETO SUPABASE
-- ============================================================================
-- Execute este SQL no Supabase SQL Editor para criar todas as tabelas
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. EXPENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descricao TEXT,
    data DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. NOTIFICATION_HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('budget_alert', 'goal_progress', 'daily_reminder', 'achievement', 'expense_limit', 'weekly_summary', 'admin_message')),
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    icone VARCHAR(10) DEFAULT '📢',
    lida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_leitura TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 4. NOTIFICATION_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    budget_alerts BOOLEAN DEFAULT TRUE,
    goal_progress BOOLEAN DEFAULT TRUE,
    daily_reminders BOOLEAN DEFAULT TRUE,
    achievement_unlocks BOOLEAN DEFAULT TRUE,
    expense_limits BOOLEAN DEFAULT TRUE,
    weekly_summaries BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id)
);

-- ============================================================================
-- 5. BUDGETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    categoria VARCHAR(100) NOT NULL,
    valor_orcamento DECIMAL(10,2) NOT NULL,
    mes_ano VARCHAR(7) NOT NULL, -- formato "2025-01"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, categoria, mes_ano)
);

-- ============================================================================
-- 6. GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('economia', 'reduzir_categoria', 'limite_mensal', 'frequencia')),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor_meta DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(100),
    prazo DATE NOT NULL,
    valor_atual DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'falhada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 7. ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    icone VARCHAR(10) DEFAULT '🏆',
    pontos INTEGER DEFAULT 0,
    desbloqueado BOOLEAN DEFAULT FALSE,
    data_desbloqueio TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. USER_STATS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nivel INTEGER DEFAULT 1,
    pontos_totais INTEGER DEFAULT 0,
    streak_dias INTEGER DEFAULT 0,
    ultima_atividade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metas_concluidas INTEGER DEFAULT 0,
    conquistas_desbloqueadas INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id)
);

-- ============================================================================
-- 9. CONVERSATION_HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 10. CONFIGURATION TABLE
-- ============================================================================
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

-- ============================================================================
-- INDEXES PARA PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_usuario_id ON expenses(usuario_id);
CREATE INDEX IF NOT EXISTS idx_expenses_data ON expenses(data);
CREATE INDEX IF NOT EXISTS idx_expenses_categoria ON expenses(categoria);
CREATE INDEX IF NOT EXISTS idx_expenses_usuario_data ON expenses(usuario_id, data);

-- Notification history indexes
CREATE INDEX IF NOT EXISTS idx_notification_history_usuario_id ON notification_history(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_tipo ON notification_history(tipo);
CREATE INDEX IF NOT EXISTS idx_notification_history_lida ON notification_history(lida);
CREATE INDEX IF NOT EXISTS idx_notification_history_data_criacao ON notification_history(data_criacao);

-- Budgets indexes
CREATE INDEX IF NOT EXISTS idx_budgets_usuario_id ON budgets(usuario_id);
CREATE INDEX IF NOT EXISTS idx_budgets_mes_ano ON budgets(mes_ano);

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_usuario_id ON goals(usuario_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- Achievements indexes
CREATE INDEX IF NOT EXISTS idx_achievements_usuario_id ON achievements(usuario_id);
CREATE INDEX IF NOT EXISTS idx_achievements_desbloqueado ON achievements(desbloqueado);

-- Conversation history indexes
CREATE INDEX IF NOT EXISTS idx_conversation_history_usuario_id ON conversation_history(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_timestamp ON conversation_history(timestamp);

-- ============================================================================
-- TRIGGERS PARA AUTO-UPDATE
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configuration_updated_at BEFORE UPDATE ON configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DADOS INICIAIS DE TESTE
-- ============================================================================

-- Insert test users
INSERT INTO users (nome, email, is_admin) VALUES 
('Demo User', 'demo@exemplo.com', FALSE),
('Admin User', 'admin@exemplo.com', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Get user IDs for foreign key references
DO $$
DECLARE
    demo_user_id UUID;
    admin_user_id UUID;
BEGIN
    SELECT id INTO demo_user_id FROM users WHERE email = 'demo@exemplo.com';
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@exemplo.com';
    
    -- Insert sample expenses for demo user
    INSERT INTO expenses (usuario_id, valor, categoria, descricao, data) VALUES 
    (demo_user_id, 45.50, 'mercado', 'Compras do supermercado', CURRENT_DATE - INTERVAL '1 day'),
    (demo_user_id, 25.00, 'transporte', 'Uber para o trabalho', CURRENT_DATE - INTERVAL '1 day'),
    (demo_user_id, 12.50, 'alimentacao', 'Lanche da tarde', CURRENT_DATE),
    (demo_user_id, 80.00, 'mercado', 'Compras da semana', CURRENT_DATE - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;
    
    -- Insert default achievements for demo user
    INSERT INTO achievements (usuario_id, tipo, titulo, descricao, icone, pontos) VALUES 
    (demo_user_id, 'primeiro_gasto', 'Primeiro Passo', 'Registrou seu primeiro gasto!', '🎯', 10),
    (demo_user_id, 'streak_7_dias', 'Disciplinado', 'Registrou gastos por 7 dias seguidos', '📅', 50),
    (demo_user_id, 'economia_100', 'Economista', 'Economizou R$ 100 em um mês', '💰', 100),
    (demo_user_id, 'organizacao_30_gastos', 'Super Organizado', 'Registrou 30 gastos', '📊', 75),
    (demo_user_id, 'meta_concluida', 'Mestre da Economia', 'Concluiu sua primeira meta', '🏆', 250)
    ON CONFLICT DO NOTHING;
    
    -- Insert default configuration
    INSERT INTO configuration (instrucoes_personalizadas, modelo_usado, openai_api_key, criterios_sucesso, situacoes_interrupcao, contexto_geral, instrucoes_individuais, mensagem_inicial) VALUES 
    ('Você é um assistente financeiro amigável e motivacional. Use emojis e seja positivo ao ajudar os usuários a organizarem seus gastos. Sempre parabenize quando eles registrarem gastos e dê dicas financeiras úteis.',
     'gpt-3.5-turbo',
     '',
     'O usuário confirmou que suas dúvidas foram esclarecidas, expressou satisfação com as informações recebidas, ou indicou que não precisa de mais ajuda no momento.',
     'Usuário solicita falar com atendente humano, apresenta problema técnico complexo, demonstra insatisfação extrema, ou faz perguntas fora do escopo do assistente.',
     'Somos uma empresa de tecnologia focada em soluções financeiras inovadoras. Ajudamos pessoas a organizarem melhor seus gastos e tomarem decisões financeiras mais inteligentes.',
     'Personalize a conversa com base no histórico do usuário: {{nome_usuario}}, {{historico_gastos}}, {{categoria_preferida}}.',
     '👋 Olá! Sou seu assistente financeiro pessoal. Estou aqui para ajudar você a organizar seus gastos e melhorar sua vida financeira. Como posso te ajudar hoje?')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) - OPCIONAL
-- ============================================================================

-- Enable RLS (descomente se quiser usar autenticação do Supabase)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verify tables were created
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

-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as records FROM users
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'configuration', COUNT(*) FROM configuration
UNION ALL
SELECT 'achievements', COUNT(*) FROM achievements
ORDER BY table_name;

-- ============================================================================
-- SUCESSO! 🎉
-- ============================================================================
-- Todas as tabelas foram criadas com sucesso!
-- Agora configure o arquivo .env.local com suas credenciais do Supabase
-- ============================================================================ 