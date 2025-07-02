-- ============================================
-- FIX: Tabela de Recebimentos (Incomes)
-- ============================================

-- 1. Adicionar coluna plan_type se não existir
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'bronze' CHECK (plan_type IN ('bronze', 'ouro'));

-- 2. Criar tabela de recebimentos
CREATE TABLE IF NOT EXISTS incomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_category ON incomes(category);

-- 4. Habilitar RLS
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas de segurança
DROP POLICY IF EXISTS "Users can view own incomes" ON incomes;
CREATE POLICY "Users can view own incomes" ON incomes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own incomes" ON incomes;
CREATE POLICY "Users can insert own incomes" ON incomes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own incomes" ON incomes;
CREATE POLICY "Users can update own incomes" ON incomes
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own incomes" ON incomes;
CREATE POLICY "Users can delete own incomes" ON incomes
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Atualizar seu usuário para plano ouro
UPDATE users 
SET plan_type = 'ouro' 
WHERE email = 'admin@admin.com' OR is_admin = true;

-- 7. Verificar se tudo funcionou
SELECT 'Tabela incomes criada com sucesso!' as status;
SELECT 'Usuários com plano ouro:' as info, nome, email, plan_type FROM users WHERE plan_type = 'ouro'; 