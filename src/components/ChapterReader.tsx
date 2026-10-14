import React, { useRef, useState, useEffect } from 'react';
import {
  Chapter,
  Book,
  ReadingTheme,
  FontSizeScale,
  LibraryFeaturesConfig,
  Bookmark as BookmarkType,
} from '../types/book';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { ReadingHeader } from './ReadingHeader';
import { ReadingFooterNav } from './ReadingFooterNav';
import { ReflectionQuestionsSection } from './ReflectionQuestionsSection';
import {
  BookOpen,
  ExternalLink,
  Bookmark,
  Play,
  Pause,
  Square,
  FastForward,
  Rewind,
  Volume2,
  X,
  Trash2,
  Check,
} from 'lucide-react';
import { BibleReferenceTarget } from '../types/bible';
import { parseBibleReference } from '../services/bibleService';
import { bookmarkStorageService } from '../services/bookmarkStorageService';
import { audioSpeechService, AudioPlaybackState, AudioSpeedRate } from '../services/audioSpeechService';

interface ChapterReaderProps {
  book: Book;
  chapter: Chapter;
  theme: ReadingTheme;
  fontSize: FontSizeScale;
  onThemeChange: (theme: ReadingTheme) => void;
  onFontSizeChange: (size: FontSizeScale) => void;
  onReturnToLibrary: () => void;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
  hasPreviousChapter?: boolean;
  hasNextChapter?: boolean;
  onOpenBible?: () => void;
  onOpenBibleReference?: (target: BibleReferenceTarget) => void;
  onLogout?: () => void;
  features?: LibraryFeaturesConfig;
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  book,
  chapter,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onReturnToLibrary,
  onPreviousChapter,
  onNextChapter,
  hasPreviousChapter = false,
  hasNextChapter = false,
  onOpenBible,
  onOpenBibleReference,
  onLogout,
  features,
}) => {
  const contentRef = useRef<HTMLElement>(null);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const progressPercentage = useReadingProgress(contentRef);

  // Verificações de permissão de funcionalidades com fallback seguro (true)
  const isSearchEnabled = features ? features.search : true;
  const isBookmarksEnabled = features ? features.bookmarks : true;
  const isAudioEnabled = features ? Boolean(features.audioReading) : false;
  const isReflectionEnabled = features ? features.reflectionQuestions : true;
  const isBibleEnabled = features ? features.integratedBible : true;

  // 1. ESTADO DE PESQUISA
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Calcula ocorrências da pesquisa no conteúdo dos parágrafos
  const matchesInfo = React.useMemo(() => {
    if (!searchQuery.trim() || !chapter.content) return { count: 0, positions: [] };
    const query = searchQuery.trim().toLowerCase();
    const positions: { pIndex: number; matchOffset: number }[] = [];

    chapter.content.forEach((para, pIdx) => {
      let idx = para.toLowerCase().indexOf(query);
      while (idx !== -1) {
        positions.push({ pIndex: pIdx, matchOffset: idx });
        idx = para.toLowerCase().indexOf(query, idx + query.length);
      }
    });

    return { count: positions.length, positions };
  }, [searchQuery, chapter.content]);

  // Navega para a ocorrência da pesquisa
  const scrollToMatch = (matchIdx: number) => {
    if (matchesInfo.positions[matchIdx]) {
      const pIndex = matchesInfo.positions[matchIdx].pIndex;
      const el = paragraphRefs.current[pIndex];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleNextMatch = () => {
    if (matchesInfo.count === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchesInfo.count;
    setCurrentMatchIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (matchesInfo.count === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchesInfo.count) % matchesInfo.count;
    setCurrentMatchIndex(prevIdx);
    scrollToMatch(prevIdx);
  };

  // 2. ESTADO DE MARCADORES
  const [isBookmarksDrawerOpen, setIsBookmarksDrawerOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);

  // Carrega marcadores do capítulo
  useEffect(() => {
    if (isBookmarksEnabled) {
      setBookmarks(bookmarkStorageService.getAll());
    }
  }, [isBookmarksEnabled, book.id, chapter.id]);

  const handleToggleBookmark = (paragraphIndex: number, text: string) => {
    if (!isBookmarksEnabled) return;
    const snippet = text.slice(0, 140) + (text.length > 140 ? '...' : '');
    bookmarkStorageService.toggleBookmark({
      bookId: book.id,
      bookTitle: book.title,
      chapterId: chapter.id,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      paragraphIndex,
      textSnippet: snippet,
    });
    setBookmarks(bookmarkStorageService.getAll());
  };

  const isParagraphBookmarked = (paragraphIndex: number) => {
    return bookmarks.some(
      (b) => b.bookId === book.id && b.chapterId === chapter.id && b.paragraphIndex === paragraphIndex
    );
  };

  // 3. ESTADO DE ÁUDIO (LEITURA EM VOZ ALTA)
  const [isAudioBarOpen, setIsAudioBarOpen] = useState(false);
  const [audioState, setAudioState] = useState<AudioPlaybackState>(audioSpeechService.getState());

  useEffect(() => {
    if (!isAudioEnabled) {
      audioSpeechService.stop();
      setIsAudioBarOpen(false);
      return;
    }

    const unsubscribe = audioSpeechService.subscribe((state) => {
      setAudioState(state);
      // Rola automaticamente para acompanhar a leitura
      if (state.isPlaying && paragraphRefs.current[state.currentParagraphIndex]) {
        paragraphRefs.current[state.currentParagraphIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    });

    return () => {
      unsubscribe();
      audioSpeechService.stop();
    };
  }, [isAudioEnabled, chapter.id]);

  // Carrega parágrafos no serviço de voz ao abrir o capítulo
  useEffect(() => {
    if (chapter.content && isAudioEnabled) {
      audioSpeechService.loadParagraphs(chapter.content);
    }
  }, [chapter.content, isAudioEnabled]);

  const handleToggleAudioBar = () => {
    if (isAudioBarOpen) {
      setIsAudioBarOpen(false);
    } else {
      setIsAudioBarOpen(true);
      if (chapter.content) {
        audioSpeechService.loadParagraphs(chapter.content);
      }
    }
  };

  // 4. DESTAQUES DE TEXTO (REFERÊNCIAS BÍBLICAS + PESQUISA)
  const renderHighlightedContent = (text: string, pIndex: number) => {
    // 4.1 Se pesquisa ativa, destaca o termo buscado
    if (isSearchEnabled && searchQuery.trim().length > 0) {
      const query = searchQuery.trim();
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, idx) => {
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <mark
              key={idx}
              className="bg-amber-200 dark:bg-amber-500/50 text-stone-900 dark:text-zinc-100 rounded-xs px-0.5"
            >
              {part}
            </mark>
          );
        }
        return isBibleEnabled ? renderBibleLinks(part) : part;
      });
    }

    // 4.2 Sem pesquisa, processa links da Bíblia (se Bíblia estiver ativada)
    return isBibleEnabled ? renderBibleLinks(text) : text;
  };

  const renderBibleLinks = (text: string) => {
    if (!onOpenBibleReference || !isBibleEnabled) return text;
    const parts = text.split(/(Salmo\s+1(?::\d+(?:-\d+)?)?)/g);
    if (parts.length === 1) return text;

    return parts.map((part, pIdx) => {
      if (/^Salmo\s+1/i.test(part)) {
        return (
          <button
            key={pIdx}
            type="button"
            onClick={async () => {
              const parsed = await parseBibleReference(part);
              if (parsed) onOpenBibleReference(parsed);
            }}
            className="underline font-semibold decoration-stone-400/80 hover:decoration-stone-800 text-stone-900 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200 dark:decoration-amber-400/60 dark:hover:decoration-amber-300 cursor-pointer font-inherit inline transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 rounded-xs px-0.5"
            title={`Consultar ${part} na Bíblia`}
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  // Mapeamento de temas visuais
  const themeContainerStyles = {
    paper: 'bg-[#FBFBF9] text-stone-850 selection:bg-stone-200 selection:text-stone-900',
    cream: 'bg-[#F7F2E7] text-[#292524] selection:bg-[#E7DEC8] selection:text-[#1F1C1A]',
    sepia: 'bg-[#F3EAD8] text-[#3D3025] selection:bg-[#DECDB1] selection:text-[#281F17]',
    dark: 'dark bg-[#18181B] text-zinc-100 selection:bg-zinc-700 selection:text-zinc-50',
  }[theme];

  const scriptureBoxStyles = {
    paper: 'bg-stone-50/80 border-stone-200/90 text-stone-800',
    cream: 'bg-[#F4EEDF]/70 border-[#DDD5C0] text-[#2C2724]',
    sepia: 'bg-[#ECE0CB]/70 border-[#D8C7AD] text-[#3B2F23]',
    dark: 'bg-zinc-900 border-zinc-800 text-zinc-100',
  }[theme];

  const fontSizeClasses = {
    sm: 'text-[16px] sm:text-[17px] leading-[1.7]',
    md: 'text-[18px] sm:text-[19.5px] leading-[1.7]',
    lg: 'text-[20px] sm:text-[22px] leading-[1.7]',
    xl: 'text-[22.5px] sm:text-[24.5px] leading-[1.7]',
  }[fontSize];

  const chapterLabel = chapter.romanNumber || `Capítulo ${chapter.number}`;
  const hasNarrative = chapter.content && chapter.content.length > 0;
  const hasBiblicalTexts = chapter.biblicalTexts && chapter.biblicalTexts.length > 0;
  const hasReflectionQuestions = chapter.reflectionQuestions && chapter.reflectionQuestions.length > 0;

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col ${themeContainerStyles}`}>
      {/* Cabeçalho superior com controles integrados */}
      <ReadingHeader
        bookTitle={book.title}
        chapterTitle={chapter.title}
        chapterNumberText={chapterLabel}
        progressPercentage={progressPercentage}
        theme={theme}
        fontSize={fontSize}
        onThemeChange={onThemeChange}
        onFontSizeChange={onFontSizeChange}
        onReturnToLibrary={onReturnToLibrary}
        onOpenBible={isBibleEnabled ? onOpenBible : undefined}
        onLogout={onLogout}
        features={features}
        // Pesquisa
        isSearchOpen={isSearchOpen}
        searchQuery={searchQuery}
        onToggleSearch={() => {
          setIsSearchOpen(!isSearchOpen);
          if (isSearchOpen) setSearchQuery('');
        }}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentMatchIndex(0);
        }}
        searchResultsCount={matchesInfo.count}
        currentSearchResultIndex={currentMatchIndex}
        onNextSearchResult={handleNextMatch}
        onPrevSearchResult={handlePrevMatch}
        // Marcadores
        isBookmarksOpen={isBookmarksDrawerOpen}
        onToggleBookmarks={() => setIsBookmarksDrawerOpen(!isBookmarksDrawerOpen)}
        bookmarksCount={bookmarks.length}
        // Áudio
        isAudioOpen={isAudioBarOpen}
        onToggleAudio={handleToggleAudioBar}
        isPlayingAudio={audioState.isPlaying}
      />

      {/* BARRA FLUTUANTE DE ÁUDIO / LEITURA EM VOZ ALTA (se habilitada) */}
      {isAudioEnabled && isAudioBarOpen && (
        <div className="sticky top-14 z-20 px-4 py-2.5 bg-stone-900/95 dark:bg-zinc-900/95 text-stone-100 border-b border-stone-800 backdrop-blur-md animate-in slide-in-from-top-2 duration-150">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-serif font-medium hidden sm:inline">
                Leitura em Voz Alta:
              </span>
              <span className="text-stone-300 dark:text-zinc-400 font-mono text-[11px]">
                Parágrafo {audioState.currentParagraphIndex + 1} de {chapter.content.length}
              </span>
            </div>

            {/* Controles de Reprodução */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => audioSpeechService.previousParagraph()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Parágrafo anterior"
              >
                <Rewind className="w-4 h-4" />
              </button>

              {audioState.isPlaying ? (
                <button
                  type="button"
                  onClick={() => audioSpeechService.pause()}
                  className="p-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-transform active:scale-95 cursor-pointer"
                  title="Pausar áudio"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => audioSpeechService.play()}
                  className="p-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-transform active:scale-95 cursor-pointer"
                  title="Iniciar reprodução"
                >
                  <Play className="w-4 h-4 ml-0.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => audioSpeechService.nextParagraph()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Próximo parágrafo"
              >
                <FastForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => audioSpeechService.stop()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer ml-1"
                title="Parar áudio"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Seletor de Velocidade */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-stone-400">Velocidade:</span>
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg font-mono text-[11px]">
                {([0.75, 1.0, 1.25, 1.5] as AudioSpeedRate[]).map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => audioSpeechService.setRate(rate)}
                    className={`px-1.5 py-0.5 rounded-sm transition-colors cursor-pointer ${
                      audioState.rate === rate
                        ? 'bg-amber-400 text-stone-950 font-bold'
                        : 'hover:bg-white/10 text-stone-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsAudioBarOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-stone-400 hover:text-white ml-2 cursor-pointer"
                title="Fechar barra de áudio"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA CENTRAL DE LEITURA */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 md:px-12 py-10 sm:py-16 md:py-20">
        <article ref={contentRef} className="w-full">
          {/* TÍTULO E HIERARQUIA EDITORIAL */}
          <header className="text-center mb-12 sm:mb-16 md:mb-20">
            <div className="font-display text-sm sm:text-base text-stone-500/90 dark:text-zinc-300 font-semibold tracking-[0.22em] uppercase mb-3">
              {chapterLabel}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance leading-tight text-stone-900 dark:text-zinc-50">
              {chapter.title}
            </h1>

            {chapter.subtitle && (
              <p className="font-serif italic text-base sm:text-lg text-stone-600 dark:text-zinc-300 mt-4 max-w-xl mx-auto text-balance">
                {chapter.subtitle}
              </p>
            )}

            {chapter.status === 'awaiting_publication' && (
              <div className="mt-8 mb-4 p-6 sm:p-8 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 text-stone-800 dark:text-zinc-200 text-left font-serif max-w-xl mx-auto shadow-xs">
                <div className="flex items-center gap-2 text-amber-850 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2 font-sans">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Preparação Editorial & Integridade Autoral
                </div>
                <p className="text-sm leading-relaxed text-stone-700 dark:text-zinc-300">
                  {chapter.editorialNote ||
                    'O texto deste capítulo foi anunciado pelo autor Pr. Fernando Veiga e aguarda a publicação definitiva do texto integral. Em estrito respeito à integridade da obra, a Inteligência Artificial não inventa conteúdo fictício.'}
                </p>
                <div className="mt-3 text-xs text-stone-500 dark:text-zinc-400 font-sans italic border-t border-amber-200/50 dark:border-amber-900/30 pt-2">
                  Autor: {book.author} • Obra: {book.title}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-8 select-none text-stone-400 dark:text-zinc-500 opacity-60">
              <span className="w-8 h-px bg-current" />
              <span className="text-xs font-serif">✦</span>
              <span className="w-8 h-px bg-current" />
            </div>
          </header>

          {/* 1. SEÇÃO DA NARRATIVA */}
          {hasNarrative ? (
            <section aria-label="Narrativa do Capítulo" className={`font-serif max-w-[65ch] mx-auto text-pretty text-stone-850 dark:text-zinc-100 ${fontSizeClasses}`}>
              {chapter.content.map((paragraph, index) => {
                const trimmed = paragraph.trim();

                // Pausa cênica entre momentos narrativos
                if (trimmed === '---') {
                  return (
                    <div
                      key={index}
                      className="py-[1.75em] mb-[1.15em] flex items-center justify-center select-none"
                      aria-hidden="true"
                    >
                      <div className="flex items-center gap-3 text-stone-400 dark:text-zinc-500 opacity-60">
                        <span className="w-8 sm:w-12 h-px bg-current" />
                        <span className="font-serif text-xs tracking-widest">✦ ✦ ✦</span>
                        <span className="w-8 sm:w-12 h-px bg-current" />
                      </div>
                    </div>
                  );
                }

                const isCurrentlySpoken =
                  isAudioEnabled &&
                  audioState.isPlaying &&
                  audioState.currentParagraphIndex === index;

                const hasBookmark = isBookmarksEnabled && isParagraphBookmarked(index);

                const isDialogue = trimmed.startsWith('—') || trimmed.startsWith('-');
                const isQuoteOnly =
                  (trimmed.startsWith('“') || trimmed.startsWith('"') || trimmed.startsWith('«')) &&
                  (trimmed.endsWith('”') || trimmed.endsWith('"') || trimmed.endsWith('»') || trimmed.endsWith('”.') || trimmed.endsWith('".'));

                // Primeiro parágrafo com abertura clássica (apenas se for narrativa normal, não diálogo nem citação)
                if (index === 0 && !isDialogue && !isQuoteOnly) {
                  const firstLetter = paragraph.charAt(0);
                  const restOfParagraph = paragraph.slice(1);

                  return (
                    <div
                      key={index}
                      ref={(el) => {
                        paragraphRefs.current[index] = el as any;
                      }}
                      className={`relative group transition-all duration-200 rounded-lg px-2 py-0.5 -mx-2 mb-[1.15em] last:mb-0 ${
                        isCurrentlySpoken
                          ? 'ring-2 ring-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                          : ''
                      }`}
                    >
                      {/* Botão de Marcador discreto à margem */}
                      {isBookmarksEnabled && (
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(index, paragraph)}
                          className={`absolute -left-7 top-0.5 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer ${
                            hasBookmark ? '!opacity-100 text-amber-600 dark:text-amber-400' : 'text-stone-400 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                          }`}
                          title={hasBookmark ? 'Remover marcador' : 'Marcar este parágrafo'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${hasBookmark ? 'fill-current' : ''}`} />
                        </button>
                      )}

                      <p className="m-0 relative tracking-normal transition-colors text-stone-850 dark:text-zinc-100">
                        <span className="font-bold text-[1.45em] leading-none inline-block align-baseline text-stone-900 dark:text-zinc-50 mr-0.5">
                          {firstLetter}
                        </span>
                        {renderHighlightedContent(restOfParagraph, index)}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    ref={(el) => {
                      paragraphRefs.current[index] = el as any;
                    }}
                    className={`relative group transition-all duration-200 rounded-lg px-2 py-0.5 -mx-2 mb-[1.15em] last:mb-0 ${
                      isCurrentlySpoken
                        ? 'ring-2 ring-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                        : ''
                    }`}
                  >
                    {/* Botão de Marcador discreto à margem */}
                    {isBookmarksEnabled && (
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(index, paragraph)}
                        className={`absolute -left-7 top-0.5 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer ${
                          hasBookmark ? '!opacity-100 text-amber-600 dark:text-amber-400' : 'text-stone-400 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                        }`}
                        title={hasBookmark ? 'Remover marcador' : 'Marcar este parágrafo'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${hasBookmark ? 'fill-current' : ''}`} />
                      </button>
                    )}

                    <p
                      className={`m-0 relative tracking-normal transition-colors ${
                        isDialogue
                          ? 'pl-3.5 sm:pl-4 py-0.5 border-l-2 border-amber-600/70 dark:border-amber-400/60 font-serif text-stone-850 dark:text-zinc-100'
                          : isQuoteOnly
                          ? 'pl-3.5 sm:pl-4 py-0.5 italic border-l-2 border-amber-600/70 dark:border-amber-400/60 text-stone-850 dark:text-amber-100/90 font-serif'
                          : 'text-stone-850 dark:text-zinc-100'
                      }`}
                    >
                      {renderHighlightedContent(paragraph, index)}
                    </p>
                  </div>
                );
              })}
            </section>
          ) : (
            <div className="max-w-[65ch] mx-auto py-12 px-6 rounded-xl border border-dashed border-stone-300 dark:border-zinc-700 text-center font-sans">
              <p className="text-sm text-stone-600 dark:text-zinc-300 font-medium mb-1">
                Aguardando a inserção do texto do capítulo.
              </p>
            </div>
          )}

          {/* 2. SEÇÃO: TEXTOS BÍBLICOS PARA LEITURA */}
          {hasBiblicalTexts && (
            <section aria-label="Textos Bíblicos para Leitura" className="mt-16 sm:mt-24 pt-12 border-t border-stone-200/80 dark:border-zinc-800 max-w-[65ch] mx-auto">
              <div className="text-center mb-10 sm:mb-12">
                <div className="inline-flex items-center gap-2 text-stone-600 dark:text-zinc-300 mb-2">
                  <BookOpen className="w-4 h-4 opacity-85 text-stone-500 dark:text-amber-400" />
                  <h2 className="text-xs sm:text-sm font-sans font-semibold tracking-[0.2em] uppercase">
                    {chapter.biblicalTextsTitle || 'Textos Bíblicos para Leitura'}
                  </h2>
                </div>
                <div className="w-12 h-0.5 bg-stone-300 dark:bg-zinc-700 mx-auto mt-2" />
              </div>

              <div className="space-y-6 sm:space-y-7">
                {chapter.biblicalTexts!.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-5 sm:p-7 rounded-xl border ${scriptureBoxStyles} transition-colors`}
                  >
                    <div className="text-xs sm:text-sm font-sans font-semibold tracking-wider text-stone-700 dark:text-zinc-200 mb-2.5 flex items-center justify-between gap-2">
                      {isBibleEnabled && onOpenBibleReference ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const parsed = await parseBibleReference(item.reference);
                            if (parsed) onOpenBibleReference(parsed);
                          }}
                          className="group inline-flex items-center gap-1.5 hover:underline text-left cursor-pointer text-stone-900 dark:text-amber-300 dark:hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-400 rounded-xs"
                          title={`Consultar ${item.reference} na Bíblia`}
                        >
                          <span className="font-semibold">{item.reference}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100 text-stone-600 dark:text-amber-400 transition-opacity" />
                        </button>
                      ) : (
                        <span className="font-semibold">{item.reference}</span>
                      )}

                      {isBibleEnabled && onOpenBibleReference && (
                        <button
                          type="button"
                          onClick={async () => {
                            const parsed = await parseBibleReference(item.reference);
                            if (parsed) onOpenBibleReference(parsed);
                          }}
                          className="text-xs font-sans font-medium text-stone-600 hover:text-stone-900 dark:text-zinc-300 dark:hover:text-amber-200 transition-colors py-1 px-2.5 rounded-md border border-black/10 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-zinc-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
                        >
                          Ver na Bíblia
                        </button>
                      )}
                    </div>

                    <div className="font-serif italic text-base sm:text-lg leading-relaxed text-pretty border-l-2 border-amber-600/70 dark:border-amber-400/60 pl-4 my-1 text-stone-850 dark:text-zinc-100">
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. SEÇÃO: PERGUNTAS PARA REFLEXÃO (somente se habilitada pela administração) */}
          {hasReflectionQuestions && isReflectionEnabled && (
            <ReflectionQuestionsSection
              bookId={book.id}
              chapterId={chapter.id}
              questions={chapter.reflectionQuestions!}
              theme={theme}
              fontSize={fontSize}
              onOpenBibleReference={isBibleEnabled ? onOpenBibleReference : undefined}
            />
          )}

          {/* NAVEGAÇÃO AO FINAL DO CAPÍTULO */}
          <div className="max-w-[65ch] mx-auto">
            <ReadingFooterNav
              currentChapterNumber={chapter.number}
              hasPrevious={hasPreviousChapter}
              hasNext={hasNextChapter}
              theme={theme}
              onPrevious={onPreviousChapter}
              onNext={onNextChapter}
              onReturnToLibrary={onReturnToLibrary}
            />
          </div>
        </article>
      </main>

      {/* MODAL / PAINEL LATERAL DE MARCADORES (se habilitada) */}
      {isBookmarksEnabled && isBookmarksDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center sm:justify-end p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-md h-full max-h-[85vh] sm:max-h-screen p-6 rounded-2xl sm:rounded-r-none border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 font-sans ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-stone-200 text-stone-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-500 fill-current" />
                  <h3 className="font-serif font-bold text-base text-stone-900 dark:text-zinc-50">
                    Marcadores do Leitor
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookmarksDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-3 text-xs text-stone-500 dark:text-zinc-400 font-serif">
                Trechos marcados durante a leitura (salvos localmente no seu dispositivo):
              </div>

              {/* Lista de Marcadores */}
              <div className="overflow-y-auto max-h-[60vh] space-y-3 pr-1">
                {bookmarks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-400 dark:text-zinc-500 font-serif">
                    Nenhum parágrafo marcado ainda. Passe o mouse sobre qualquer parágrafo para salvá-lo como favorito.
                  </div>
                ) : (
                  bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-800/40 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-zinc-500">
                        <span className="font-serif font-medium truncate max-w-[200px]">
                          {bm.chapterTitle || `Capítulo ${bm.chapterNumber || ''}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            bookmarkStorageService.remove(bm.id);
                            setBookmarks(bookmarkStorageService.getAll());
                          }}
                          className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                          title="Remover marcador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p
                        onClick={() => {
                          if (bm.bookId === book.id && bm.chapterId === chapter.id) {
                            setIsBookmarksDrawerOpen(false);
                            paragraphRefs.current[bm.paragraphIndex]?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'center',
                            });
                          }
                        }}
                        className="text-xs font-serif italic text-stone-700 dark:text-zinc-200 line-clamp-3 cursor-pointer hover:underline"
                        title="Ir para o parágrafo"
                      >
                        “{bm.textSnippet}”
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-stone-400 text-center font-serif">
              Os marcadores permanecem salvos mesmo se a opção for desativada pela administração.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
