import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Bot, TrendingUp, Zap, Users, Banknote, HelpCircle, Smile } from 'lucide-react';
import MascotSVG from './LandingPageMascot';

const plans = [
  {
    name: 'Mensal',
    price: 'R$ 19,90',
    description: 'Acesso completo por 1 mês. Ideal para experimentar todos os recursos.',
    features: [
      'Dashboard inteligente',
      'Chat IA ilimitado',
      'Agendamento de compromissos',
      'Notificações automáticas',
      'Suporte rápido',
    ],
    highlight: false,
  },
  {
    name: 'Semestral',
    price: 'R$ 99,90',
    description: 'Economize e tenha acesso premium por 6 meses.',
    features: [
      'Tudo do Mensal',
      'Desconto exclusivo',
      'Prioridade no suporte',
      'Acesso antecipado a novidades',
    ],
    highlight: true,
  },
  {
    name: 'Anual',
    price: 'R$ 179,90',
    description: 'Plano completo para quem quer resultado o ano todo.',
    features: [
      'Tudo do Semestral',
      'Consultoria personalizada',
      'Relatórios avançados',
      'Brindes exclusivos',
    ],
    highlight: false,
  },
];

const steps = [
  { icon: <Smile className="w-8 h-8 text-fuchsia-400" />, title: '1. Cadastro rápido', desc: 'Crie sua conta em segundos.' },
  { icon: <Bot className="w-8 h-8 text-blue-400" />, title: '2. IA analisa', desc: 'Nossa IA entende seu perfil e objetivos.' },
  { icon: <TrendingUp className="w-8 h-8 text-emerald-400" />, title: '3. Receba insights', desc: 'Dicas e automações personalizadas.' },
  { icon: <Zap className="w-8 h-8 text-yellow-400" />, title: '4. Automatize', desc: 'Agende, organize e alcance suas metas.' },
];

const benefits = [
  { icon: <Sparkles className="w-7 h-7 text-fuchsia-400" />, title: 'Automação Inteligente', desc: 'Deixe a IA cuidar das tarefas repetitivas.' },
  { icon: <ShieldCheck className="w-7 h-7 text-blue-400" />, title: 'Segurança Total', desc: 'Seus dados protegidos com criptografia.' },
  { icon: <Users className="w-7 h-7 text-emerald-400" />, title: 'IA Personalizada', desc: 'Respostas e dicas sob medida para você.' },
  { icon: <Banknote className="w-7 h-7 text-yellow-400" />, title: 'Controle Financeiro', desc: 'Visualize gastos, receitas e metas.' },
];

const testimonials = [
  {
    name: 'Ana Souza',
    role: 'Empreendedora',
    text: 'O Alfred IA revolucionou minha organização financeira. Recomendo para todos que querem praticidade e resultados!',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    name: 'Carlos Lima',
    role: 'Analista Financeiro',
    text: 'A automação de compromissos e o chat IA são diferenciais incríveis. Ganhei tempo e clareza nas decisões.',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    name: 'Juliana Alves',
    role: 'Designer',
    text: 'Simples, bonito e eficiente. O Alfred me ajudou a economizar e planejar melhor meus projetos.',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
];

const faqs = [
  {
    q: 'Preciso cadastrar cartão para testar?',
    a: 'Não! Você pode experimentar gratuitamente por 24h sem compromisso.'
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, o cancelamento é simples e sem burocracia.'
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Totalmente. Usamos criptografia e seguimos as melhores práticas de segurança.'
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim! O Alfred IA é 100% responsivo e funciona em qualquer dispositivo.'
  },
  {
    q: 'O que acontece após o trial?',
    a: 'Você pode escolher um dos planos e continuar aproveitando todos os recursos.'
  },
];

const fakeReplies = [
  'Olá! Eu sou o Alfred, seu mordomo IA. Como posso te ajudar hoje?',
  'Adorei sua pergunta! 😃 Mas lembre-se: aqui é só uma simulação!',
  'Organização financeira é tudo! Posso te ajudar com dicas se quiser.',
  'Quer uma dica para economizar? Pergunta aí!',
  'Se quiser testar o app de verdade, clique em experimentar!',
  'Eu também adoro conversar!',
  'Dinheiro não traz felicidade, mas organização sim!',
  'Se precisar de um conselho, é só perguntar!',
  'Posso te contar uma piada financeira se quiser!',
  'Estou sempre pronto para ajudar!',
  'Vamos juntos conquistar seus objetivos financeiros!',
  'Se precisar de motivação para economizar, estou aqui!',
  'Adorei sua mensagem! 😃',
];

const autoDemoSteps = [
  { from: 'user', text: 'Gastei 50 reais com mercado' },
  { from: 'alfred', text: 'Tá gastando legal, hein? Vamos se controlar! 😅' },
  { from: 'alfred', text: 'Anotado! Gasto de R$50,00 em mercado registrado com sucesso! 🎉' },
  { from: 'user', text: 'Recebi 200 reais de salário' },
  { from: 'alfred', text: 'Aí sim! Dinheiro entrando é sempre bom! 💸' },
  { from: 'alfred', text: 'Recebimento de R$200,00 de salário registrado! Parabéns! 🥳' },
  { from: 'user', text: 'Agendar dentista amanhã 15h' },
  { from: 'alfred', text: 'Cuidar da saúde é importante! Não esquece de escovar os dentes! 😁' },
  { from: 'alfred', text: 'Compromisso "Dentista" agendado para amanhã às 15h! 🦷📅' },
  { from: 'alfred', text: 'Suas anotações já estão disponíveis na sua dashboard e amanhã 1h antes do seu compromisso irei te lembrar pelo whatsapp.' },
];

function getRandomReply() {
  return fakeReplies[Math.floor(Math.random() * fakeReplies.length)];
}

const FakeChat: React.FC = () => {
  const [messages, setMessages] = useState([
    { from: 'alfred', text: fakeReplies[0] }
  ]);
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [autoStep, setAutoStep] = useState(0);
  const [autoDemoDone, setAutoDemoDone] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto demo effect
  useEffect(() => {
    if (autoDemoDone) return;
    if (autoStep >= autoDemoSteps.length) {
      setAutoDemoDone(true);
      return;
    }
    const step = autoDemoSteps[autoStep];
    let delay = 1200;
    if (step.from === 'user') delay = 1600;
    const timeout = setTimeout(() => {
      setMessages(msgs => [...msgs, step]);
      setAutoStep(s => s + 1);
      if (step.from === 'alfred') setIsReplying(false);
      if (step.from === 'user') setIsReplying(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [autoStep, autoDemoDone]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isReplying]);

  // Após demo, volta ao chat normal
  const handleSend = () => {
    if (!input.trim() || isReplying) return;
    setMessages(msgs => [...msgs, { from: 'user', text: input }]);
    setInput('');
    setIsReplying(true);
    setTimeout(() => {
      setMessages(msgs => [...msgs, { from: 'alfred', text: getRandomReply() }]);
      setIsReplying(false);
    }, 900 + Math.random() * 800);
  };

  // Detectar se chegou ao fim do fluxo demo
  const isDemoEnded = autoDemoDone && messages.length > 0 && messages[messages.length - 1].text.includes('disponíveis na sua dashboard');

  // Adicionar função utilitária para abrir no navegador correto
  function openAppInBrowser() {
    const url = 'https://alfred-100.vercel.app';
    window.location.href = url;
  }

  // No FakeChat, ajustar botão para ser clicável na /ads
  const isAdsPage = typeof window !== 'undefined' && window.location.pathname === '/ads';

  return (
    <div className="rounded-2xl bg-white/80 shadow-xl p-4 flex flex-col gap-2 border border-indigo-100 min-h-[180px]">
      <div ref={chatRef} className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-2">
        {messages.map((msg, i) => (
          msg.from === 'alfred' ? (
            <div key={i} className="flex items-start gap-2 animate-fade-in-up">
              <MascotSVG className="w-8 h-8" />
              <div className="bg-indigo-50 px-4 py-2 rounded-2xl text-indigo-900 font-medium shadow mascot-chat-bubble animate-bounce-in">{msg.text}</div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-2 self-end animate-fade-in-up">
              <div className="bg-purple-100 px-4 py-2 rounded-2xl text-purple-900 font-medium shadow animate-bounce-in">{msg.text}</div>
              <span className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center font-bold text-purple-700">Você</span>
            </div>
          )
        ))}
        {isReplying && (
          <div className="flex items-start gap-2 animate-fade-in-up">
            <MascotSVG className="w-8 h-8 opacity-70" />
            <div className="bg-indigo-50 px-4 py-2 rounded-2xl text-indigo-400 font-medium shadow mascot-chat-bubble animate-bounce-in flex items-center gap-2"><span className="animate-pulse">Digitando...</span></div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          className="flex-1 rounded-xl border border-indigo-200 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          placeholder={isDemoEnded ? 'Continue no app para conversar de verdade!' : 'Digite aqui...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={isReplying || !autoDemoDone || isDemoEnded}
        />
        <button
          className={`rounded-full ${isDemoEnded ? (isAdsPage ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer' : 'bg-gray-400 cursor-not-allowed') : 'bg-indigo-500 hover:bg-indigo-600'} text-white p-2 shadow transition`}
          onClick={isDemoEnded && isAdsPage ? openAppInBrowser : handleSend}
          disabled={isDemoEnded ? (!isAdsPage) : (isReplying || !input.trim() || !autoDemoDone)}
        >
          {isDemoEnded ? 'Continue no app' : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M2 21l21-9-21-9v7l15 2-15 2v7z" fill="currentColor"/></svg>
          )}
        </button>
      </div>
    </div>
  );
};

// Adicionar fundo animado e mascote no Hero
const AnimatedBackground = () => (
  <div className="absolute inset-0 -z-10 animate-gradient-x bg-gradient-to-tr from-indigo-200 via-white to-purple-200 opacity-80" style={{ filter: 'blur(2px)' }} />
);

const ParticleLayer = () => (
  <div className="absolute inset-0 -z-10 pointer-events-none">
    {/* Simples partículas animadas com CSS */}
    {[...Array(18)].map((_, i) => (
      <span key={i} className={`absolute rounded-full bg-indigo-300 opacity-30 animate-bounce-in`} style={{
        width: `${16 + Math.random() * 24}px`,
        height: `${16 + Math.random() * 24}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`
      }} />
    ))}
  </div>
);

const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white flex flex-col items-center justify-start">
      <AnimatedBackground />
      <ParticleLayer />
      <section className="w-full flex flex-col items-center justify-center pt-16 pb-8">
        <MascotSVG className="w-44 h-44 mb-4 animate-fade-in-up mascot-blink" />
        <h1 className="text-4xl md:text-6xl font-extrabold text-center text-indigo-700 drop-shadow-lg animate-fade-in-up">Alfred IA<br /><span className="text-purple-500">Seu mordomo financeiro</span></h1>
        <p className="mt-4 text-lg md:text-2xl text-gray-700 text-center max-w-2xl animate-fade-in-up">Organize sua vida financeira com inteligência, simpatia e diversão. Experimente conversar com o Alfred!</p>
        <div className="mt-8 w-full max-w-md animate-fade-in-up">
          <FakeChat />
        </div>
      </section>
      {/* Outras seções animadas e divertidas podem ser adicionadas abaixo */}
    </div>
  );
};

export default LandingPage;
export { FakeChat }; 