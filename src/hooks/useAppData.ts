
import { use } from 'react';
import { AppContext } from '../context/AppContext';

/**
 * Custom hook to access the global application state and actions.
 * Throws an error if used outside of an AppProvider.
 */
export const useAppData = () => {
  const context = use(AppContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppProvider');
  }
  return context;
};
