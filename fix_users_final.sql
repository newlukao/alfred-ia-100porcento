-- ============================================================================
-- CORREÇÃO DEFINITIVA DOS USUÁRIOS - SUPABASE
-- ============================================================================

-- 1. Deletar usuários existentes (se houver conflito)
DELETE FROM users WHERE email IN ('demo@exemplo.com', 'admin@exemplo.com');

-- 2. Inserir usuários com UUIDs corretos
INSERT INTO users (id, nome, email, is_admin, data_criacao) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Demo User', 'demo@exemplo.com', FALSE, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Admin User', 'admin@exemplo.com', TRUE, NOW());

-- 3. Inserir dados de exemplo
INSERT INTO expenses (usuario_id, valor, categoria, descricao, data) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 45.50, 'mercado', 'Compras do supermercado', CURRENT_DATE - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440001', 25.00, 'transporte', 'Uber para o trabalho', CURRENT_DATE - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440002', 80.00, 'mercado', 'Teste admin', CURRENT_DATE);

-- 4. Inserir configurações básicas
INSERT INTO user_stats (usuario_id, nivel, pontos_totais, streak_dias, metas_concluidas, conquistas_desbloqueadas) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 1, 0, 0, 0, 0),
('550e8400-e29b-41d4-a716-446655440002', 1, 0, 0, 0, 0)
ON CONFLICT (usuario_id) DO NOTHING;

INSERT INTO notification_settings (usuario_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (usuario_id) DO NOTHING;

-- 5. Verificar resultado
SELECT 
    'users' as table_name, 
    COUNT(*) as count 
FROM users 
WHERE id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002')
UNION ALL
SELECT 
    'expenses' as table_name, 
    COUNT(*) as count 
FROM expenses 
WHERE usuario_id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002');

-- 6. Mostrar usuários criados
SELECT 
    id,
    nome,
    email,
    is_admin,
    data_criacao
FROM users
ORDER BY nome;

-- ============================================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- ============================================================================ 