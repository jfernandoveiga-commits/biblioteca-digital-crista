import React, { useEffect, useState } from 'react';
import { BibleReferenceTarget, BibleVerse, BibleBookData } from '../types/bible';
import { getChapterVerses } from '../services/bibleService';
import { ReadingTheme, FontSizeScale } from '../types/book';
import { X, BookOpen, ExternalLink, Loader2 } from 'lucide-react';

interface BiblePassageModalProps {
  target: BibleReferenceTarget;
  theme: ReadingTheme;
  fontSize: FontSizeScale;
  onClose: () => void;
  onOpenFullChapter: (target: BibleReferenceTarget) => void;
}

export const BiblePassageModal: React.FC<BiblePassageModalProps> = ({
  target,
  theme,
  fontSize,
  onClose,
  onOpenFullChapter,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [bookData, setBookData] = useState<BibleBookData | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getChapterVerses(target.bookAbbrev, target.chapter, target.verseStart, target.verseEnd)
      .then((res) => {
        if (!isMounted) return;
        if (!res) {
          setError(`Passagem não encontrada na Bíblia Livre (${target.originalText})`);
          setLoading(false);
          return;
        }
        setVerses(res.verses);
        setBookData(res.book);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(err);
        setError('Ocorreu um erro ao carregar os versículos da Bíblia.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [target]);

  const modalBgStyles = {
    paper: 'bg-[#FBFBF9] text-stone-850 border-stone-200',
    cream: 'bg-[#F7F2E7] text-[#292524] border-[#E2DAC7]',
    sepia: 'bg-[#F3EAD8] text-[#3D3025] border-[#DFCDB3]',
    dark: 'dark bg-[#18181B] text-zinc-100 border-zinc-800',
  }[theme];

  const verseHighlightBg = {
    paper: 'bg-stone-100/80 border-stone-300/80',
    cream: 'bg-[#EFE7D5]/80 border-[#DDD3BC]',
    sepia: 'bg-[#E8DCC2]/80 border-[#D8C7A8]',
    dark: 'bg-zinc-900 border-zinc-700 text-zinc-100',
  }[theme];

  const fontSizeClasses = {
    sm: 'text-[15.5px] leading-[1.75]',
    md: 'text-[17px] leading-[1.8]',
    lg: 'text-[19px] leading-[1.85]',
    xl: 'text-[21px] leading-[1.9]',
  }[fontSize];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bible-passage-title"
    >
      {/* Backdrop click to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div
        className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${modalBgStyles}`}
      >
        {/* Header do modal */}
        <header className="px-5 py-4 border-b border-black/10 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-stone-700 dark:text-amber-400" />
            </div>
            <div className="truncate">
              <h2 id="bible-passage-title" className="font-display text-lg sm:text-xl font-bold truncate text-stone-900 dark:text-zinc-50">
                {bookData ? `${bookData.name} ${target.chapter}` : target.originalText}
                {target.verseStart ? `:${target.verseStart}${target.verseEnd && target.verseEnd !== target.verseStart ? `-${target.verseEnd}` : ''}` : ''}
              </h2>
              <p className="text-[11px] font-sans text-stone-500 dark:text-zinc-400">
                Bíblia Livre (BLIVRE) · Tradução aberta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Fechar e retornar ao livro"
            aria-label="Fechar e retornar ao livro"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Conteúdo com os versículos */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-zinc-400 font-sans">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Consultando texto da Bíblia Livre...</p>
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center font-sans">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">{error}</p>
              <button
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-lg border border-black/10 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Voltar à leitura
              </button>
            </div>
          )}

          {!loading && !error && verses.length > 0 && (
            <div className={`font-serif space-y-3 ${fontSizeClasses}`}>
              {verses.map((v) => (
                <div
                  key={v.verse}
                  className={`p-3 sm:p-3.5 rounded-xl border transition-colors ${verseHighlightBg}`}
                >
                  <span className="font-sans font-bold text-xs mr-2 text-stone-500 dark:text-zinc-400 select-none">
                    {v.verse}
                  </span>
                  <span className="leading-relaxed text-stone-850 dark:text-zinc-100">{v.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé com ação de ver capítulo completo */}
        <footer className="px-5 py-3.5 border-t border-black/10 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 font-sans text-xs">
          <span className="text-[11px] text-stone-500 dark:text-zinc-400">
            Fonte: Bíblia Livre (CC BY 3.0 BR)
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="py-2 px-3 rounded-lg border border-black/10 hover:bg-black/5 dark:border-zinc-700 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              Voltar ao livro
            </button>

            <button
              onClick={() => onOpenFullChapter(target)}
              className="py-2 px-3.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-50 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir o capítulo completo deste livro bíblico"
            >
              <span>Ler capítulo completo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
