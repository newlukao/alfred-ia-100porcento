-- ============================================
-- GARANTIR QUE ADMIN EXISTE NO BANCO
-- ============================================

-- 1. Inserir ou atualizar usuário admin
INSERT INTO users (id, nome, email, is_admin, plan_type, data_criacao)
VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'Admin User',
    'admin@exemplo.com',
    true,
    'ouro',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    is_admin = EXCLUDED.is_admin,
    plan_type = EXCLUDED.plan_type;

-- 2. Inserir ou atualizar usuário demo
INSERT INTO users (id, nome, email, is_admin, plan_type, data_criacao)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Demo User',
    'demo@exemplo.com',
    false,
    'bronze',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    is_admin = EXCLUDED.is_admin,
    plan_type = EXCLUDED.plan_type;

-- 3. Verificar se os usuários foram criados/atualizados
SELECT id, nome, email, is_admin, plan_type, data_criacao
FROM users 
WHERE email IN ('admin@exemplo.com', 'demo@exemplo.com')
ORDER BY is_admin DESC;

-- 4. Adicionar dados de exemplo para o admin (se não existirem)
INSERT INTO incomes (user_id, description, amount, category, date, tags)
SELECT 
    '550e8400-e29b-41d4-a716-446655440002',
    'Salário Administrativo',
    8000.00,
    'salario',
    CURRENT_DATE,
    ARRAY['trabalho', 'mensal', 'admin']
WHERE NOT EXISTS (
    SELECT 1 FROM incomes 
    WHERE user_id = '550e8400-e29b-41d4-a716-446655440002' 
    AND description = 'Salário Administrativo'
);

INSERT INTO incomes (user_id, description, amount, category, date, tags)
SELECT 
    '550e8400-e29b-41d4-a716-446655440002',
    'Consultoria Premium',
    3000.00,
    'freelance',
    CURRENT_DATE - INTERVAL '2 days',
    ARRAY['trabalho', 'extra', 'consultoria']
WHERE NOT EXISTS (
    SELECT 1 FROM incomes 
    WHERE user_id = '550e8400-e29b-41d4-a716-446655440002' 
    AND description = 'Consultoria Premium'
);

-- 5. Mostrar resultado final com recebimentos
SELECT 
    u.nome,
    u.email,
    u.is_admin,
    u.plan_type,
    COUNT(i.id) as total_recebimentos,
    COALESCE(SUM(i.amount), 0) as total_valor_recebimentos
FROM users u
LEFT JOIN incomes i ON u.id = i.user_id
WHERE u.email IN ('admin@exemplo.com', 'demo@exemplo.com')
GROUP BY u.id, u.nome, u.email, u.is_admin, u.plan_type
ORDER BY u.is_admin DESC;

-- ============================================
-- FIM DO SCRIPT
-- ============================================ 