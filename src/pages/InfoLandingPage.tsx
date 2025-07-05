import React from 'react';
import AlfredLogo from '/public/alfred-logo.png';

const features = [
  { icon: '📊', title: 'Dashboard Intuitivo', desc: 'Visualize suas finanças em tempo real com gráficos e indicadores claros.' },
  { icon: '💸', title: 'Controle de Gastos', desc: 'Registre e categorize receitas e despesas de forma simples.' },
  { icon: '🎯', title: 'Metas Financeiras', desc: 'Defina e acompanhe suas metas, visualizando seu progresso.' },
  { icon: '🔒', title: 'Segurança Total', desc: 'Seus dados protegidos com criptografia de ponta a ponta.' },
  { icon: '🤖', title: 'IA no WhatsApp', desc: 'Registre transações e receba alertas direto pelo WhatsApp.' },
  { icon: '📈', title: 'Relatórios Detalhados', desc: 'Gere relatórios personalizados e identifique oportunidades de economia.' },
  { icon: '🗂️', title: 'Categorias Personalizáveis', desc: 'Organize suas transações conforme seu estilo de vida.' },
  { icon: '📱', title: 'Acesso Multiplataforma', desc: 'Use no celular, tablet ou computador, onde e quando quiser.' },
];

const steps = [
  { icon: '💬', title: '1. Envie uma mensagem', desc: 'Basta enviar uma mensagem para o Alfred detalhando sua transação.' },
  { icon: '⚡', title: '2. Processamento instantâneo', desc: 'A IA identifica automaticamente o tipo, valor e categoria.' },
  { icon: '✅', title: '3. Registro automático', desc: 'A transação é registrada e já aparece no seu dashboard.' },
  { icon: '📊', title: '4. Visualize tudo', desc: 'Acompanhe suas finanças em tempo real, com relatórios e insights.' },
];

const plans = [
  { name: 'Mensal', price: 'R$ 19,90', desc: 'Acesso a todas as funcionalidades. Sem compromisso.', highlight: false, perks: ['Dashboard completo', 'Chat IA ilimitado', 'Notificações automáticas', 'Suporte rápido'] },
  { name: 'Semestral', price: 'R$ 99,90', desc: 'Economize 15%. Prioridade no suporte.', highlight: true, perks: ['Todos os benefícios do Mensal', 'Prioridade no suporte', 'Acesso antecipado a novidades'] },
  { name: 'Anual', price: 'R$ 179,90', desc: 'Melhor valor. Consultoria personalizada.', highlight: false, perks: ['Todos os benefícios do Semestral', 'Consultoria personalizada', 'Relatórios avançados', 'Descontos exclusivos'] },
];

const testimonials = [
  { name: 'Ana Silva', role: 'Empreendedora', text: 'O Alfred.IA mudou minha relação com o dinheiro. Agora sei exatamente para onde vai cada centavo!', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { name: 'Carlos Mendes', role: 'Analista Financeiro', text: 'Economizei mais de R$ 500 por mês só por ter consciência dos meus gastos. Vale cada centavo!', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { name: 'Julia Costa', role: 'Designer', text: 'Os relatórios e gráficos são incríveis! Me ajudaram a atingir minhas metas de economia.', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
];

export default function InfoLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex flex-col items-center">
      {/* HERO */}
      <section className="w-full flex flex-col items-center justify-center pt-16 pb-8 px-4 text-center">
        <img src={AlfredLogo} alt="Alfred IA Logo" className="w-28 h-28 mb-4 animate-fade-in-up" style={{borderRadius: '50%', background: 'white'}} />
        <h1 className="text-5xl md:text-6xl font-extrabold text-indigo-700 drop-shadow-lg animate-fade-in-up mb-2">Gerencie suas finanças de forma simples e inteligente</h1>
        <p className="mt-2 text-lg md:text-2xl text-gray-700 max-w-2xl mx-auto animate-fade-in-up">Organize receitas, despesas e tenha controle total sobre suas finanças com a inteligência do Alfred.IA.</p>
        <div className="flex flex-col md:flex-row gap-4 justify-center mt-8 animate-fade-in-up">
          <a href="/ads" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl text-lg transition">Testar Agora</a>
          <a href="#planos" className="bg-white border-2 border-indigo-600 text-indigo-700 font-bold px-8 py-4 rounded-2xl shadow-xl text-lg transition hover:bg-indigo-50">Ver Planos</a>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="w-full max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-purple-700 animate-fade-in-up">Como funciona?</h2>
        <div className="flex flex-wrap justify-center gap-8">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center w-64 p-6 bg-white/80 rounded-2xl shadow-lg animate-fade-in-up">
              <span className="text-4xl mb-2">{step.icon}</span>
              <div className="text-lg font-bold mb-1 text-indigo-700">{step.title}</div>
              <div className="text-sm text-gray-700">{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RECURSOS */}
      <section className="w-full max-w-6xl mx-auto py-16 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-purple-700 animate-fade-in-up">Recursos Alfred.IA</h2>
        <div className="flex flex-wrap justify-center gap-8">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col items-center w-56 p-6 bg-white/80 rounded-2xl shadow-lg animate-fade-in-up">
              <span className="text-3xl mb-2">{f.icon}</span>
              <div className="font-bold text-indigo-700 mb-1">{f.title}</div>
              <div className="text-gray-700 text-sm">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="w-full max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-indigo-700 animate-fade-in-up">Escolha seu plano</h2>
        <div className="flex flex-wrap justify-center gap-8">
          {plans.map((plan, i) => (
            <div key={plan.name} className={`relative w-80 p-8 bg-white/90 border-2 ${plan.highlight ? 'border-purple-400 scale-105 shadow-2xl' : 'border-indigo-100'} rounded-2xl shadow-lg transition-transform hover:scale-110 animate-fade-in-up`}>
              {plan.highlight && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">MAIS POPULAR</span>
              )}
              <h3 className="text-2xl font-bold mb-2 text-indigo-700 drop-shadow">{plan.name}</h3>
              <div className="text-3xl font-extrabold mb-2 text-purple-600 drop-shadow-lg">{plan.price}</div>
              <p className="mb-4 text-gray-700 min-h-[48px]">{plan.desc}</p>
              <ul className="mb-6 text-left space-y-2">
                {plan.perks.map(f => (
                  <li key={f} className="flex items-center gap-2 text-indigo-700">
                    <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/ads" className="w-full block text-center font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 text-white py-3 rounded-xl shadow-lg hover:scale-105 transition-transform animate-bounce-in">Assinar</a>
            </div>
          ))}
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="w-full max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-purple-700 animate-fade-in-up">O que dizem nossos usuários</h2>
        <div className="flex flex-wrap justify-center gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="flex flex-col items-center w-80 p-8 bg-white/80 rounded-2xl shadow-lg animate-fade-in-up">
              <img src={t.avatar} alt={t.name} className="w-16 h-16 rounded-full border-4 border-purple-400/40 mb-2 shadow-md" />
              <div className="text-lg font-bold mb-1 text-indigo-700">{t.name}</div>
              <div className="text-xs text-purple-400 mb-2">{t.role}</div>
              <div className="text-sm text-gray-700 italic">“{t.text}”</div>
            </div>
          ))}
        </div>
      </section>

      {/* CHAMADA FINAL */}
      <section className="w-full flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-r from-indigo-200 via-white to-purple-200 animate-fade-in-up">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-indigo-700 mb-4">Pronto para transformar sua vida financeira?</h2>
        <p className="text-lg text-gray-700 mb-6 text-center">Comece agora mesmo com o Alfred.IA e tenha o controle total das suas finanças!</p>
        <a href="/ads" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-4 rounded-2xl shadow-xl text-lg transition">Testar Agora</a>
      </section>

      {/* RODAPÉ */}
      <footer className="w-full py-8 px-4 text-center text-indigo-700 bg-white/80 border-t border-indigo-100 mt-8 animate-fade-in-up">
        <div className="mb-2 flex flex-wrap justify-center gap-4">
          <a href="mailto:contato@alfredia.com" className="hover:underline">Contato</a>
          <a href="#planos" className="hover:underline">Planos</a>
          <a href="#" className="hover:underline">Recursos</a>
          <a href="#" className="hover:underline">WhatsApp</a>
        </div>
        <div className="text-xs">&copy; {new Date().getFullYear()} Alfred.IA. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
} 