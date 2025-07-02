import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 🚨 DEBUG MODE - Para identificar problema de tela branca
console.log('🚀 MAIN.TSX - Iniciando aplicação...');

// Verificar se elemento root existe
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ ERRO FATAL: Element #root not found!');
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-size: 18px;">ERRO: Element #root não encontrado!</div>';
} else {
  console.log('✅ Element #root encontrado');
  
  try {
    console.log('🔄 Criando React root...');
    const root = createRoot(rootElement);
    
    console.log('🔄 Renderizando App...');
    root.render(<App />);
    
    console.log('✅ App renderizado com sucesso!');
  } catch (error) {
    console.error('❌ ERRO FATAL no render:', error);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; font-family: monospace;">
        <h2>🚨 ERRO DE RENDERIZAÇÃO</h2>
        <p><strong>Erro:</strong> ${error}</p>
        <p><strong>Stack:</strong> ${error?.stack || 'N/A'}</p>
        <button onclick="window.location.reload()" style="padding: 10px; margin-top: 10px;">🔄 Recarregar</button>
      </div>
    `;
  }
}
