# 🛠️ Guia de Troubleshooting - IA Financeira

## 🔄 Problema: Site fica carregando / Precisa usar janela anônima

### 🎯 Soluções Rápidas (Em Ordem de Prioridade)

#### 1. **Scripts de Limpeza** (Mais Rápido)
```bash
# Limpeza básica
bun run clean

# Reiniciar com limpeza
bun run dev:clean

# Limpeza completa (se nada funcionar)
bun run fresh
```

#### 2. **Hard Refresh no Browser**
- **Chrome/Edge:** `Ctrl + Shift + R`
- **Firefox:** `Ctrl + F5`
- **Safari:** `Cmd + Shift + R`

#### 3. **Limpeza Manual do Browser**
1. `F12` (DevTools)
2. **Application** → **Storage**
3. **Clear site data**
4. **Service Workers** → **Unregister**

---

## 🔍 Diagnóstico Avançado

### **Verificar se é problema de cache:**
1. Site funciona em **janela anônima**? ✅ = Problema de cache
2. Console mostra erros? `F12` → Console
3. Network tab mostra requests infinitos? `F12` → Network

### **Verificar Service Workers:**
1. `F12` → **Application** → **Service Workers**
2. Se houver algum ativo: **Unregister**
3. **Clear Storage** → **Clear site data**

### **Verificar Estado da Aplicação:**
1. `F12` → **Application** → **Local Storage**
2. Deletar dados de `localhost:8080`
3. **Session Storage** → Limpar também

---

## ⚙️ Configurações Preventivas

### **1. Browser Settings**
```
Chrome → Settings → Privacy and security → 
Clear browsing data → Advanced → 
✅ Cached images and files
✅ Site settings
```

### **2. Desenvolvimento**
```bash
# Sempre usar porta específica
bun dev

# Se der problema, reiniciar com limpeza
bun run dev:clean
```

### **3. Configurações do Editor**
- **VSCode:** Instalar extensão "Auto Reload"
- **Configurar:** `settings.json`:
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.autoImports": false
}
```

---

## 🚨 Problemas Específicos

### **"White Screen of Death"**
```bash
# 1. Verificar erros no console
F12 → Console

# 2. Limpar e rebuildar
bun run fresh

# 3. Verificar dependências
bun install
```

### **HMR (Hot Reload) não funciona**
```bash
# 1. Reiniciar servidor
Ctrl + C
bun dev

# 2. Se persistir:
bun run dev:clean
```

### **"Module not found" persistente**
```bash
# 1. Limpar cache de dependências
rm -rf node_modules/.cache

# 2. Reinstalar
bun install

# 3. Restart
bun dev
```

---

## 🎯 Comandos Úteis

```bash
# Limpeza básica (mais comum)
bun run clean && bun dev

# Limpeza completa (problemas persistentes)
bun run fresh

# Verificar se servidor está rodando
netstat -tulpn | grep :8080

# Matar processo na porta (se travado)
kill -9 $(lsof -t -i:8080)
```

---

## 🆘 Se nada funcionar

1. **Reiniciar o computador** (sério!)
2. **Usar navegador diferente** temporariamente
3. **Verificar antivírus/firewall**
4. **Desabilitar extensões do browser**

---

**💡 Dica:** Sempre que atualizar dependências importantes (React, Vite, etc.), execute `bun run fresh` para evitar problemas de compatibilidade. 