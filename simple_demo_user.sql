-- ============================================
-- CRIAR USUÁRIO DEMO - VERSÃO SIMPLES
-- ============================================

-- 1. Verificar se usuário já existe
DO $$
DECLARE
    user_exists boolean;
BEGIN
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'demo@hotmail.com') INTO user_exists;
    
    IF NOT user_exists THEN
        -- Inserir usuário no auth.users
        INSERT INTO auth.users (
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'demo@hotmail.com',
            crypt('123456', gen_salt('bf')),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"nome": "teste"}',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Usuário demo@hotmail.com criado no auth.users';
    ELSE
        RAISE NOTICE 'Usuário demo@hotmail.com já existe no auth.users';
    END IF;
END $$;

-- 2. Criar/atualizar na tabela users
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

-- 3. Atualizar para plano ouro se já existe
UPDATE users 
SET plan_type = 'ouro', nome = 'teste'
WHERE email = 'demo@hotmail.com';

-- 4. Verificação final
SELECT 
    'Usuario criado com sucesso!' as status,
    'Email: demo@hotmail.com' as email,
    'Senha: 123456' as senha,
    'Plano: ouro' as plano; 