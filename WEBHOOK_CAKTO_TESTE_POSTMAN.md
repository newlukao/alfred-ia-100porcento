# 🧪 Como Testar o Webhook Cakto no Postman

## Configuração Básica

### 1. **URL**
```
POST https://alfred-ia-100porcento.vercel.app/api/webhook-cakto
```

### 2. **Headers**
```
Content-Type: application/json
```

### 3. **Body (JSON)**

## 📋 Exemplos de Teste

### **Teste 1: Compra Aprovada - Plano Ouro**
```json
{
  "event": "purchase_approved",
  "data": {
    "customer": {
      "email": "teste@exemplo.com",
      "name": "João Silva",
      "phone": "11999999999"
    },
    "product": {
      "name": "Plano Ouro Anual",
      "price": 29700
    },
    "transaction": {
      "id": "txn_123456",
      "amount": 29700,
      "status": "approved"
    }
  },
  "secret": "sua_chave_secreta_aqui"
}
```

### **Teste 2: Compra Aprovada - Plano Bronze**
```json
{
  "event": "purchase_approved",
  "data": {
    "customer": {
      "email": "bronze@exemplo.com",
      "name": "Maria Santos",
      "phone": "11888888888"
    },
    "product": {
      "name": "Plano Bronze Mensal",
      "price": 4900
    },
    "transaction": {
      "id": "txn_789012",
      "amount": 4900,
      "status": "approved"
    }
  },
  "secret": "sua_chave_secreta_aqui"
}
```

### **Teste 3: Renovação de Assinatura**
```json
{
  "event": "subscription_renewed",
  "data": {
    "customer": {
      "email": "renovacao@exemplo.com",
      "name": "Pedro Costa"
    },
    "product": {
      "name": "Plano Ouro 3 meses",
      "price": 14700
    },
    "subscription": {
      "id": "sub_345678",
      "status": "active"
    }
  },
  "secret": "sua_chave_secreta_aqui"
}
```

### **Teste 4: Cancelamento**
```json
{
  "event": "subscription_canceled",
  "data": {
    "customer": {
      "email": "cancelamento@exemplo.com",
      "name": "Ana Lima"
    },
    "subscription": {
      "id": "sub_999888",
      "status": "canceled"
    }
  },
  "secret": "sua_chave_secreta_aqui"
}
```

### **Teste 5: Reembolso**
```json
{
  "event": "refund",
  "data": {
    "customer": {
      "email": "reembolso@exemplo.com",
      "name": "Carlos Oliveira"
    },
    "transaction": {
      "id": "txn_refund_123",
      "amount": 9900,
      "status": "refunded"
    }
  },
  "secret": "sua_chave_secreta_aqui"
}
```

## ✅ **Respostas Esperadas**

### **Sucesso (200)**
```json
{
  "success": true,
  "message": "Webhook processado com sucesso",
  "user_id": "uuid-do-usuario",
  "action": "user_updated" // ou "user_created"
}
```

### **Erro de Autenticação (401)**
```json
{
  "error": "Acesso negado: secret inválido"
}
```

### **Erro de Validação (400)**
```json
{
  "error": "Evento não suportado: evento_invalido"
}
```

## 🔍 **Como Verificar se Funcionou**

1. **Verifique no seu painel admin** se o usuário foi criado/atualizado
2. **Confira a tabela `vendas`** se a venda foi registrada
3. **Veja os logs da Vercel** para debug

## 🚨 **Troubleshooting**

### Se der erro 401:
- Verifique se o `secret` no body está correto
- Confirme se a variável `CAKTO_WEBHOOK_SECRET` está configurada na Vercel

### Se der erro 500:
- Verifique os logs da Vercel
- Confirme se todas as variáveis de ambiente do Supabase estão configuradas

### Se não criar o usuário:
- Verifique se o email é válido
- Confirme se o Supabase está acessível 