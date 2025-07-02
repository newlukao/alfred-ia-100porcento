# 🚀 CONFIGURAÇÃO RÁPIDA DO SUPABASE

## ⚡ PASSO A PASSO (5 minutos)

### 1. 📝 Crie sua conta no Supabase
- Vá para [supabase.com](https://supabase.com/dashboard)
- Clique em "Start your project"
- Faça login com GitHub ou Google

### 2. 🏗️ Crie um novo projeto
- Clique em "New project"
- Escolha sua organização
- Nome do projeto: `ia-financeira` (ou qualquer nome)
- Password: crie uma senha forte
- Região: `East US` (mais rápida para Brasil)
- Clique em "Create new project"

### 3. ⏱️ Aguarde (2-3 minutos)
O Supabase vai provisionar seu banco PostgreSQL.

### 4. 📋 Copie suas credenciais
Quando o projeto estiver pronto:
- Vá em **Settings** → **API**
- Copie o **Project URL**
- Copie a **anon public key**

### 5. 🔧 Configure o arquivo `.env.local`
Edite o arquivo `.env.local` na raiz do projeto:

```bash
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi....SUA_CHAVE_AQUI
```

### 6. 🗄️ Execute o SQL de criação das tabelas
- No Supabase Dashboard, vá em **SQL Editor**
- Cole o conteúdo do arquivo `supabase_complete_schema.sql`
- Clique em "Run"

### 7. 🔄 Reinicie o servidor
```bash
Ctrl+C
npm run dev
```

## ✅ PRONTO!
Agora seu sistema funcionará com banco real para TODOS os clientes!

## 🚨 EM CASO DE ERRO
Se der algum erro, verifique:
1. Se as credenciais estão corretas no `.env.local`
2. Se executou o SQL no Supabase
3. Se reiniciou o servidor
4. Se o projeto Supabase está ativo

## 💡 DICA
Para produção, você pode usar as mesmas credenciais. O Supabase tem plano gratuito generoso:
- 50.000 usuários autenticados
- 500MB de banco
- 1GB de transferência

Suficiente para começar! 🚀 