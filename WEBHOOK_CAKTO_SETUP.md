# Integração Webhook Cakto

Este documento explica como configurar e usar o webhook da Cakto para automatizar vendas e assinaturas no sistema.

## 📋 Pré-requisitos

- Sistema rodando no Vercel/Next.js
- Conta na Cakto configurada
- Acesso ao painel de webhooks da Cakto

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione no seu arquivo `.env.local`:

```env
CAKTO_WEBHOOK_SECRET=seu_segredo_aqui
```

**Importante:** Use um segredo forte e único para validar que os webhooks vêm realmente da Cakto.

### 2. URL do Webhook

O endpoint criado estará disponível em:
```
https://seuprojeto.vercel.app/api/webhook-cakto
```

### 3. Configuração no Painel da Cakto

1. Acesse o painel da Cakto
2. Vá em **Apps > Webhooks**
3. Clique em **Adicionar**
4. Configure:
   - **URL:** `https://seuprojeto.vercel.app/api/webhook-cakto`
   - **Segredo:** O mesmo valor definido em `CAKTO_WEBHOOK_SECRET`
   - **Eventos:** Selecione os eventos desejados:
     - `purchase_approved` (compra aprovada)
     - `subscription_renewed` (renovação de assinatura)
     - `subscription_canceled` (cancelamento de assinatura)
     - `refund` (reembolso)

## 🎯 Eventos Suportados

### Compra Aprovada (`purchase_approved`)
- Cria novo usuário (se não existir) ou atualiza usuário existente
- Atribui plano baseado no produto/valor
- Define data de expiração conforme a duração do plano
- Registra a venda no sistema

### Renovação de Assinatura (`subscription_renewed`)
- Estende o plano do usuário existente
- Atualiza data de expiração
- Registra a renovação como nova venda

### Cancelamento de Assinatura (`subscription_canceled`)
- Remove o plano do usuário (define como `null`)
- Remove data de expiração
- **Nota:** Usuários que não renovarem também ficam com plano `null`

### Reembolso (`refund`)
- Remove o plano do usuário (define como `null`)
- Remove data de expiração
- Aplica-se quando cliente solicita reembolso

## 🔍 Lógica de Determinação de Planos

O sistema determina o plano e duração baseado no **nome do produto** na Cakto:

### **Tipo de Plano:**
1. **Plano Ouro:** Nome contém "ouro", "gold" ou "premium"
2. **Plano Bronze:** Nome contém "bronze", "basico" ou "basic"
3. **Trial:** Nome contém "trial"
4. **Fallback por valor:** >= R$ 100 → Ouro, < R$ 100 → Bronze

### **Duração do Plano:**
O sistema detecta a duração pelo nome do produto:

- **1 mês:** Nome contém "1 mes", "1mes" ou "mensal" → 30 dias
- **3 meses:** Nome contém "3 mes", "3mes" ou "trimestral" → 90 dias
- **6 meses:** Nome contém "6 mes", "6mes" ou "semestral" → 180 dias
- **1 ano:** Nome contém "1 ano", "anual" ou "12 mes" → 365 dias

### **Padrões por Tipo:**
- **Ouro sem duração especificada:** 1 ano (365 dias)
- **Bronze sem duração especificada:** 1 mês (30 dias)
- **Trial:** Sempre 7 dias

### **Para Assinaturas Recorrentes:**
- Usa o campo `subscription.recurrence_period` da Cakto se disponível

## 💡 Exemplos de Nomes de Produtos

### **Configuração Recomendada na Cakto:**

```
✅ Plano Ouro Mensal          → Ouro, 30 dias
✅ Plano Ouro Trimestral      → Ouro, 90 dias
✅ Plano Ouro Semestral       → Ouro, 180 dias
✅ Plano Ouro Anual           → Ouro, 365 dias

✅ Plano Bronze Mensal        → Bronze, 30 dias
✅ Plano Bronze Trimestral    → Bronze, 90 dias

✅ Trial 7 dias               → Trial, 7 dias

✅ Premium 6 meses            → Ouro, 180 dias
✅ Básico 1 mes               → Bronze, 30 dias
```

### **Exemplos com Variações:**
```
✅ "Assinatura Gold 3mes"     → Ouro, 90 dias
✅ "Premium anual"            → Ouro, 365 dias
✅ "Basic mensal"             → Bronze, 30 dias
✅ "Ouro 12 mes"              → Ouro, 365 dias
```

## 📊 Logs e Monitoramento

O webhook gera logs detalhados no console:

```
[Cakto Webhook] Evento recebido: purchase_approved
[Cakto Webhook] Processando venda: { 
  email, nome, plano, diasPlano, valor, tipo, produtoNome 
}
[Cakto Webhook] Venda processada com sucesso para: usuario@email.com
```

Para monitorar no Vercel:
1. Acesse o painel do Vercel
2. Vá em **Functions**
3. Clique na função `api/webhook-cakto`
4. Veja os logs em tempo real

## 🧪 Testando o Webhook

### 1. Teste no Painel da Cakto
1. No painel da Cakto, vá para o webhook configurado
2. Clique nos três pontos e selecione **Enviar evento de teste**
3. Escolha o evento desejado (ex: `purchase_approved`)
4. Envie o teste

### 2. Verificando o Resultado
- Verifique os logs no Vercel
- Confirme se o usuário foi criado/atualizado no Supabase
- Verifique se a venda foi registrada na tabela `vendas`
- Confirme se o plano e expiração estão corretos

### 3. Teste com Postman/Insomnia

#### Exemplo: Plano Ouro Trimestral
```json
{
  "secret": "seu_segredo_aqui",
  "event": "purchase_approved",
  "data": {
    "customer": {
      "name": "Teste Cliente",
      "email": "teste@exemplo.com",
      "phone": "11999999999"
    },
    "product": {
      "name": "Plano Ouro Trimestral",
      "type": "subscription"
    },
    "offer": {
      "price": 300
    },
    "amount": 300,
    "status": "paid",
    "paidAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Exemplo: Reembolso
```json
{
  "secret": "seu_segredo_aqui",
  "event": "refund",
  "data": {
    "customer": {
      "email": "teste@exemplo.com"
    }
  }
}
```

## ⚠️ Troubleshooting

### Erro 401 - Unauthorized
- Verifique se o `CAKTO_WEBHOOK_SECRET` está configurado corretamente
- Confirme se o segredo no painel da Cakto é o mesmo

### Erro 405 - Método não permitido
- O webhook deve ser enviado via POST
- Verifique a configuração no painel da Cakto

### Plano não atribuído corretamente
- **Verifique o nome do produto na Cakto**
- Use palavras-chave como "ouro", "bronze", "mensal", "anual", etc.
- Confirme se os valores estão corretos
- Veja os logs para entender como o sistema interpretou o nome

### Duração do plano incorreta
- **Ajuste o nome do produto** para incluir a duração desejada
- Exemplos: "Plano Ouro Mensal", "Premium 6 meses", "Bronze trimestral"
- Veja a seção "Exemplos de Nomes de Produtos" acima

### Usuário não criado/atualizado
- Verifique se o email está presente no payload
- Confirme se não há erros nos logs do Vercel
- Verifique a conexão com o Supabase

## 🔄 Fluxo Completo

1. **Cliente compra na Cakto**
2. **Cakto processa o pagamento**
3. **Cakto envia webhook para seu sistema**
4. **Seu sistema valida o segredo**
5. **Seu sistema processa o evento:**
   - Analisa o nome do produto para determinar plano e duração
   - Cria/atualiza usuário
   - Atribui plano e expiração conforme a duração detectada
   - Registra a venda
6. **Sistema responde com sucesso para a Cakto**
7. **Edge Functions continuam cuidando de:**
   - Expiração automática de planos
   - Lembretes 1h antes do trial expirar
   - Webhooks internos de expiração

## 📝 Dicas Importantes

### **Para Assinaturas (Recomendado):**
- Configure produtos como "subscription" na Cakto
- Use nomes descritivos: "Plano Ouro Mensal", "Premium Anual", etc.
- O sistema renovará automaticamente conforme o período de recorrência

### **Para Vendas Únicas:**
- Configure produtos como "unique" na Cakto
- O plano expira na data calculada (sem renovação automática)
- Útil para cursos ou produtos com acesso limitado

### **Gestão de Cancelamentos:**
- Cancelamentos automáticos via Cakto removem o plano (`null`)
- Reembolsos também removem o plano automaticamente
- Não renovações também resultam em plano `null`

## 📞 Suporte

Se houver problemas na integração:
1. Verifique os logs no Vercel
2. Confirme as configurações no painel da Cakto
3. Teste com payload de exemplo
4. Verifique as variáveis de ambiente
5. **Ajuste os nomes dos produtos** para usar as palavras-chave corretas 