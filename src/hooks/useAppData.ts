
import { use } from 'react';
import { AppContext } from '../context/AppContext';

export const useAppData = () => {
  const context = use(AppContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppProvider');
  }
  return context;
};
