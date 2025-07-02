-- ============================================
-- FIX: Confirmar todos os usuários existentes
-- ============================================

-- 1. Confirmar todos os emails pendentes
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Sincronizar todos com tabela users
INSERT INTO users (id, email, nome, is_admin, plan_type)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'nome', split_part(au.email, '@', 1)),
    CASE 
        WHEN au.email LIKE '%admin%' OR au.email = 'lucasz@hotmail.com' THEN true 
        ELSE false 
    END,
    CASE 
        WHEN au.email LIKE '%admin%' OR au.email = 'lucasz@hotmail.com' THEN 'ouro'
        ELSE 'bronze'
    END
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = au.email);

-- 3. Atualizar usuário principal para admin
UPDATE users 
SET is_admin = true, plan_type = 'ouro'
WHERE email = 'lucasz@hotmail.com';

-- 4. Verificar todos os usuários
SELECT 
    'Usuarios confirmados:' as info,
    au.email,
    au.email_confirmed_at IS NOT NULL as confirmado,
    u.plan_type,
    u.is_admin
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC;

SELECT 'Todos os usuários foram confirmados e sincronizados!' as resultado; 