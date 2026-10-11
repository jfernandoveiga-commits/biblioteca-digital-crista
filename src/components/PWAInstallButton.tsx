import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { ReadingTheme } from '../types/book';

interface PWAInstallButtonProps {
  theme?: ReadingTheme;
  variant?: 'header' | 'button' | 'badge' | 'footer';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  theme = 'cream',
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isStandalone, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Se já estiver rodando em standalone nativo, oculta o botão
  if (isStandalone) {
    return null;
  }

  const handleClick = async () => {
    // Se o evento do navegador estiver pronto, tenta direto
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setIsModalOpen(true);
      }
    } else {
      // Abre modal com orientações detalhadas
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-xs font-sans font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
            isInstallable
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 shadow-xs'
              : 'border-black/10 hover:border-black/20 hover:bg-black/5 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:text-zinc-200 text-stone-700'
          } ${className}`}
          title="Instalar Biblioteca Digital no celular"
          aria-label="Instalar aplicativo no celular"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden">Instalar</span>
          {isInstallable && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      )}

      {variant === 'button' && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            theme === 'dark'
              ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300'
          } ${className}`}
        >
          <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Instalar Aplicativo no Celular</span>
        </button>
      )}

      {variant === 'badge' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer ${className}`}
        >
          <Download className="w-3 h-3" />
          <span>Instalar no celular</span>
        </button>
      )}

      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        theme={theme}
      />
    </>
  );
};
