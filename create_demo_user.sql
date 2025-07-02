-- ============================================
-- CRIAR USUÁRIO DEMO PARA TESTES
-- ============================================

-- 1. Inserir usuário diretamente no auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'demo@hotmail.com',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"nome": "teste"}',
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
) ON CONFLICT (email) DO NOTHING;

-- 2. Atualizar usuário na tabela users para plano ouro
UPDATE users 
SET plan_type = 'ouro' 
WHERE email = 'demo@hotmail.com';

-- 3. Se não existe na tabela users, criar
INSERT INTO users (id, email, nome, is_admin, plan_type)
SELECT 
    au.id,
    'demo@hotmail.com',
    'teste',
    false,
    'ouro'
FROM auth.users au
WHERE au.email = 'demo@hotmail.com'
AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@hotmail.com');

SELECT 'Usuario demo criado: demo@hotmail.com / 123456' as status; 