-- ============================================
-- DESABILITAR CONFIRMAÇÃO DE EMAIL
-- ============================================

-- 1. Confirmar todos os usuários existentes
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Atualizar função para auto-confirmar novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, nome, is_admin, plan_type)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        false,
        'bronze'
    );
    
    -- Auto-confirmar email
    UPDATE auth.users 
    SET email_confirmed_at = NOW()
    WHERE id = NEW.id AND email_confirmed_at IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar status
SELECT 
    'Status dos usuários:' as info,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmados,
    COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as pendentes
FROM auth.users;

SELECT 'Configuração aplicada! Novos usuários serão auto-confirmados.' as resultado; 