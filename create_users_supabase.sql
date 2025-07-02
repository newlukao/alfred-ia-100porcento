-- ============================================================================
-- CRIAR USUÁRIOS COM UUIDs CORRETOS NO SUPABASE
-- ============================================================================

-- Inserir usuários com UUIDs específicos
INSERT INTO users (id, nome, email, is_admin, data_criacao) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Demo User', 'demo@exemplo.com', FALSE, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Admin User', 'admin@exemplo.com', TRUE, NOW())
ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    nome = EXCLUDED.nome,
    is_admin = EXCLUDED.is_admin;

-- Inserir dados de exemplo para o Demo User
INSERT INTO expenses (usuario_id, valor, categoria, descricao, data) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 45.50, 'mercado', 'Compras do supermercado', CURRENT_DATE - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440001', 25.00, 'transporte', 'Uber para o trabalho', CURRENT_DATE - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440001', 12.50, 'alimentacao', 'Lanche da tarde', CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440001', 80.00, 'mercado', 'Compras da semana', CURRENT_DATE - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Inserir estatísticas do usuário
INSERT INTO user_stats (usuario_id, nivel, pontos_totais, streak_dias, metas_concluidas, conquistas_desbloqueadas) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 1, 0, 0, 0, 0),
('550e8400-e29b-41d4-a716-446655440002', 1, 0, 0, 0, 0)
ON CONFLICT (usuario_id) DO NOTHING;

-- Inserir configurações de notificação
INSERT INTO notification_settings (usuario_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (usuario_id) DO NOTHING;

-- Verificar se foram criados
SELECT 
    id,
    nome,
    email,
    is_admin
FROM users
WHERE id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002')
ORDER BY nome;

-- ============================================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- ============================================================================ 