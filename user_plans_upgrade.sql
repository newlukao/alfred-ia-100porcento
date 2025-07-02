-- ============================================
-- UPGRADE: Sistema de Planos e Recebimentos
-- ============================================

-- 1. Adicionar coluna de plano na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'bronze' CHECK (plan_type IN ('bronze', 'ouro'));

-- 2. Atualizar usuários existentes para plano bronze
UPDATE users SET plan_type = 'bronze' WHERE plan_type IS NULL;

-- 3. Criar tabela de recebimentos (similar aos gastos)
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

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_category ON incomes(category);
CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON incomes(user_id, date);

-- 5. Trigger para auto-update do updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_incomes_updated_at 
    BEFORE UPDATE ON incomes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Políticas de segurança RLS (Row Level Security)
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ver seus próprios recebimentos
CREATE POLICY "Users can view own incomes" ON incomes
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários só podem inserir seus próprios recebimentos
CREATE POLICY "Users can insert own incomes" ON incomes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários só podem atualizar seus próprios recebimentos
CREATE POLICY "Users can update own incomes" ON incomes
    FOR UPDATE USING (auth.uid() = user_id);

-- Usuários só podem deletar seus próprios recebimentos
CREATE POLICY "Users can delete own incomes" ON incomes
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Dados de exemplo para teste (apenas se não existirem)
INSERT INTO incomes (user_id, description, amount, category, date, tags)
SELECT 
    u.id,
    'Salário Mensal',
    5000.00,
    'salario',
    CURRENT_DATE,
    ARRAY['trabalho', 'mensal']
FROM users u 
WHERE u.plan_type = 'ouro' 
AND NOT EXISTS (SELECT 1 FROM incomes WHERE user_id = u.id)
LIMIT 1;

INSERT INTO incomes (user_id, description, amount, category, date, tags)
SELECT 
    u.id,
    'Freelance Desenvolvimento',
    1500.00,
    'freelance',
    CURRENT_DATE - INTERVAL '5 days',
    ARRAY['trabalho', 'extra']
FROM users u 
WHERE u.plan_type = 'ouro' 
AND EXISTS (SELECT 1 FROM incomes WHERE user_id = u.id AND description = 'Salário Mensal')
LIMIT 1;

-- 8. Atualizar pelo menos um usuário para plano ouro (para teste)
UPDATE users 
SET plan_type = 'ouro' 
WHERE email = 'admin@admin.com' OR id = (SELECT id FROM users LIMIT 1);

-- 9. Comentários para documentação
COMMENT ON TABLE incomes IS 'Tabela de recebimentos/receitas dos usuários (apenas plano ouro)';
COMMENT ON COLUMN users.plan_type IS 'Tipo de plano do usuário: bronze (gastos apenas) ou ouro (gastos + recebimentos)';
COMMENT ON COLUMN incomes.amount IS 'Valor do recebimento em decimal com 2 casas';
COMMENT ON COLUMN incomes.category IS 'Categoria do recebimento (salario, freelance, investimento, etc)';
COMMENT ON COLUMN incomes.tags IS 'Array de tags para categorização adicional';

-- ============================================
-- FIM DO SCRIPT DE UPGRADE
-- ============================================ 