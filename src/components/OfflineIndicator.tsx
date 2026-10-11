import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 dark:bg-amber-500 px-3.5 py-2 text-xs font-sans font-medium text-white shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200"
    >
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
      <span>Modo Offline — Obras e dados em cache disponíveis.</span>
    </div>
  );
};
