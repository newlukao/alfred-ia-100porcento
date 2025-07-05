import React from 'react';
import AlfredLogo from '/public/alfred-logo.png';
import { FakeChat } from './LandingPage';
// ... importar e usar o mesmo FakeChat e efeitos da landing atual ...

const AnimatedBackground = () => (
  <div className="absolute inset-0 -z-10 animate-gradient-x bg-gradient-to-tr from-indigo-200 via-white to-purple-200 opacity-80" style={{ filter: 'blur(2px)' }} />
);

const ParticleLayer = () => (
  <div className="absolute inset-0 -z-10 pointer-events-none">
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

export default function AdsLandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white flex flex-col items-center justify-start">
      <AnimatedBackground />
      <ParticleLayer />
      <section className="w-full flex flex-col items-center justify-center pt-16 pb-8">
        <img src={AlfredLogo} alt="Alfred IA Logo" className="w-44 h-44 mb-4 animate-fade-in-up" style={{borderRadius: '50%', background: 'white'}} />
        <h1 className="text-4xl md:text-6xl font-extrabold text-center text-indigo-700 drop-shadow-lg animate-fade-in-up">Alfred IA<br /><span className="text-purple-500">Seu mordomo financeiro</span></h1>
        <p className="mt-4 text-lg md:text-2xl text-gray-700 text-center max-w-2xl animate-fade-in-up">Organize sua vida financeira com inteligência, simpatia e diversão. Experimente conversar com o Alfred!</p>
        <div className="mt-8 w-full max-w-md animate-fade-in-up">
          <FakeChat />
        </div>
      </section>
    </div>
  );
} 