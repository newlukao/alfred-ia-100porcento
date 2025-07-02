-- ============================================
-- FIX COMPLETO: Usuario demo@hotmail.com
-- ============================================

-- 1. Verificar status atual
SELECT 
    'Status atual:' as info,
    email,
    email_confirmed_at,
    created_at,
    encrypted_password IS NOT NULL as tem_senha
FROM auth.users 
WHERE email = 'demo@hotmail.com';

-- 2. Resetar senha com hash correto
UPDATE auth.users 
SET 
    encrypted_password = crypt('123456', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'demo@hotmail.com';

-- 3. Garantir que existe na tabela users
DELETE FROM users WHERE email = 'demo@hotmail.com';

INSERT INTO users (id, email, nome, is_admin, plan_type)
SELECT 
    au.id,
    'demo@hotmail.com',
    'teste',
    false,
    'ouro'
FROM auth.users au
WHERE au.email = 'demo@hotmail.com';

-- 4. Verificar se foi corrigido
SELECT 
    'Depois da correção:' as info,
    email,
    email_confirmed_at IS NOT NULL as email_confirmado,
    encrypted_password IS NOT NULL as tem_senha_nova,
    created_at
FROM auth.users 
WHERE email = 'demo@hotmail.com';

-- 5. Verificar tabela users
SELECT 
    'Na tabela users:' as info,
    email,
    nome,
    plan_type
FROM users 
WHERE email = 'demo@hotmail.com';

SELECT 'Usuario corrigido! Tente login: demo@hotmail.com / 123456' as resultado; 