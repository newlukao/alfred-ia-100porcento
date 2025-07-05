import React from 'react';
import MascotSVG from './LandingPageMascot';

// Importar o mesmo FakeChat da LandingPage
// Copiar a implementação do FakeChat para cá, mantendo o fluxo automático e bloqueio ao final

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
];

function getRandomReply() {
  return fakeReplies[Math.floor(Math.random() * fakeReplies.length)];
}

const FakeChat: React.FC = () => {
  const [messages, setMessages] = React.useState([
    { from: 'alfred', text: fakeReplies[0] }
  ]);
  const [input, setInput] = React.useState('');
  const [isReplying, setIsReplying] = React.useState(false);
  const [autoStep, setAutoStep] = React.useState(0);
  const [autoDemoDone, setAutoDemoDone] = React.useState(false);
  const chatRef = React.useRef<HTMLDivElement>(null);

  // Auto demo effect
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isReplying]);

  // Detectar se chegou ao fim do fluxo demo
  const isDemoEnded = autoDemoDone && messages.length > 0 && messages[messages.length - 1].text.includes('Dentista');

  // Após demo, volta ao chat normal
  const handleSend = () => {
    if (!input.trim() || isReplying || isDemoEnded) return;
    setMessages(msgs => [...msgs, { from: 'user', text: input }]);
    setInput('');
    setIsReplying(true);
    setTimeout(() => {
      setMessages(msgs => [...msgs, { from: 'alfred', text: getRandomReply() }]);
      setIsReplying(false);
    }, 900 + Math.random() * 800);
  };

  return (
    <div className="rounded-2xl bg-white/90 shadow-xl p-4 flex flex-col gap-2 border border-indigo-100 min-h-[180px] w-full max-w-xs mx-auto">
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
          className={`rounded-full ${isDemoEnded ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'} text-white p-2 shadow transition`}
          onClick={handleSend}
          disabled={isReplying || !input.trim() || !autoDemoDone || isDemoEnded}
        >
          {isDemoEnded ? 'Continue no app' : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M2 21l21-9-21-9v7l15 2-15 2v7z" fill="currentColor"/></svg>
          )}
        </button>
      </div>
    </div>
  );
};

const LpChatWidget: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 p-2">
      <MascotSVG className="w-16 h-16 mb-2 mascot-blink" />
      <FakeChat />
    </div>
  );
};

export default LpChatWidget; 