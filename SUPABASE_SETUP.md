# 🚀 Configuração do Supabase - Sistema IA Financeira

## 📋 **Passo a Passo**

### **1. Configure as Variáveis de Ambiente**

Crie o arquivo `.env.local` na raiz do projeto:

```bash
# Configurações do Supabase
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA_AQUI
```

### **2. Obter as Credenciais do Supabase**

1. Vá para [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto (ou crie um novo)
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### **3. Verificar Status da Configuração**

Abra o navegador em `http://localhost:8089/` e verifique o console:

- ✅ **"🚀 Usando Supabase Database"** = Configurado corretamente
- ⚠️ **"⚠️ Supabase não configurado, usando MockDatabase"** = Precisa configurar

### **4. Testar as Notificações**

1. **Login como admin**: `admin@exemplo.com` / `admin`
2. **Vá para Painel Administrativo** → **Notificações**
3. **Envie uma notificação** para Demo User
4. **Logout** e **login como demo**: `demo@exemplo.com` / `demo`
5. **Vá para Dashboard** → **Notificações**
6. **Verifique se apareceu**

### **5. Logs de Debug**

No console do navegador você deve ver:

```
🏗️ SupabaseDatabase - Inicializando instância singleton
🔗 Testando conexão com Supabase...
✅ Conexão com Supabase estabelecida com sucesso
📨 sendAdminNotification - Iniciando envio no Supabase: {...}
🎯 sendAdminNotification - Concluído no Supabase: {...}
📖 getNotificationHistory - Buscando para usuário: {...}
📤 Retornando notificações do Supabase: X
```

### **6. Troubleshooting**

#### **Erro de Conexão**
```
❌ Erro de conexão Supabase: {...}
```
- Verifique se as credenciais estão corretas
- Verifique se o projeto Supabase está ativo
- Verifique se executou o SQL de criação das tabelas

#### **Fallback para MockDatabase**
```
⚠️ Supabase não configurado, usando MockDatabase como fallback
```
- Verifique se o arquivo `.env.local` existe
- Verifique se as variáveis não contêm valores de exemplo
- Reinicie o servidor (`Ctrl+C` e `npm run dev`)

#### **Notificações não chegam**
- Verifique se o usuário existe na tabela `users`
- Verifique se as notificações estão sendo salvas na tabela `notification_history`
- Abra o Supabase Dashboard → Table Editor para verificar os dados

### **7. Comandos Úteis**

```bash
# Reiniciar servidor
npm run dev

# Verificar build
npm run build

# Ver logs detalhados
# Abra F12 → Console no navegador
```

## 🎯 **Status Atual**

- ✅ **SQL executado** no Supabase
- ✅ **Código migrado** para usar Supabase
- ✅ **Fallback funcional** com MockDatabase
- ⏳ **Configuração das credenciais** (pendente)

Após configurar o `.env.local`, o sistema funcionará 100% com banco real! 🚀 