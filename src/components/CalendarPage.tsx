import React from 'react';
import Calendar from './Calendar';
import { useAuth } from '../contexts/AuthContext';

const CalendarPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <Calendar user={user} />;
};

export default CalendarPage; 