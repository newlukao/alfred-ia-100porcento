-- ============================================
-- DEBUG: Verificar usuário demo@hotmail.com
-- ============================================

-- 1. Verificar se existe no auth.users
SELECT 
    'Usuarios em auth.users:' as info,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'demo@hotmail.com';

-- 2. Verificar se existe na tabela users
SELECT 
    'Usuarios na tabela users:' as info,
    id,
    email,
    nome,
    plan_type
FROM users 
WHERE email = 'demo@hotmail.com';

-- 3. Listar todos os usuários para debug
SELECT 
    'Todos os usuarios auth:' as info,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Status das tabelas
SELECT 
    'Status tabelas:' as info,
    COUNT(*) as total_auth_users
FROM auth.users;

SELECT 
    'Status tabelas:' as info,
    COUNT(*) as total_app_users
FROM users; 