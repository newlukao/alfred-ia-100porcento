import React from 'react';
import { Home, MessageCircle, Bell, Calendar, User } from 'lucide-react';

interface MobileBottomNavProps {
  active: string;
  onChange: (id: string) => void;
  agendaBadge?: number;
  avisosBadge?: number;
}

const navItems = [
  { id: 'overview', label: 'Início', icon: <Home className="w-5 h-5" /> },
  { id: 'calendar', label: 'Meus compromissos', icon: <Calendar className="w-5 h-5" /> },
  { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-5 h-5" /> },
  { id: 'notifications', label: 'Avisos', icon: <Bell className="w-5 h-5" /> },
  { id: 'profile', label: 'Perfil', icon: <User className="w-5 h-5" /> },
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ active, onChange, agendaBadge, avisosBadge }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg md:hidden">
      <div className="flex items-center justify-center px-2 py-1">
        <div className="flex items-center justify-between w-full max-w-sm">
          {navItems.map((item, index) => {
            // Badge para compromissos
            const showAgendaBadge = item.id === 'calendar' && agendaBadge && agendaBadge > 0;
            const showAvisosBadge = item.id === 'notifications' && avisosBadge && avisosBadge > 0;
            return (
              <button
                key={item.id}
                className={`
                  flex flex-col items-center justify-center p-2 min-w-[60px] h-14
                  transition-all duration-200 ease-in-out rounded-lg
                  ${active === item.id 
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 scale-105' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }
                `}
                onClick={() => onChange(item.id)}
              >
                <div className="relative">
                  {item.icon}
                  {showAgendaBadge && (
                    <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none shadow-md">
                      {agendaBadge}
                    </span>
                  )}
                  {showAvisosBadge && (
                    <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none shadow-md">
                      {avisosBadge}
                    </span>
                  )}
                </div>
                <span className={`
                  text-xs mt-1 font-medium
                  ${active === item.id ? 'font-bold' : ''}
                `}>
                  {item.label}
                </span>
                {active === item.id && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav; 