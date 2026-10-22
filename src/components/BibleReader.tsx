import React, { useEffect, useState, useRef } from 'react';
import {
  BibleBookMeta,
  BibleBookData,
  BibleVerse,
  BibleReferenceTarget,
  BibleLicenseInfo,
} from '../types/bible';
import {
  getBooksSummary,
  getBookData,
  getBibleLicenseInfo,
} from '../services/bibleService';
import { ReadingTheme, FontSizeScale } from '../types/book';
import { PWAInstallButton } from './PWAInstallButton';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  SlidersHorizontal,
  Sun,
  Moon,
  Type,
  Info,
  X,
  Search,
  Check,
  Lock,
  Shield,
} from 'lucide-react';

interface BibleReaderProps {
  initialTarget?: BibleReferenceTarget | null;
  returnToBookTitle?: string;
  returnToChapterTitle?: string;
  theme: ReadingTheme;
  fontSize: FontSizeScale;
  onThemeChange: (theme: ReadingTheme) => void;
  onFontSizeChange: (size: FontSizeScale) => void;
  onReturnToBook?: () => void;
  onReturnToLibrary: () => void;
  onLogout?: () => void;
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
}

export const BibleReader: React.FC<BibleReaderProps> = ({
  initialTarget,
  returnToBookTitle,
  returnToChapterTitle,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onReturnToBook,
  onReturnToLibrary,
  onLogout,
  isAdmin = false,
  onNavigateToAdmin,
}) => {
  const [booksList, setBooksList] = useState<BibleBookMeta[]>([]);
  const [currentBookAbbrev, setCurrentBookAbbrev] = useState<string>(
    initialTarget?.bookAbbrev || 'PSA'
  );
  const [currentChapter, setCurrentChapter] = useState<number>(
    initialTarget?.chapter || 1
  );
  const [highlightVerses, setHighlightVerses] = useState<{ start?: number; end?: number }>({
    start: initialTarget?.verseStart,
    end: initialTarget?.verseEnd,
  });

  const [currentBookData, setCurrentBookData] = useState<BibleBookData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showBookPicker, setShowBookPicker] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showLicenseModal, setShowLicenseModal] = useState<boolean>(false);
  const [licenseInfo, setLicenseInfo] = useState<BibleLicenseInfo | null>(null);
  const [pickerTab, setPickerTab] = useState<'AT' | 'NT'>('AT');
  const [bookSearch, setBookSearch] = useState<string>('');

  const targetVerseRef = useRef<HTMLDivElement>(null);

  // Carrega lista de livros e licença
  useEffect(() => {
    getBooksSummary().then(setBooksList);
    getBibleLicenseInfo().then(setLicenseInfo);
  }, []);

  // Atualiza se initialTarget mudar externamente
  useEffect(() => {
    if (initialTarget) {
      setCurrentBookAbbrev(initialTarget.bookAbbrev);
      setCurrentChapter(initialTarget.chapter);
      setHighlightVerses({
        start: initialTarget.verseStart,
        end: initialTarget.verseEnd,
      });
    }
  }, [initialTarget]);

  // Carrega os dados do livro e capítulo selecionados
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getBookData(currentBookAbbrev)
      .then((data) => {
        if (!isMounted) return;
        setCurrentBookData(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentBookAbbrev]);

  // Se houver versículo de destaque, rola até ele após carregar
  useEffect(() => {
    if (!loading && highlightVerses.start && targetVerseRef.current) {
      setTimeout(() => {
        targetVerseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [loading, highlightVerses.start]);

  // Navegação para capítulo anterior ou seguinte
  const currentBookMeta = booksList.find((b) => b.abbrev === currentBookAbbrev);
  const maxChapters = currentBookMeta ? currentBookMeta.totalChapters : 1;

  const handlePreviousChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter((prev) => prev - 1);
      setHighlightVerses({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Vai para o último capítulo do livro anterior, se houver
      const currentIndex = booksList.findIndex((b) => b.abbrev === currentBookAbbrev);
      if (currentIndex > 0) {
        const prevBook = booksList[currentIndex - 1];
        setCurrentBookAbbrev(prevBook.abbrev);
        setCurrentChapter(prevBook.totalChapters);
        setHighlightVerses({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < maxChapters) {
      setCurrentChapter((prev) => prev + 1);
      setHighlightVerses({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Vai para o primeiro capítulo do próximo livro, se houver
      const currentIndex = booksList.findIndex((b) => b.abbrev === currentBookAbbrev);
      if (currentIndex >= 0 && currentIndex < booksList.length - 1) {
        const nextBook = booksList[currentIndex + 1];
        setCurrentBookAbbrev(nextBook.abbrev);
        setCurrentChapter(1);
        setHighlightVerses({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const hasPrevious =
    currentChapter > 1 ||
    booksList.findIndex((b) => b.abbrev === currentBookAbbrev) > 0;

  const hasNext =
    currentChapter < maxChapters ||
    booksList.findIndex((b) => b.abbrev === currentBookAbbrev) < booksList.length - 1;

  // Temas visuais consistentes com a Biblioteca Digital
  const themeContainerStyles = {
    paper: 'bg-[#FBFBF9] text-stone-850 selection:bg-stone-200 selection:text-stone-900',
    cream: 'bg-[#F7F2E7] text-[#292524] selection:bg-[#E7DEC8] selection:text-[#1F1C1A]',
    sepia: 'bg-[#F3EAD8] text-[#3D3025] selection:bg-[#DECDB1] selection:text-[#281F17]',
    dark: 'dark bg-[#18181B] text-zinc-100 selection:bg-zinc-700 selection:text-zinc-50',
  }[theme];

  const headerStyles = {
    paper: 'bg-[#FBFBF9]/90 border-stone-200/80 text-stone-800',
    cream: 'bg-[#F7F2E7]/90 border-[#E5DECD] text-[#292524]',
    sepia: 'bg-[#F3EAD8]/90 border-[#DFCDB3] text-[#3D3025]',
    dark: 'dark bg-[#18181B]/95 border-zinc-800 text-zinc-100',
  }[theme];

  const popoverStyles = {
    paper: 'bg-[#FFFFFF] border-stone-200 shadow-stone-200/50 text-stone-800',
    cream: 'bg-[#FAF6EC] border-[#E5DECD] shadow-stone-400/20 text-[#292524]',
    sepia: 'bg-[#EFE5D1] border-[#DFCDB3] shadow-stone-500/20 text-[#3D3025]',
    dark: 'bg-[#202024] border-zinc-700 shadow-black/50 text-zinc-100',
  }[theme];

  const highlightVerseStyle = {
    paper: 'bg-amber-100/70 border-l-4 border-amber-600 pl-3 -ml-3 rounded-r-lg',
    cream: 'bg-amber-200/40 border-l-4 border-amber-700 pl-3 -ml-3 rounded-r-lg',
    sepia: 'bg-[#E3D1B5]/70 border-l-4 border-amber-800 pl-3 -ml-3 rounded-r-lg',
    dark: 'bg-amber-500/20 border-l-4 border-amber-400 text-zinc-50 pl-3 -ml-3 rounded-r-lg',
  }[theme];

  const fontSizeClasses = {
    sm: 'text-[16px] sm:text-[17px] leading-[1.7]',
    md: 'text-[17.5px] sm:text-[19px] leading-[1.7]',
    lg: 'text-[19.5px] sm:text-[21px] leading-[1.7]',
    xl: 'text-[22px] sm:text-[24px] leading-[1.7]',
  }[fontSize];

  const versesList: BibleVerse[] =
    currentBookData?.chapters[String(currentChapter)] || [];

  const filteredBooks = booksList.filter(
    (b) =>
      b.testament === pickerTab &&
      (bookSearch.trim() === '' ||
        b.name.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.aliases.some((a) => a.toLowerCase().includes(bookSearch.toLowerCase())))
  );

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col ${themeContainerStyles}`}>
      {/* Barra de cabeçalho da Bíblia */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors duration-200 ${headerStyles}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Ação de retorno: ao livro de origem ou à biblioteca */}
          <div className="flex items-center gap-2">
            {onReturnToBook && returnToBookTitle ? (
              <button
                onClick={onReturnToBook}
                className="group flex items-center gap-2 py-1.5 px-2.5 -ml-2 rounded-lg text-xs sm:text-sm font-sans tracking-wide transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 dark:text-zinc-200 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer"
                title={`Voltar à leitura de ${returnToBookTitle}`}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
                  Voltar ao livro
                </span>
              </button>
            ) : (
              <button
                onClick={onReturnToLibrary}
                className="group flex items-center gap-2 py-1.5 px-2.5 -ml-2 rounded-lg text-xs sm:text-sm font-sans tracking-wide transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 dark:text-zinc-200 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer"
                title="Retornar à Biblioteca"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="font-medium">Biblioteca</span>
              </button>
            )}

            <span className="hidden sm:inline-block text-stone-400 dark:text-zinc-500 select-none text-xs">/</span>

            {/* Identificador da Bíblia */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-300 font-sans">
              <BookOpen className="w-3.5 h-3.5 opacity-70 text-stone-500 dark:text-amber-400" />
              <span>Bíblia Livre</span>
            </div>
          </div>

          {/* Seletor central de livro e capítulo */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowBookPicker(true)}
              className="py-1.5 px-3 rounded-lg border border-black/10 hover:border-black/20 hover:bg-black/5 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 text-xs sm:text-sm font-sans font-medium text-stone-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
              title="Escolher livro ou capítulo bíblico"
            >
              <span>{currentBookData?.name || 'Salmos'} {currentChapter}</span>
              <span className="text-[10px] opacity-60">▾</span>
            </button>
          </div>

          {/* Controles de leitura e créditos */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Botão de retorno ao Painel do Administrador (exibido exclusivamente quando sessão admin ativa) */}
            {isAdmin && onNavigateToAdmin && (
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="inline-flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-500/25 font-sans text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
                title="Retornar ao Painel do Administrador (acesso exclusivo)"
              >
                <Shield className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span className="hidden sm:inline">Painel Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            <PWAInstallButton theme={theme} variant="header" />

            <button
              onClick={() => setShowLicenseModal(true)}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
              title="Sobre a tradução (Bíblia Livre & Licença)"
              aria-label="Sobre a tradução da Bíblia"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Ajustes de fonte e tom */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 dark:hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${showSettings ? 'bg-black/10 dark:bg-zinc-800' : ''}`}
                title="Ajustes de leitura"
                aria-label="Ajustes de leitura"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className={`absolute right-0 mt-2 w-64 p-4 rounded-xl border shadow-lg z-50 font-sans ${popoverStyles}`}>
                    <div className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-zinc-300 mb-3">
                      Preferências de Leitura
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-2 text-stone-700 dark:text-zinc-200">
                        <span className="flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5" />
                          Tamanho do Texto
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/5 dark:bg-zinc-800/80 rounded-lg">
                        {(['sm', 'md', 'lg', 'xl'] as FontSizeScale[]).map((size, index) => {
                          const labels = ['P', 'M', 'G', 'GG'];
                          return (
                            <button
                              key={size}
                              onClick={() => onFontSizeChange(size)}
                              className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                                fontSize === size
                                  ? 'bg-stone-800 text-stone-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                                  : 'hover:bg-black/5 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-300'
                              }`}
                            >
                              {labels[index]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-2 text-stone-700 dark:text-zinc-200">
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5" />
                          Tom da Página
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'paper' as ReadingTheme, label: 'Alvo', bg: 'bg-[#FBFBF9]', text: 'text-stone-800' },
                          { id: 'cream' as ReadingTheme, label: 'Creme', bg: 'bg-[#F7F2E7]', text: 'text-[#292524]' },
                          { id: 'sepia' as ReadingTheme, label: 'Sépia', bg: 'bg-[#F3EAD8]', text: 'text-[#3D3025]' },
                          { id: 'dark' as ReadingTheme, label: 'Noite', bg: 'bg-[#18181B]', text: 'text-zinc-100' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => onThemeChange(t.id)}
                            className={`p-2 rounded-lg border text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${t.bg} ${t.text} ${
                              theme === t.id ? 'ring-2 ring-stone-600 dark:ring-amber-400 font-semibold border-transparent' : 'border-black/10 dark:border-zinc-700'
                            }`}
                          >
                            {t.id === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-black/20" />}
                            <span className="text-[10px]">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botão de Bloqueio Rápido (exigir PIN) */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
                title="Bloquear aplicativo (exigir PIN)"
                aria-label="Bloquear aplicativo"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Capítulo Bíblico */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 md:px-12 py-10 sm:py-16 md:py-20">
        <article className="w-full">
          {/* Cabeçalho do Livro Bíblico */}
          <header className="text-center mb-12 sm:mb-16">
            <p className="text-xs sm:text-sm font-sans uppercase tracking-[0.22em] text-stone-500 dark:text-zinc-400 mb-3 select-none font-medium">
              Bíblia Sagrada · {currentBookMeta?.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}
            </p>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance leading-tight text-stone-900 dark:text-zinc-50">
              {currentBookData?.name} {currentChapter}
            </h1>

            {/* Divisor ornamental sutil */}
            <div className="flex items-center justify-center gap-3 mt-8 select-none text-stone-400 dark:text-zinc-500 opacity-60">
              <span className="w-8 h-px bg-current" />
              <span className="text-xs font-serif">✦</span>
              <span className="w-8 h-px bg-current" />
            </div>
          </header>

          {/* Versículos */}
          {loading ? (
            <div className="py-20 text-center font-sans text-stone-500 dark:text-zinc-400">
              Carregando texto do capítulo...
            </div>
          ) : versesList.length === 0 ? (
            <div className="py-12 text-center font-sans text-stone-500 dark:text-zinc-400">
              Capítulo não encontrado.
            </div>
          ) : (
            <div className={`font-serif max-w-[65ch] mx-auto text-pretty space-y-3 sm:space-y-4 text-stone-850 dark:text-zinc-100 ${fontSizeClasses}`}>
              {versesList.map((v) => {
                const isTarget =
                  highlightVerses.start !== undefined &&
                  v.verse >= highlightVerses.start &&
                  (highlightVerses.end === undefined || v.verse <= highlightVerses.end);

                return (
                  <div
                    key={v.verse}
                    ref={v.verse === highlightVerses.start ? targetVerseRef : undefined}
                    className={`transition-colors duration-300 py-1 ${isTarget ? highlightVerseStyle : ''}`}
                  >
                    <sup className="font-sans font-bold text-xs sm:text-sm text-stone-500 dark:text-zinc-400 mr-2 select-none align-baseline">
                      {v.verse}
                    </sup>
                    <span>{v.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Navegação entre capítulos no rodapé */}
          <footer className="mt-20 pt-10 border-t border-black/10 dark:border-zinc-800 max-w-[65ch] mx-auto font-sans">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
              <button
                onClick={handlePreviousChapter}
                disabled={!hasPrevious}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
                  hasPrevious
                    ? 'hover:bg-black/5 active:bg-black/10 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 cursor-pointer text-stone-800 dark:text-zinc-200'
                    : 'opacity-30 cursor-not-allowed text-stone-400 dark:text-zinc-600'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Capítulo Anterior</span>
              </button>

              <button
                onClick={() => setShowBookPicker(true)}
                className="py-2 px-3.5 rounded-lg border border-black/10 hover:border-black/20 hover:bg-black/5 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
              >
                Índice de Livros (66)
              </button>

              <button
                onClick={handleNextChapter}
                disabled={!hasNext}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
                  hasNext
                    ? 'hover:bg-black/5 active:bg-black/10 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 cursor-pointer text-stone-800 dark:text-zinc-200'
                    : 'opacity-30 cursor-not-allowed text-stone-400 dark:text-zinc-600'
                }`}
              >
                <span>Próximo Capítulo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Créditos da tradução no rodapé da página */}
            <div className="mt-12 text-center text-xs text-stone-500 dark:text-zinc-400 select-none">
              <p>Texto extraído da Bíblia Livre (BLIVRE) · Versão 2018.2.0 (TR)</p>
              <button
                onClick={() => setShowLicenseModal(true)}
                className="mt-1 text-[11px] underline text-stone-600 hover:text-stone-900 dark:text-amber-300 dark:hover:text-amber-200 cursor-pointer"
              >
                Ver termos de licença aberta (CC BY 3.0 BR)
              </button>
            </div>
          </footer>
        </article>
      </main>

      {/* Modal Seletor de Livros e Capítulos */}
      {showBookPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="fixed inset-0 -z-10" onClick={() => setShowBookPicker(false)} />
          <div className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${popoverStyles}`}>
            <header className="px-5 py-4 border-b border-black/10 dark:border-zinc-700/80 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-zinc-50">Livros da Bíblia Sagrada</h2>
              <button onClick={() => setShowBookPicker(false)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-zinc-800 dark:text-zinc-300 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Filtros e Busca */}
            <div className="p-4 border-b border-black/5 dark:border-zinc-700/80 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex rounded-lg bg-black/5 dark:bg-zinc-800/80 p-1 w-full sm:w-auto">
                <button
                  onClick={() => setPickerTab('AT')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    pickerTab === 'AT' ? 'bg-white text-stone-900 dark:bg-zinc-700 dark:text-zinc-100 shadow-xs font-semibold' : 'text-stone-600 dark:text-zinc-300 hover:dark:text-white'
                  }`}
                >
                  Antigo Testamento (39)
                </button>
                <button
                  onClick={() => setPickerTab('NT')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    pickerTab === 'NT' ? 'bg-white text-stone-900 dark:bg-zinc-700 dark:text-zinc-100 shadow-xs font-semibold' : 'text-stone-600 dark:text-zinc-300 hover:dark:text-white'
                  }`}
                >
                  Novo Testamento (27)
                </button>
              </div>

              <div className="relative w-full sm:flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 dark:opacity-80 dark:text-zinc-300" />
                <input
                  type="text"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/5 dark:bg-zinc-800/90 dark:text-zinc-100 dark:border-zinc-700 border border-transparent focus:border-stone-400 dark:focus:border-amber-400 text-xs focus:outline-hidden"
                />
              </div>
            </div>

            {/* Grade de Livros */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
                {filteredBooks.map((b) => {
                  const isSelected = b.abbrev === currentBookAbbrev;
                  return (
                    <button
                      key={b.abbrev}
                      onClick={() => {
                        setCurrentBookAbbrev(b.abbrev);
                        setCurrentChapter(1);
                        setHighlightVerses({});
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-colors text-xs flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-stone-800 bg-stone-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                          : 'border-black/10 hover:border-black/20 hover:bg-black/5 dark:border-zinc-700/80 dark:text-zinc-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="text-[10px] opacity-60 dark:opacity-80 dark:text-zinc-400">{b.totalChapters} caps</span>
                    </button>
                  );
                })}
              </div>

              {/* Seletor de Capítulos do Livro Ativo */}
              {currentBookMeta && (
                <div className="border-t border-black/10 dark:border-zinc-700/80 pt-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 mb-3">
                    Capítulos de {currentBookMeta.name} ({currentBookMeta.totalChapters})
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                    {Array.from({ length: currentBookMeta.totalChapters }, (_, i) => i + 1).map((ch) => {
                      const isCurrent = ch === currentChapter;
                      return (
                        <button
                          key={ch}
                          onClick={() => {
                            setCurrentChapter(ch);
                            setHighlightVerses({});
                            setShowBookPicker(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-stone-800 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-bold'
                              : 'border-black/10 hover:bg-black/5 dark:border-zinc-700/80 dark:text-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal com Créditos e Licença Oficial da Bíblia Livre */}
      {showLicenseModal && licenseInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="fixed inset-0 -z-10" onClick={() => setShowLicenseModal(false)} />
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 font-sans overflow-y-auto max-h-[85vh] ${popoverStyles}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-serif font-bold text-stone-900 dark:text-zinc-50">Sobre a Bíblia Livre</h2>
              <button onClick={() => setShowLicenseModal(false)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-zinc-800 dark:text-zinc-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-700 dark:text-zinc-200 leading-relaxed font-sans">
              <div className="p-3 bg-black/5 dark:bg-zinc-800/80 rounded-xl space-y-1">
                <p><strong>Tradução:</strong> {licenseInfo.name} ({licenseInfo.shortName})</p>
                <p><strong>Versão:</strong> {licenseInfo.version}</p>
                <p><strong>Variante Textual:</strong> {licenseInfo.textualVariant}</p>
                <p><strong>Autores / Tradutores:</strong> {licenseInfo.authors}</p>
                <p><strong>Canone:</strong> 66 livros bíblicos completos ({licenseInfo.totalVerses} versículos)</p>
              </div>

              <div>
                <p className="font-semibold mb-1 text-stone-800 dark:text-zinc-100">Termos de Uso e Licença:</p>
                <p className="p-3 bg-black/5 dark:bg-zinc-800/80 rounded-xl italic font-serif text-[11px] leading-relaxed text-stone-800 dark:text-zinc-200">
                  "{licenseInfo.license.notice}"
                </p>
              </div>

              <div>
                <p className="font-semibold mb-1 text-stone-800 dark:text-zinc-100">Fontes Oficiais:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-700 dark:text-zinc-300">
                  <li>
                    Repositório: <a href={licenseInfo.sourceUrl} target="_blank" rel="noreferrer" className="underline text-stone-900 dark:text-amber-300 dark:hover:text-amber-200">{licenseInfo.sourceUrl}</a>
                  </li>
                  <li>
                    Site oficial: <a href={licenseInfo.websiteUrl} target="_blank" rel="noreferrer" className="underline text-stone-900 dark:text-amber-300 dark:hover:text-amber-200">{licenseInfo.websiteUrl}</a>
                  </li>
                  <li>
                    Licença: <a href={licenseInfo.license.url} target="_blank" rel="noreferrer" className="underline text-stone-900 dark:text-amber-300 dark:hover:text-amber-200">{licenseInfo.license.name}</a>
                  </li>
                </ul>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowLicenseModal(false)}
                  className="px-4 py-2 rounded-lg bg-stone-800 text-stone-50 dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
