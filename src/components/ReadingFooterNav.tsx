import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, Library } from 'lucide-react';
import { ReadingTheme } from '../types/book';

interface ReadingFooterNavProps {
  currentChapterNumber: number;
  hasPrevious: boolean;
  hasNext: boolean;
  theme: ReadingTheme;
  onPrevious?: () => void;
  onNext?: () => void;
  onReturnToLibrary: () => void;
}

export const ReadingFooterNav: React.FC<ReadingFooterNavProps> = ({
  hasPrevious,
  hasNext,
  theme,
  onPrevious,
  onNext,
  onReturnToLibrary,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const borderClass = {
    paper: 'border-stone-200',
    cream: 'border-[#E2DAC7]',
    sepia: 'border-[#DFCDB3]',
    dark: 'border-zinc-800',
  }[theme];

  return (
    <footer className={`mt-20 pt-10 border-t ${borderClass}`}>
      {/* Marcador ornamental de encerramento do capítulo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 text-stone-400 dark:text-zinc-500 select-none">
          <span className="w-12 h-px bg-current opacity-30" />
          <span className="font-serif text-sm italic tracking-widest">✦ ✦ ✦</span>
          <span className="w-12 h-px bg-current opacity-30" />
        </div>
        <p className="mt-3 text-xs tracking-wider uppercase font-sans text-stone-500 dark:text-zinc-400">
          Término do Capítulo
        </p>
      </div>

      {/* Controles de Navegação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-sm">
        {/* Capítulo Anterior */}
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
            hasPrevious
              ? 'hover:bg-black/5 active:bg-black/10 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 text-stone-800 dark:text-zinc-200 cursor-pointer'
              : 'opacity-30 cursor-not-allowed text-stone-400 dark:text-zinc-600'
          }`}
          title={hasPrevious ? 'Ir para o capítulo anterior' : 'Este é o primeiro capítulo'}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Capítulo Anterior</span>
        </button>

        {/* Retornar à Biblioteca & Voltar ao Topo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReturnToLibrary}
            className="flex items-center gap-2 py-2 px-3.5 rounded-lg border border-black/10 hover:border-black/20 hover:bg-black/5 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-200 transition-colors text-xs font-medium cursor-pointer"
            title="Retornar à Biblioteca"
          >
            <Library className="w-3.5 h-3.5" />
            <span>Biblioteca</span>
          </button>

          <button
            onClick={scrollToTop}
            className="p-2 rounded-lg border border-black/10 hover:border-black/20 hover:bg-black/5 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Voltar ao início do capítulo"
            aria-label="Voltar ao início do capítulo"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Próximo Capítulo */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
            hasNext
              ? 'hover:bg-black/5 active:bg-black/10 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 text-stone-800 dark:text-zinc-200 cursor-pointer'
              : 'opacity-30 cursor-not-allowed text-stone-400 dark:text-zinc-600'
          }`}
          title={hasNext ? 'Ir para o próximo capítulo' : 'Próximo capítulo ainda não disponível'}
        >
          <span>Próximo Capítulo</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
