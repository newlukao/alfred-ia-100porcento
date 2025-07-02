# 🔐 GUIA DE SEGURANÇA - Protegendo sua API Key OpenAI

## ⚠️ **PROBLEMA ATUAL**
Sua API Key está **EXPOSTA** no frontend e pode ser facilmente roubada por:
- DevTools do navegador (F12 → Network)
- Console logs
- Análise do código JavaScript
- Acesso direto ao banco Supabase

## 🛡️ **SOLUÇÕES RECOMENDADAS**

### **SOLUÇÃO 1: Backend Proxy (MAIS SEGURA)**

#### **1.1 Criar API Backend**
```javascript
// backend/api/chat.js (Node.js/Express)
const express = require('express');
const OpenAI = require('openai');

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // ✅ Só no servidor!
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userId } = req.body;
    
    // ✅ Validar usuário autenticado
    if (!isValidUser(userId)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // ✅ Rate limiting
    if (await isRateLimited(userId)) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 400
    });
    
    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### **1.2 Atualizar Frontend**
```typescript
// src/lib/openai.ts - VERSÃO SEGURA
export class OpenAIService {
  private baseURL = '/api/chat'; // ✅ Seu backend, não OpenAI direto
  
  async chatCompletion(messages: ChatMessage[], userId: string): Promise<string> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` // ✅ Token do usuário, não API Key
        },
        body: JSON.stringify({
          messages,
          userId
        }),
      });
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      throw error;
    }
  }
}
```

### **SOLUÇÃO 2: Supabase Edge Functions (INTERMEDIÁRIA)**

#### **2.1 Criar Edge Function**
```typescript
// supabase/functions/chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { messages, userId } = await req.json()
    
    // ✅ API Key só no servidor Supabase
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 400,
      }),
    })
    
    const data = await openaiResponse.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

#### **2.2 Configurar Variáveis de Ambiente**
```bash
# No Supabase Dashboard → Settings → Environment Variables
OPENAI_API_KEY=sk-sua-chave-aqui
```

#### **2.3 Atualizar Frontend**
```typescript
// src/lib/openai.ts - Usando Edge Function
export class OpenAIService {
  private baseURL = 'https://seu-projeto.supabase.co/functions/v1/chat';
  
  async chatCompletion(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}` // ✅ Chave pública do Supabase
      },
      body: JSON.stringify({ messages }),
    });
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
```

### **SOLUÇÃO 3: Criptografia no Frontend (MENOS SEGURA)**

#### **3.1 Criptografar API Key**
```typescript
// src/lib/crypto.ts
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.VITE_ENCRYPTION_KEY; // ✅ Variável de ambiente

export function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, SECRET_KEY).toString();
}

export function decryptApiKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

## 🚨 **IMPLEMENTAÇÃO URGENTE**

### **Opção Rápida: Rate Limiting**
```typescript
// src/lib/openai.ts - Adicionar proteções básicas
export class OpenAIService {
  private static lastRequest = 0;
  private static requestCount = 0;
  
  async chatCompletion(messages: ChatMessage[]): Promise<string> {
    // ✅ Rate limiting básico
    const now = Date.now();
    if (now - OpenAIService.lastRequest < 1000) { // 1 req/segundo
      throw new Error('Rate limit exceeded');
    }
    
    // ✅ Limite de requests por hora
    if (OpenAIService.requestCount > 50) {
      throw new Error('Hourly limit exceeded');
    }
    
    OpenAIService.lastRequest = now;
    OpenAIService.requestCount++;
    
    // Reset counter every hour
    setTimeout(() => {
      OpenAIService.requestCount = 0;
    }, 3600000);
    
    // Sua chamada normal aqui...
  }
}
```

## 📊 **NÍVEIS DE SEGURANÇA**

| Solução | Segurança | Complexidade | Custo |
|---------|-----------|--------------|-------|
| Backend Proxy | 🔒🔒🔒🔒🔒 | Alta | Servidor próprio |
| Edge Functions | 🔒🔒🔒🔒 | Média | Incluído no Supabase |
| Criptografia | 🔒🔒 | Baixa | Grátis |
| Rate Limiting | 🔒 | Muito Baixa | Grátis |

## ⚡ **AÇÃO IMEDIATA RECOMENDADA**

1. **AGORA**: Implementar rate limiting
2. **Esta semana**: Criar Edge Function no Supabase
3. **Longo prazo**: Backend proxy completo

## 🔍 **COMO VERIFICAR SE ESTÁ SEGURA**

1. **Abra F12** → Network → Faça uma pergunta no chat
2. **Procure por**: `Authorization: Bearer sk-...`
3. **Se encontrar**: ❌ AINDA EXPOSTA
4. **Se não encontrar**: ✅ PROTEGIDA

## 📞 **PRECISA DE AJUDA?**

Se quiser implementar qualquer uma dessas soluções, me avise que eu te ajudo com o código completo! 