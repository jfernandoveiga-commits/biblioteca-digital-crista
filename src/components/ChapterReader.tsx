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
  BookmarkCheck,
  Sparkles,
  Upload,
  ImagePlus,
  Camera,
  RotateCcw,
  Link as LinkIcon,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { BibleReferenceTarget } from '../types/bible';
import { parseBibleReference } from '../services/bibleService';
import { bookmarkStorageService } from '../services/bookmarkStorageService';
import { audioSpeechService, AudioPlaybackState, AudioSpeedRate } from '../services/audioSpeechService';
import { smartBookmarkService, SmartBookmark } from '../services/smartBookmarkService';

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
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
  features?: LibraryFeaturesConfig;
}
/**
 * Otimiza e redimensiona arquivos de imagem enviados para o capítulo,
 * gerando um Data URL de alta fidelidade e tamanho controlado.
 */
function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 1200;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
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
  isAdmin = false,
  onNavigateToAdmin,
  features,
}) => {
  const contentRef = useRef<HTMLElement>(null);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const progressPercentage = useReadingProgress(contentRef);
  const chapterLabel = chapter.romanNumber || `Capítulo ${chapter.number}`;

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

  // 4. SISTEMA DE MARCADOR DE PÁGINA INTELIGENTE ("CONTINUAR LENDO")
  const [restoredToast, setRestoredToast] = useState<{
    percentage: number;
    textSnippet?: string;
  } | null>(null);
  const [manualBookmarkNotice, setManualBookmarkNotice] = useState<string | null>(null);
  const isRestoringScrollRef = useRef(false);
  const hasRestoredInitialScrollRef = useRef(false);
  const lastSavedYRef = useRef(0);

  // 4.1 Restauração automática da posição exata de leitura ao abrir o capítulo
  useEffect(() => {
    hasRestoredInitialScrollRef.current = false;
    const saved = smartBookmarkService.getBookBookmark(book.id);

    // Se houver marcador para este livro e capítulo específico com progresso significativo
    if (
      saved &&
      saved.chapterId === chapter.id &&
      saved.scrollY > 100 &&
      saved.percentage > 3 &&
      saved.percentage < 98
    ) {
      isRestoringScrollRef.current = true;
      const restoreTimer = setTimeout(() => {
        // Tenta rolar para o parágrafo exato ou para o scrollY em pixels
        if (
          saved.paragraphIndex !== undefined &&
          paragraphRefs.current[saved.paragraphIndex]
        ) {
          paragraphRefs.current[saved.paragraphIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        } else if (saved.scrollY > 0) {
          window.scrollTo({ top: saved.scrollY, behavior: 'smooth' });
        }

        setRestoredToast({
          percentage: saved.percentage,
          textSnippet: saved.textSnippet,
        });

        // Oculta aviso automaticamente após 4.5 segundos
        const hideToastTimer = setTimeout(() => {
          setRestoredToast(null);
        }, 4500);

        // Libera para novos auto-saves após a rolagem suave concluir
        const releaseTimer = setTimeout(() => {
          isRestoringScrollRef.current = false;
          hasRestoredInitialScrollRef.current = true;
        }, 1200);

        return () => {
          clearTimeout(hideToastTimer);
          clearTimeout(releaseTimer);
        };
      }, 250);

      return () => clearTimeout(restoreTimer);
    } else {
      hasRestoredInitialScrollRef.current = true;
    }
  }, [book.id, chapter.id]);

  // 4.2 Auto-save contínuo da posição da leitura com debounce
  useEffect(() => {
    const handleAutoSave = () => {
      if (isRestoringScrollRef.current) return;
      const currentY = window.scrollY;

      // Só salva se o usuário rolou além do cabeçalho e variou pelo menos 50px
      if (currentY < 120) return;
      if (Math.abs(currentY - lastSavedYRef.current) < 50) return;
      lastSavedYRef.current = currentY;

      // Identifica o parágrafo em foco na altura de leitura da tela
      let closestIdx = 0;
      let minDistance = Infinity;
      const targetScreenY = window.innerHeight * 0.35;

      paragraphRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - targetScreenY);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      const rawSnippet = chapter.content?.[closestIdx] || '';
      const cleanSnippet = rawSnippet.replace(/^[*_#\s]+/, '').slice(0, 110);

      smartBookmarkService.saveBookmark({
        bookId: book.id,
        bookTitle: book.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterNumber: chapter.number,
        chapterNumberText: chapterLabel,
        scrollY: Math.round(currentY),
        percentage: progressPercentage,
        paragraphIndex: closestIdx,
        textSnippet: cleanSnippet ? `${cleanSnippet}...` : undefined,
        updatedAt: new Date().toISOString(),
      });
    };

    let debounceTimer: any = null;
    const onScrollDebounced = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleAutoSave, 750);
    };

    window.addEventListener('scroll', onScrollDebounced, { passive: true });
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('scroll', onScrollDebounced);
    };
  }, [
    book.id,
    book.title,
    chapter.id,
    chapter.title,
    chapter.number,
    chapterLabel,
    chapter.content,
    progressPercentage,
  ]);

  // 4.3 Função para marcar página manualmente com feedback imediato
  const handleManualBookmark = () => {
    const currentY = window.scrollY;
    let closestIdx = 0;
    let minDistance = Infinity;
    const targetScreenY = window.innerHeight * 0.35;

    paragraphRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top - targetScreenY);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    const rawSnippet = chapter.content?.[closestIdx] || '';
    const cleanSnippet = rawSnippet.replace(/^[*_#\s]+/, '').slice(0, 110);

    smartBookmarkService.saveBookmark({
      bookId: book.id,
      bookTitle: book.title,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterNumber: chapter.number,
      chapterNumberText: chapterLabel,
      scrollY: Math.round(currentY),
      percentage: progressPercentage,
      paragraphIndex: closestIdx,
      textSnippet: cleanSnippet ? `${cleanSnippet}...` : undefined,
      updatedAt: new Date().toISOString(),
    });

    setManualBookmarkNotice(`Marcador salvo com sucesso (${progressPercentage}% lido)`);
    setTimeout(() => setManualBookmarkNotice(null), 3000);
  };

  // 5. DESTAQUES DE TEXTO (REFERÊNCIAS BÍBLICAS + PESQUISA)
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

  const hasNarrative = chapter.content && chapter.content.length > 0;
  const hasBiblicalTexts = chapter.biblicalTexts && chapter.biblicalTexts.length > 0;
  const hasReflectionQuestions = chapter.reflectionQuestions && chapter.reflectionQuestions.length > 0;

  // 6. GESTÃO E INSERÇÃO DE IMAGEM / ILUSTRAÇÃO DO CAPÍTULO (CARREGAMENTO E SUBSTITUIÇÃO DINÂMICA)
  const imageStorageKey = `bib_custom_image_${book.id}_${chapter.id}`;
  const [customImage, setCustomImage] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(imageStorageKey);
    } catch {
      return null;
    }
  });

  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza ao trocar de capítulo ou livro
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bib_custom_image_${book.id}_${chapter.id}`);
      setCustomImage(saved);
    } catch {
      setCustomImage(null);
    }
  }, [book.id, chapter.id]);

  const defaultIllustration = chapter.chapterImage || chapter.headerImage;
  const currentIllustration = customImage || defaultIllustration;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const processedDataUrl = await processImageFile(file);
      setCustomImage(processedDataUrl);
      try {
        localStorage.setItem(imageStorageKey, processedDataUrl);
      } catch (err) {
        console.warn('Storage quota exceeded, custom image kept in active session memory', err);
      }
      setImageNotice('Imagem do capítulo atualizada com sucesso!');
      setTimeout(() => setImageNotice(null), 3500);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setImageNotice('Não foi possível carregar a imagem. Tente outro arquivo.');
      setTimeout(() => setImageNotice(null), 3500);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setCustomImage(trimmed);
    try {
      localStorage.setItem(imageStorageKey, trimmed);
    } catch (err) {
      console.warn('Could not save custom image URL to storage', err);
    }
    setUrlInput('');
    setIsUrlModalOpen(false);
    setImageNotice('Imagem do capítulo atualizada com sucesso!');
    setTimeout(() => setImageNotice(null), 3500);
  };

  const handleResetToDefault = () => {
    setCustomImage(null);
    try {
      localStorage.removeItem(imageStorageKey);
    } catch {
      // ignore
    }
    setImageNotice(defaultIllustration ? 'Imagem original restaurada.' : 'Ilustração removida.');
    setTimeout(() => setImageNotice(null), 3500);
  };

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
        isAdmin={isAdmin}
        onNavigateToAdmin={onNavigateToAdmin}
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
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-8 md:px-12 py-8 sm:py-16 md:py-20">
        <article ref={contentRef} className="w-full">
          {/* TÍTULO E HIERARQUIA EDITORIAL LIMPA */}
          <header className="text-center mb-10 sm:mb-20 pt-1 sm:pt-4">
            {/* Banner superior da Obra (quando não há imagem exclusiva do capítulo após o título) */}
            {!currentIllustration && (book.headerImage || book.coverImage) && (
              <div className="mb-6 sm:mb-10 max-w-2xl mx-auto rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/80 dark:border-zinc-800 shadow-md sm:shadow-lg bg-stone-100 dark:bg-zinc-850">
                <img
                  src={book.headerImage || book.coverImage}
                  alt={`Capa de ${book.title}`}
                  className="w-full h-auto max-h-60 sm:max-h-80 md:max-h-96 object-cover object-center"
                  loading="eager"
                />
              </div>
            )}

            {/* Nome da Obra / Categoria */}
            <div className="font-sans text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-stone-400 dark:text-zinc-400 mb-3 select-none">
              {book.title}
            </div>

            {/* Identificação do Capítulo */}
            <div className="font-serif italic text-sm sm:text-base text-stone-600 dark:text-zinc-300 mb-2">
              {chapterLabel}
            </div>

            {/* Título Principal em Destaque */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance leading-tight text-stone-900 dark:text-zinc-50 max-w-2xl mx-auto">
              {chapter.title}
            </h1>

            {chapter.subtitle && (
              <p className="font-serif italic text-base sm:text-lg text-stone-600 dark:text-zinc-300 mt-4 max-w-xl mx-auto text-balance">
                {chapter.subtitle}
              </p>
            )}

            {/* CAIXA DE INSERÇÃO / EXIBIÇÃO DA ILUSTRAÇÃO DO CAPÍTULO (SEMPRE ABAIXO DO TÍTULO) */}
            {(currentIllustration || isAdmin) && (
              <div className="mt-8 sm:mt-10 mb-8 sm:mb-10 max-w-2xl mx-auto text-center relative">
                {/* Input de arquivo oculto para upload de imagem (exclusivo para o administrador) */}
                {isAdmin && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jfif,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Selecionar imagem do capítulo"
                  />
                )}

                {/* Feedback toast de imagem (somente para administrador) */}
                {isAdmin && imageNotice && (
                  <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-md animate-in fade-in duration-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>{imageNotice}</span>
                  </div>
                )}

                {currentIllustration ? (
                  /* CASO 1: ILUSTRAÇÃO EXISTENTE (Visível a todos; Controles de substituição exclusivos do Admin) */
                  <figure className="relative group">
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/90 dark:border-zinc-800 shadow-md sm:shadow-xl bg-stone-100 dark:bg-zinc-850">
                      <img
                        src={currentIllustration}
                        alt={chapter.imageAlt || `Ilustração do ${chapterLabel}: ${chapter.title}`}
                        className="w-full h-auto max-h-[360px] sm:max-h-[460px] md:max-h-[520px] object-cover object-center transition-transform duration-500 group-hover:scale-[1.01]"
                        loading="eager"
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/5 pointer-events-none rounded-2xl sm:rounded-3xl" />

                      {/* Overlay durante processamento da imagem (somente para admin) */}
                      {isAdmin && isProcessingImage && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center rounded-2xl sm:rounded-3xl z-20">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                          <span className="text-xs text-white ml-2 font-sans font-semibold">
                            Otimizando imagem...
                          </span>
                        </div>
                      )}

                      {/* Barra Flutuante de Ação: Substituir / Alterar Imagem (EXCLUSIVA PARA O ADMINISTRADOR) */}
                      {isAdmin && (
                        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 flex items-center gap-1.5 bg-stone-900/80 hover:bg-stone-900/95 dark:bg-zinc-900/85 dark:hover:bg-zinc-900/95 backdrop-blur-md text-white p-1.5 rounded-xl shadow-lg border border-white/10 opacity-90 hover:opacity-100 transition-all font-sans text-xs">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/35 font-medium transition-colors cursor-pointer"
                            title="Substituir por arquivo de imagem do seu dispositivo"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-300" />
                            <span>Substituir Imagem</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsUrlModalOpen(true)}
                            className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                            title="Substituir via Link / URL externa"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                          </button>

                          {customImage && (
                            <button
                              type="button"
                              onClick={handleResetToDefault}
                              className="p-1 rounded-lg hover:bg-white/15 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
                              title={defaultIllustration ? 'Restaurar imagem original da obra' : 'Remover imagem'}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {chapter.imageCaption && (
                      <figcaption className="mt-3 text-center text-xs text-stone-500 dark:text-zinc-400 font-serif italic">
                        {chapter.imageCaption}
                      </figcaption>
                    )}
                  </figure>
                ) : isAdmin ? (
                  /* CASO 2: CAIXA DE INSERÇÃO VAZIA (EXCLUSIVA PARA O ADMINISTRADOR; NÃO VISÍVEL AOS LEITORES) */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl sm:rounded-3xl border-2 border-dashed border-stone-300 hover:border-amber-500 dark:border-zinc-700 dark:hover:border-amber-400 bg-stone-50/70 hover:bg-amber-50/40 dark:bg-zinc-850/40 dark:hover:bg-zinc-800/60 p-8 sm:p-10 text-center transition-all cursor-pointer group shadow-2xs hover:shadow-md"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif font-bold text-sm sm:text-base text-stone-800 dark:text-zinc-100">
                      Inserir Imagem do Capítulo (Admin)
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans mt-1 max-w-md mx-auto">
                      Área administrativa: carregue uma ilustração para este capítulo ou insira uma URL.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 font-sans">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Carregar Imagem
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUrlModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Inserir Link / URL
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
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

            {/* Divisor editorial leve com amplo respiro */}
            <div className="flex items-center justify-center gap-3 mt-10 sm:mt-12 select-none text-stone-300 dark:text-zinc-700 opacity-80" aria-hidden="true">
              <span className="w-10 sm:w-16 h-px bg-current" />
              <span className="text-[10px] font-serif tracking-widest">✦</span>
              <span className="w-10 sm:w-16 h-px bg-current" />
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

                    {item.text && (
                      <div className="font-serif italic text-base sm:text-lg leading-relaxed text-pretty border-l-2 border-amber-600/70 dark:border-amber-400/60 pl-4 my-1 text-stone-850 dark:text-zinc-100">
                        {item.text}
                      </div>
                    )}
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

          {/* BARRA DO MARCADOR INTELIGENTE */}
          <div className="max-w-[65ch] mx-auto my-8 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
            <div className="flex items-center gap-2 text-stone-500 dark:text-zinc-400">
              <BookmarkCheck className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {manualBookmarkNotice || 'Ponto exato e progresso salvos automaticamente neste leitor.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleManualBookmark}
              className="py-1.5 px-3.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-200 font-medium transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Salvar ou atualizar o marcador de página desta leitura"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Marcar Esta Página</span>
            </button>
          </div>

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

      {/* Toast flutuante de restauração do Marcador Inteligente */}
      {restoredToast && (
        <aside
          aria-label="Aviso de marcador inteligente"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[92%] bg-stone-900/95 dark:bg-zinc-800/95 text-stone-100 p-3 rounded-2xl shadow-xl border border-amber-500/40 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 font-sans"
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-xs">
                <BookmarkCheck className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>Leitura Retomada</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-200 font-mono">
                    {restoredToast.percentage}%
                  </span>
                </div>
                <div className="text-[11px] text-stone-300 dark:text-zinc-400 truncate">
                  Rolamos para onde você parou.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setRestoredToast(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-[11px] font-semibold text-stone-100 transition-colors cursor-pointer"
                title="Voltar ao início do capítulo"
              >
                Início
              </button>
              <button
                type="button"
                onClick={() => setRestoredToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Fechar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* MODAL DE INSERÇÃO DE IMAGEM VIA LINK / URL (ADMINISTRADOR) */}
      {isAdmin && isUrlModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-6 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-zinc-100">
                  Inserir Imagem por Link (URL)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUrlModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1.5">
                Endereço da Imagem (URL ou caminho local)
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg ou /assets/..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUrlModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyUrl}
                disabled={!urlInput.trim()}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                Aplicar Imagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
