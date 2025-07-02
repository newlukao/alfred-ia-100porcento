-- ============================================
-- CONFIGURAÇÃO DE SEGURANÇA PARA PRODUÇÃO
-- Sistema com Supabase Auth + RLS
-- ============================================

-- 1. ATUALIZAR TABELA USERS para usar auth.uid()
-- Adicionar coluna auth_id se não existir
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Se você já tem usuários, precisa criar contas auth para eles:
-- (Execute APENAS se precisar migrar usuários existentes)
/*
-- Exemplo de migração de usuário admin existente:
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(), 
  'admin@admin.com', 
  crypt('admin123', gen_salt('bf')), 
  now(), 
  now(), 
  now()
);
*/

-- 2. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS PARA TABELA USERS
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Política para inserção automática na criação de conta
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
CREATE POLICY "Enable insert for authenticated users only" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. POLÍTICAS PARA TABELA EXPENSES
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
CREATE POLICY "Users can insert own expenses" ON expenses
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own expenses" ON expenses
    FOR UPDATE USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own expenses" ON expenses
    FOR DELETE USING (auth.uid() = usuario_id);

-- 5. POLÍTICAS PARA TABELA INCOMES (PLANO OURO APENAS)
DROP POLICY IF EXISTS "Gold users can view own incomes" ON incomes;
CREATE POLICY "Gold users can view own incomes" ON incomes
    FOR SELECT USING (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND plan_type = 'ouro'
        )
    );

DROP POLICY IF EXISTS "Gold users can insert own incomes" ON incomes;
CREATE POLICY "Gold users can insert own incomes" ON incomes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND plan_type = 'ouro'
        )
    );

DROP POLICY IF EXISTS "Gold users can update own incomes" ON incomes;
CREATE POLICY "Gold users can update own incomes" ON incomes
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND plan_type = 'ouro'
        )
    );

DROP POLICY IF EXISTS "Gold users can delete own incomes" ON incomes;
CREATE POLICY "Gold users can delete own incomes" ON incomes
    FOR DELETE USING (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND plan_type = 'ouro'
        )
    );

-- 6. FUNÇÃO PARA CRIAÇÃO AUTOMÁTICA DE PERFIL
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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER PARA CRIAÇÃO AUTOMÁTICA
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. POLÍTICAS PARA OUTRAS TABELAS (se existirem)
-- Notification History
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notification_history;
CREATE POLICY "Users can view own notifications" ON notification_history
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notification_history;
CREATE POLICY "Users can update own notifications" ON notification_history
    FOR UPDATE USING (auth.uid() = usuario_id);

-- Notification Settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification settings" ON notification_settings;
CREATE POLICY "Users can view own notification settings" ON notification_settings
    FOR ALL USING (auth.uid() = usuario_id);

-- 9. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_expenses_usuario_auth ON expenses(usuario_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_auth ON incomes(user_id);

-- 10. GRANTS PARA TABELAS
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 11. VERIFICAÇÃO DE SEGURANÇA
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'expenses', 'incomes');

-- 12. TESTE DE POLÍTICAS
-- Execute depois de fazer login com um usuário:
-- SELECT * FROM users WHERE id = auth.uid();
-- SELECT * FROM expenses WHERE usuario_id = auth.uid();
-- SELECT * FROM incomes WHERE user_id = auth.uid();

SELECT 'Configuração de segurança aplicada com sucesso!' as status; 