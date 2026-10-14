import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  SlidersHorizontal,
  Sun,
  Moon,
  Type,
  Lock,
  Search,
  Bookmark,
  Volume2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ReadingTheme, FontSizeScale, LibraryFeaturesConfig } from '../types/book';
import { PWAInstallButton } from './PWAInstallButton';

interface ReadingHeaderProps {
  bookTitle?: string;
  chapterTitle: string;
  chapterNumberText: string;
  progressPercentage: number;
  theme: ReadingTheme;
  fontSize: FontSizeScale;
  onThemeChange: (theme: ReadingTheme) => void;
  onFontSizeChange: (size: FontSizeScale) => void;
  onReturnToLibrary: () => void;
  onOpenBible?: () => void;
  onLogout?: () => void;
  features?: LibraryFeaturesConfig;
  // Pesquisa
  isSearchOpen?: boolean;
  searchQuery?: string;
  onToggleSearch?: () => void;
  onSearchChange?: (query: string) => void;
  searchResultsCount?: number;
  currentSearchResultIndex?: number;
  onNextSearchResult?: () => void;
  onPrevSearchResult?: () => void;
  // Marcadores
  isBookmarksOpen?: boolean;
  onToggleBookmarks?: () => void;
  bookmarksCount?: number;
  // Áudio
  isAudioOpen?: boolean;
  onToggleAudio?: () => void;
  isPlayingAudio?: boolean;
}

export const ReadingHeader: React.FC<ReadingHeaderProps> = ({
  bookTitle,
  chapterNumberText,
  progressPercentage,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onReturnToLibrary,
  onOpenBible,
  onLogout,
  features,
  // Pesquisa
  isSearchOpen = false,
  searchQuery = '',
  onToggleSearch,
  onSearchChange,
  searchResultsCount = 0,
  currentSearchResultIndex = 0,
  onNextSearchResult,
  onPrevSearchResult,
  // Marcadores
  isBookmarksOpen = false,
  onToggleBookmarks,
  bookmarksCount = 0,
  // Áudio
  isAudioOpen = false,
  onToggleAudio,
  isPlayingAudio = false,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  // Verificações com fallbacks seguros (padrão true se features não informado)
  const showReadingProgress = features ? features.readingProgress : true;
  const showThemeToggle = features ? features.themeToggle : true;
  const showBible = features ? features.integratedBible : true;
  const showSearch = features ? features.search : true;
  const showBookmarks = features ? features.bookmarks : true;
  const showAudio = features ? Boolean(features.audioReading) : false;

  // Cores dinâmicas para o cabeçalho baseadas no tema
  const themeStyles = {
    paper: 'bg-[#FBFBF9]/95 border-stone-200/80 text-stone-800',
    cream: 'bg-[#F7F2E7]/95 border-[#E5DECD] text-[#292524]',
    sepia: 'bg-[#F3EAD8]/95 border-[#DFCDB3] text-[#3D3025]',
    dark: 'dark bg-[#18181B]/95 border-zinc-800 text-zinc-100',
  }[theme];

  const popoverStyles = {
    paper: 'bg-[#FFFFFF] border-stone-200 shadow-stone-200/50 text-stone-800',
    cream: 'bg-[#FAF6EC] border-[#E5DECD] shadow-stone-400/20 text-[#292524]',
    sepia: 'bg-[#EFE5D1] border-[#DFCDB3] shadow-stone-500/20 text-[#3D3025]',
    dark: 'bg-[#202024] border-zinc-700 shadow-black/50 text-zinc-100',
  }[theme];

  const progressBg = theme === 'dark' ? 'bg-amber-400' : 'bg-stone-800';

  return (
    <header className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors duration-200 ${themeStyles}`}>
      {/* 1. Barra de progresso discreta no topo (se habilitada) */}
      {showReadingProgress && (
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-black/5 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ease-out ${progressBg}`}
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso de leitura do capítulo"
          />
        </div>
      )}

      {/* 2. Barra de Ferramentas Principal */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
        {/* Lado Esquerdo: Biblioteca e Livro */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onReturnToLibrary}
            className="group flex items-center gap-1.5 sm:gap-2 py-1.5 px-2 sm:px-2.5 -ml-1 sm:-ml-2 rounded-lg text-xs sm:text-sm font-sans tracking-wide transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 dark:text-zinc-200 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer"
            title="Retornar à Biblioteca"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="font-medium">Biblioteca</span>
          </button>

          {bookTitle && (
            <>
              <span className="hidden sm:inline-block text-stone-400 dark:text-zinc-500 select-none text-xs">/</span>
              <div className="hidden md:flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-300 font-sans truncate max-w-[200px] lg:max-w-xs">
                <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-70 text-stone-500 dark:text-amber-400" />
                <span className="truncate">{bookTitle}</span>
              </div>
            </>
          )}
        </div>

        {/* Centro: Título do Capítulo (quando pesquisa não estiver aberta) */}
        {!isSearchOpen && (
          <div className="hidden lg:block text-xs font-serif italic text-stone-500 dark:text-zinc-300 truncate max-w-[200px]">
            {chapterNumberText}
          </div>
        )}

        {/* Modo de Pesquisa Aberto na Barra */}
        {isSearchOpen && showSearch && (
          <div className="flex-1 max-w-md mx-2 animate-in fade-in duration-150">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-stone-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className={`w-full pl-8 pr-20 py-1.5 rounded-lg text-xs border outline-hidden transition-colors ${
                  theme === 'dark'
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                    : 'bg-white border-stone-300 text-stone-900 focus:border-stone-500'
                }`}
              />

              {searchQuery && (
                <div className="absolute right-2 flex items-center gap-1 text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                  {searchResultsCount > 0 ? (
                    <>
                      <span>{currentSearchResultIndex + 1}/{searchResultsCount}</span>
                      <button
                        type="button"
                        onClick={onPrevSearchResult}
                        className="p-0.5 hover:bg-black/10 dark:hover:bg-zinc-700 rounded-xs cursor-pointer"
                        title="Anterior"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={onNextSearchResult}
                        className="p-0.5 hover:bg-black/10 dark:hover:bg-zinc-700 rounded-xs cursor-pointer"
                        title="Próximo"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <span>0</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onSearchChange?.('')}
                    className="p-0.5 hover:bg-black/10 dark:hover:bg-zinc-700 rounded-xs cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lado Direito: Ações & Funcionalidades da Biblioteca */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão de Pesquisa (se ativado) */}
          {showSearch && onToggleSearch && (
            <button
              onClick={onToggleSearch}
              className={`p-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                isSearchOpen
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'hover:bg-black/5 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300'
              }`}
              title={isSearchOpen ? 'Fechar pesquisa' : 'Pesquisar no texto'}
              aria-label="Pesquisa"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Botão de Áudio / Ouvir em Voz Alta (se ativado) */}
          {showAudio && onToggleAudio && (
            <button
              onClick={onToggleAudio}
              className={`p-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 relative ${
                isAudioOpen || isPlayingAudio
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'hover:bg-black/5 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300'
              }`}
              title="Leitura em voz alta (áudio)"
              aria-label="Áudio"
            >
              <Volume2 className="w-4 h-4" />
              {isPlayingAudio && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </button>
          )}

          {/* Botão de Marcadores (se ativado) */}
          {showBookmarks && onToggleBookmarks && (
            <button
              onClick={onToggleBookmarks}
              className={`p-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 relative ${
                isBookmarksOpen
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'hover:bg-black/5 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300'
              }`}
              title={`Marcadores e trechos salvos (${bookmarksCount})`}
              aria-label="Marcadores"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] rounded-full bg-stone-800 text-white dark:bg-amber-400 dark:text-zinc-950 text-[9px] font-mono font-bold flex items-center justify-center">
                  {bookmarksCount}
                </span>
              )}
            </button>
          )}

          {/* Botão de Navegação para a Bíblia (se ativado) */}
          {showBible && onOpenBible && (
            <button
              onClick={onOpenBible}
              className="hidden sm:flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-black/10 hover:border-black/20 hover:bg-black/5 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:text-zinc-200 text-xs font-sans font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
              title="Consultar Bíblia Livre"
            >
              <BookOpen className="w-3.5 h-3.5 opacity-75 text-stone-500 dark:text-amber-400" />
              <span>Bíblia</span>
            </button>
          )}

          {/* Botão de Instalar App no Celular (PWA) */}
          <PWAInstallButton theme={theme} variant="header" />

          {/* Indicador percentual discreto (se ativado) */}
          {showReadingProgress && (
            <span className="text-xs font-sans text-stone-500 dark:text-zinc-300 font-medium tabular-nums px-1">
              {progressPercentage}%
            </span>
          )}

          {/* Botão de preferências de leitura (tamanho de fonte e tema) (se ativado) */}
          {showThemeToggle && (
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-zinc-800 dark:text-zinc-200 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer ${
                  showSettings ? 'bg-black/10 dark:bg-zinc-800' : ''
                }`}
                title="Ajustes de leitura e temas"
                aria-label="Ajustes de leitura"
                aria-expanded={showSettings}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Painel de preferências elegante e compacto */}
              {showSettings && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSettings(false)}
                  />
                  <div
                    className={`absolute right-0 mt-2 w-64 p-4 rounded-xl border shadow-lg z-50 transition-all font-sans ${popoverStyles}`}
                  >
                    <div className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-zinc-300 mb-3">
                      Preferências de Leitura
                    </div>

                    {/* Ajuste de tamanho da fonte */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-2 dark:text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5" />
                          Tamanho do Texto
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/5 dark:bg-zinc-800/80 rounded-lg">
                        {(['sm', 'md', 'lg', 'xl'] as FontSizeScale[]).map((size, index) => {
                          const labels = ['P', 'M', 'G', 'GG'];
                          const isActive = fontSize === size;
                          return (
                            <button
                              key={size}
                              onClick={() => onFontSizeChange(size)}
                              className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-stone-800 text-stone-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                                  : 'hover:bg-black/5 text-stone-600 dark:text-zinc-300 dark:hover:text-white'
                              }`}
                            >
                              {labels[index]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ajuste de tema/papel */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2 dark:text-zinc-300">
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
                        ].map((t) => {
                          const isSelected = theme === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => onThemeChange(t.id)}
                              className={`p-2 rounded-lg border text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${t.bg} ${t.text} ${
                                isSelected
                                  ? 'ring-2 ring-stone-600 dark:ring-amber-400 font-semibold border-transparent'
                                  : 'border-black/10 dark:border-zinc-700 hover:border-black/20 dark:hover:border-zinc-600'
                              }`}
                            >
                              {t.id === 'dark' ? (
                                <Moon className="w-3.5 h-3.5 text-zinc-100" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-black/20" />
                              )}
                              <span className="text-[10px]">{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Opção para bloquear acesso */}
                    {onLogout && (
                      <div className="mt-4 pt-3 border-t border-black/10 dark:border-zinc-700">
                        <button
                          onClick={() => {
                            setShowSettings(false);
                            onLogout();
                          }}
                          className="w-full py-1.5 px-2 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Bloquear Acesso (PIN)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Botão de Bloqueio Rápido */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-zinc-800 text-stone-500 hover:text-stone-700 dark:text-zinc-400 dark:hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer"
              title="Bloquear aplicativo (exigir PIN)"
              aria-label="Bloquear aplicativo"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
