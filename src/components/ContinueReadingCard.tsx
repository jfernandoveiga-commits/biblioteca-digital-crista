import React from 'react';
import { BookmarkCheck, BookOpen, Clock, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { SmartBookmark, smartBookmarkService } from '../services/smartBookmarkService';

interface ContinueReadingCardProps {
  bookmark: SmartBookmark;
  onResume: (bookmark: SmartBookmark, resetToTop?: boolean) => void;
  onClear?: () => void;
  isDark?: boolean;
  className?: string;
}

export const ContinueReadingCard: React.FC<ContinueReadingCardProps> = ({
  bookmark,
  onResume,
  onClear,
  isDark = false,
  className = '',
}) => {
  const relativeTime = smartBookmarkService.formatRelativeTime(bookmark.updatedAt);
  const percentage = Math.min(100, Math.max(0, Math.round(bookmark.percentage || 0)));

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-sm relative overflow-hidden group ${
        isDark
          ? 'bg-gradient-to-br from-zinc-900 to-zinc-900/90 border-amber-900/50 shadow-black/40'
          : 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border-amber-200/80 shadow-amber-950/5'
      } ${className}`}
    >
      {/* Detalhe de fundo suave */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

      {/* CABEÇALHO DO CARD */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider bg-amber-500 text-stone-950 shadow-xs">
            <BookmarkCheck className="w-3 h-3" />
            Continuar Lendo
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-500 dark:text-zinc-400">
            <Clock className="w-3 h-3 opacity-70" />
            {relativeTime}
          </span>
        </div>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-stone-400 hover:text-stone-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            title="Remover marcador deste livro"
          >
            Dispensar
          </button>
        )}
      </div>

      {/* TÍTULOS DO LIVRO E CAPÍTULO */}
      <div className="space-y-0.5 mb-3">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
          {bookmark.bookTitle}
        </div>
        <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 dark:text-zinc-50 leading-snug">
          {bookmark.chapterNumberText ? `${bookmark.chapterNumberText} · ` : ''}{bookmark.chapterTitle}
        </h3>
      </div>

      {/* SNIPPET DO TRECHO ONDE O LEITOR PAROU */}
      {bookmark.textSnippet && (
        <blockquote className="text-xs font-serif italic text-stone-600 dark:text-zinc-300 line-clamp-2 pl-2.5 border-l-2 border-amber-400/80 dark:border-amber-500/60 mb-3.5">
          "{bookmark.textSnippet}"
        </blockquote>
      )}

      {/* BARRA DE PROGRESSO VISUAL */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-sans font-medium text-stone-600 dark:text-zinc-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Progresso salvo no capítulo
          </span>
          <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
            {percentage}% concluído
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-stone-200/80 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(4, percentage)}%` }}
          />
        </div>
      </div>

      {/* AÇÕES DE RETOMADA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-amber-200/60 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => onResume(bookmark, false)}
          className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs font-bold font-sans transition-all shadow-xs hover:shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>Continuar de Onde Parou</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => onResume(bookmark, true)}
          className="py-2 px-3 rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-sans font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          title="Recomeçar a leitura deste capítulo do início"
        >
          <RotateCcw className="w-3 h-3 opacity-70" />
          <span>Ler do início</span>
        </button>
      </div>
    </div>
  );
};
