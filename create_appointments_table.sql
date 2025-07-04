-- ============================================================================
-- CRIAR TABELA DE COMPROMISSOS (APPOINTMENTS) - PLANO OURO APENAS
-- ============================================================================

-- 1. Criar a tabela appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    date DATE NOT NULL,
    time TIME NOT NULL,
    location TEXT DEFAULT '',
    category TEXT NOT NULL CHECK (category IN (
        'pessoal',
        'trabalho', 
        'saúde',
        'educação',
        'família',
        'negócios',
        'lazer',
        'financeiro',
        'outros'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    notificado_1h BOOLEAN DEFAULT FALSE
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON public.appointments(user_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_category ON public.appointments(category);

-- 3. Criar trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON public.appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 5. Política RLS: Usuários só veem seus próprios compromissos
CREATE POLICY "Users can view their own appointments" ON public.appointments
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND plan_type = 'ouro'
        )
    );

-- 6. Política RLS: Apenas usuários OURO podem inserir compromissos
CREATE POLICY "Gold users can insert appointments" ON public.appointments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND plan_type = 'ouro'
        )
    );

-- 7. Política RLS: Usuários podem atualizar seus próprios compromissos (apenas OURO)
CREATE POLICY "Gold users can update their appointments" ON public.appointments
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND plan_type = 'ouro'
        )
    );

-- 8. Política RLS: Usuários podem deletar seus próprios compromissos (apenas OURO)
CREATE POLICY "Gold users can delete their appointments" ON public.appointments
    FOR DELETE USING (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND plan_type = 'ouro'
        )
    );

-- ============================================================================
-- DADOS DE EXEMPLO (OPCIONAL - para testar)
-- ============================================================================

-- Inserir alguns compromissos de exemplo para usuários OURO
-- NOTA: Substitua os IDs pelos IDs reais dos seus usuários OURO

/*
INSERT INTO public.appointments (user_id, title, description, date, time, location, category) VALUES
(
    (SELECT id FROM public.users WHERE plan_type = 'ouro' LIMIT 1),
    'Reunião com Cliente',
    'Apresentação do projeto novo',
    '2024-12-25',
    '14:00',
    'Escritório Central',
    'trabalho'
),
(
    (SELECT id FROM public.users WHERE plan_type = 'ouro' LIMIT 1),
    'Consulta Dentista',
    'Limpeza e avaliação geral',
    '2024-12-26',
    '10:30',
    'Clínica OdontoBem',
    'saúde'
),
(
    (SELECT id FROM public.users WHERE plan_type = 'ouro' LIMIT 1),
    'Aniversário da Mãe',
    'Almoço em família',
    '2024-12-28',
    '12:00',
    'Casa da Vovó',
    'família'
);
*/

-- ============================================================================
-- VERIFICAR SE TUDO FOI CRIADO CORRETAMENTE
-- ============================================================================

-- Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'appointments';

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'appointments';

COMMENT ON TABLE public.appointments IS 'Tabela de compromissos/agendamentos - Funcionalidade exclusiva do Plano Ouro';
COMMENT ON COLUMN public.appointments.user_id IS 'ID do usuário (deve ter plano_type = ouro)';
COMMENT ON COLUMN public.appointments.category IS 'Categoria do compromisso: pessoal, trabalho, saúde, educação, família, negócios, lazer, financeiro, outros';
COMMENT ON COLUMN public.appointments.date IS 'Data do compromisso (YYYY-MM-DD)';
COMMENT ON COLUMN public.appointments.time IS 'Horário do compromisso (HH:MM)'; 