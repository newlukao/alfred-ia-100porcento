-- ============================================
-- UPGRADE ADMIN PARA PLANO OURO
-- ============================================

-- 1. Atualizar todos os admins para plano ouro
UPDATE users 
SET plan_type = 'ouro' 
WHERE is_admin = true;

-- 2. Atualizar usuário admin específico por email
UPDATE users 
SET plan_type = 'ouro' 
WHERE email LIKE '%admin%' OR email = 'admin@admin.com' OR email = 'admin@exemplo.com';

-- 3. Verificar se a atualização funcionou
SELECT id, nome, email, is_admin, plan_type 
FROM users 
WHERE is_admin = true OR email LIKE '%admin%';

-- 4. Adicionar dados de exemplo de recebimentos para o admin
INSERT INTO incomes (user_id, description, amount, category, date, tags)
SELECT 
    u.id,
    'Salário Administrativo',
    8000.00,
    'salario',
    CURRENT_DATE,
    ARRAY['trabalho', 'mensal', 'admin']
FROM users u 
WHERE u.is_admin = true AND u.plan_type = 'ouro'
AND NOT EXISTS (SELECT 1 FROM incomes WHERE user_id = u.id AND description = 'Salário Administrativo');

INSERT INTO incomes (user_id, description, amount, category, date, tags)
SELECT 
    u.id,
    'Consultoria Extra',
    2500.00,
    'freelance',
    CURRENT_DATE - INTERVAL '3 days',
    ARRAY['trabalho', 'extra', 'consultoria']
FROM users u 
WHERE u.is_admin = true AND u.plan_type = 'ouro'
AND NOT EXISTS (SELECT 1 FROM incomes WHERE user_id = u.id AND description = 'Consultoria Extra');

-- 5. Mostrar resultado final
SELECT 
    u.nome,
    u.email,
    u.is_admin,
    u.plan_type,
    COUNT(i.id) as total_recebimentos,
    COALESCE(SUM(i.amount), 0) as total_valor_recebimentos
FROM users u
LEFT JOIN incomes i ON u.id = i.user_id
WHERE u.is_admin = true
GROUP BY u.id, u.nome, u.email, u.is_admin, u.plan_type;

-- ============================================
-- FIM DO SCRIPT DE UPGRADE ADMIN
-- ============================================ 