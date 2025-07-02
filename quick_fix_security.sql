-- ============================================
-- FIX RÁPIDO: Segurança Para Produção
-- ============================================

-- 1. Garantir tabela incomes existe
CREATE TABLE IF NOT EXISTS incomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Garantir coluna plan_type
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'bronze';

-- 3. Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas Users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
CREATE POLICY "Enable insert for authenticated users only" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Políticas Expenses
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

-- 6. Políticas Incomes (Plano Ouro)
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

-- 7. Função para auto-criação de perfil
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

-- 8. Trigger para auto-criação
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Verificação simples
SELECT 'RLS habilitado em:' as info;
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'expenses', 'incomes');

SELECT 'Setup completo!' as status; 