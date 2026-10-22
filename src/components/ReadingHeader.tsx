import React, { useState, useRef } from 'react';
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
  Shield,
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
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
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
  chapterTitle,
  chapterNumberText,
  progressPercentage,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onReturnToLibrary,
  onOpenBible,
  onLogout,
  isAdmin = false,
  onNavigateToAdmin,
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

  // Atalho secreto de retorno ao painel administrativo: 5 cliques rápidos consecutivos no cabeçalho
  const secretClickCountRef = useRef<number>(0);
  const lastSecretClickTimeRef = useRef<number>(0);

  const handleSecretHeaderClick = () => {
    if (!onNavigateToAdmin) return;
    const now = Date.now();
    if (now - lastSecretClickTimeRef.current > 650) {
      secretClickCountRef.current = 1;
    } else {
      secretClickCountRef.current += 1;
    }
    lastSecretClickTimeRef.current = now;

    if (secretClickCountRef.current >= 5) {
      secretClickCountRef.current = 0;
      onNavigateToAdmin();
    }
  };

  // Verificações com fallbacks seguros (padrão true se features não informado)
  const showReadingProgress = features ? features.readingProgress : true;
  const showThemeToggle = features ? features.themeToggle : true;
  const showBible = features ? features.integratedBible : true;
  const showSearch = features ? features.search : true;
  const showBookmarks = features ? features.bookmarks : true;
  const showAudio = features ? Boolean(features.audioReading) : false;

  // Cores dinâmicas para o cabeçalho baseadas no tema com acabamento editorial translúcido
  const themeStyles = {
    paper: 'bg-[#FBFBF9]/95 text-stone-850',
    cream: 'bg-[#F7F2E7]/95 text-[#292524]',
    sepia: 'bg-[#F3EAD8]/95 text-[#3D3025]',
    dark: 'dark bg-[#18181B]/95 text-zinc-100',
  }[theme];

  const popoverStyles = {
    paper: 'bg-[#FFFFFF] border-stone-200/90 shadow-xl shadow-stone-200/50 text-stone-850',
    cream: 'bg-[#FAF6EC] border-[#E5DECD] shadow-xl shadow-stone-400/20 text-[#292524]',
    sepia: 'bg-[#EFE5D1] border-[#DFCDB3] shadow-xl shadow-stone-500/20 text-[#3D3025]',
    dark: 'bg-[#202024] border-zinc-700/80 shadow-2xl shadow-black/60 text-zinc-100',
  }[theme];

  const progressBg = theme === 'dark' ? 'bg-amber-400' : 'bg-stone-800';

  return (
    <header
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] transition-colors duration-200 ${themeStyles}`}
    >
      {/* 1. Barra de progresso ultrafina e discreta no topo */}
      {showReadingProgress && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
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

      {/* 2. Barra Principal com Respiro Confortável e Hierarquia Editorial */}
      <div className="max-w-6xl w-full mx-auto px-2.5 sm:px-6 md:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-6">
        {/* NAVEGAÇÃO ESQUERDA: Botão Voltar Sutil e Atalho Administrativo Exclusivo */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onReturnToLibrary}
            className="group flex items-center gap-1.5 p-2 rounded-xl text-xs sm:text-sm font-sans tracking-wide transition-colors text-stone-600 hover:text-stone-950 dark:text-zinc-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            title="Retornar à Biblioteca"
            aria-label="Voltar para a Biblioteca"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 opacity-80 group-hover:opacity-100" />
            <span className="font-medium hidden md:inline">Biblioteca</span>
          </button>

          {/* Botão de retorno ao Painel do Administrador (exibido exclusivamente quando sessão admin ativa) */}
          {isAdmin && onNavigateToAdmin && (
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="inline-flex items-center gap-1 py-1 px-2 sm:py-1.5 sm:px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-500/25 font-sans text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
              title="Retornar ao Painel do Administrador (acesso exclusivo)"
            >
              <Shield className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span className="hidden sm:inline">Painel Admin</span>
            </button>
          )}
        </div>

        {/* CENTRO: HIERARQUIA EDITORIAL COM ESPAÇO NOBRE GARANTIDO */}
        {!isSearchOpen ? (
          <div
            onClick={handleSecretHeaderClick}
            className="flex-1 min-w-0 px-1 sm:px-4 text-center select-none cursor-default active:opacity-90 transition-opacity"
          >
            {bookTitle && (
              <div className="text-[9px] sm:text-[11px] font-sans font-medium uppercase tracking-[0.14em] sm:tracking-[0.2em] text-stone-400 dark:text-zinc-400 truncate leading-tight">
                {bookTitle}
              </div>
            )}
            <h2 className="text-xs sm:text-sm font-serif font-bold text-stone-900 dark:text-zinc-50 truncate leading-snug">
              {chapterNumberText ? `${chapterNumberText} · ${chapterTitle}` : chapterTitle}
            </h2>
          </div>
        ) : (
          /* Modo de Pesquisa Aberto na Barra */
          showSearch && (
            <div className="flex-1 max-w-md mx-2 animate-in fade-in duration-150">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-stone-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  placeholder="Pesquisar no capítulo..."
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className={`w-full pl-8 pr-20 py-1.5 rounded-xl text-xs border outline-none transition-colors ${
                    theme === 'dark'
                      ? 'bg-zinc-800/90 border-zinc-700 text-zinc-100 focus:border-amber-400'
                      : 'bg-white/90 border-stone-300 text-stone-900 focus:border-stone-500'
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
                          className="p-1 hover:bg-black/10 dark:hover:bg-zinc-700 rounded-md cursor-pointer"
                          title="Anterior"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={onNextSearchResult}
                          className="p-1 hover:bg-black/10 dark:hover:bg-zinc-700 rounded-md cursor-pointer"
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
                      className="p-1 hover:bg-black/10 dark:hover:bg-zinc-700 rounded-md cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* NAVEGAÇÃO DIREITA: Ações Essenciais Otimizadas para Mobile e Desktop */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          {/* Botão de Pesquisa */}
          {showSearch && onToggleSearch && (
            <button
              type="button"
              onClick={onToggleSearch}
              className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
                isSearchOpen
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={isSearchOpen ? 'Fechar pesquisa' : 'Pesquisar no texto'}
              aria-label="Pesquisa"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Botão de Áudio (visível no desktop ou quando reproduzindo no mobile) */}
          {showAudio && onToggleAudio && (
            <button
              type="button"
              onClick={onToggleAudio}
              className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer relative ${
                isPlayingAudio ? 'inline-flex' : 'hidden sm:inline-flex'
              } ${
                isAudioOpen || isPlayingAudio
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Leitura em voz alta (áudio)"
              aria-label="Áudio"
            >
              <Volume2 className="w-4 h-4" />
              {isPlayingAudio && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </button>
          )}

          {/* Botão de Marcadores */}
          {showBookmarks && onToggleBookmarks && (
            <button
              type="button"
              onClick={onToggleBookmarks}
              className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer relative ${
                isBookmarksOpen
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={`Marcadores e trechos salvos (${bookmarksCount})`}
              aria-label="Marcadores"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[14px] h-[14px] rounded-full bg-stone-900 text-stone-100 dark:bg-amber-400 dark:text-zinc-950 text-[9px] font-mono font-bold flex items-center justify-center">
                  {bookmarksCount}
                </span>
              )}
            </button>
          )}

          {/* Atalho para a Bíblia Livre (visível em telas médias e grandes) */}
          {showBible && onOpenBible && (
            <button
              type="button"
              onClick={onOpenBible}
              className="hidden md:inline-flex p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-sans font-medium transition-colors cursor-pointer items-center gap-1.5"
              title="Consultar Bíblia Livre"
              aria-label="Abrir Bíblia Livre"
            >
              <BookOpen className="w-4 h-4 opacity-80" />
              <span>Bíblia</span>
            </button>
          )}

          {/* Botão de Instalação PWA (visível em telas maiores) */}
          <div className="hidden sm:block">
            <PWAInstallButton theme={theme} variant="header" />
          </div>

          {/* Indicador percentual sutil */}
          {showReadingProgress && (
            <span className="text-[11px] font-sans text-stone-400 dark:text-zinc-400 font-medium tabular-nums px-1 hidden sm:inline">
              {progressPercentage}%
            </span>
          )}

          {/* Menu de Ajustes de Leitura (Fonte, Tom de Página, Acesso) */}
          {showThemeToggle && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 sm:p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer ${
                  showSettings ? 'bg-black/10 dark:bg-white/10 text-stone-900 dark:text-zinc-100' : ''
                }`}
                title="Ajustes de leitura e temas"
                aria-label="Ajustes de leitura"
                aria-expanded={showSettings}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Popover de preferências */}
              {showSettings && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSettings(false)}
                  />
                  <div
                    className={`absolute right-0 mt-2 w-64 p-4 rounded-2xl border shadow-xl z-50 transition-all font-sans ${popoverStyles}`}
                  >
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-stone-400 dark:text-zinc-400 mb-3">
                      Preferências de Leitura
                    </div>

                    {/* Tamanho da fonte */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-2 text-stone-600 dark:text-zinc-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Type className="w-3.5 h-3.5 opacity-70" />
                          Tamanho do Texto
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/[0.04] dark:bg-zinc-800/80 rounded-xl">
                        {(['sm', 'md', 'lg', 'xl'] as FontSizeScale[]).map((size, index) => {
                          const labels = ['P', 'M', 'G', 'GG'];
                          const isActive = fontSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => onFontSizeChange(size)}
                              className={`py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-stone-900 text-stone-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                                  : 'hover:bg-black/5 text-stone-600 dark:text-zinc-300 dark:hover:text-white'
                              }`}
                            >
                              {labels[index]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tom do papel */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2 text-stone-600 dark:text-zinc-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Sun className="w-3.5 h-3.5 opacity-70" />
                          Tom da Página
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'paper' as ReadingTheme, label: 'Alvo', bg: 'bg-[#FBFBF9]', text: 'text-stone-850' },
                          { id: 'cream' as ReadingTheme, label: 'Creme', bg: 'bg-[#F7F2E7]', text: 'text-[#292524]' },
                          { id: 'sepia' as ReadingTheme, label: 'Sépia', bg: 'bg-[#F3EAD8]', text: 'text-[#3D3025]' },
                          { id: 'dark' as ReadingTheme, label: 'Noite', bg: 'bg-[#18181B]', text: 'text-zinc-100' },
                        ].map((t) => {
                          const isSelected = theme === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => onThemeChange(t.id)}
                              className={`p-2 rounded-xl border text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${t.bg} ${t.text} ${
                                isSelected
                                  ? 'ring-2 ring-stone-700 dark:ring-amber-400 font-semibold border-transparent shadow-xs'
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

                    {/* Ações adicionais disponíveis no Mobile */}
                    <div className="sm:hidden pt-3 mt-3 border-t border-black/[0.06] dark:border-zinc-700/60 space-y-1.5">
                      {showBible && onOpenBible && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettings(false);
                            onOpenBible();
                          }}
                          className="w-full py-1.5 px-2.5 rounded-xl text-xs font-medium text-stone-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 opacity-70" />
                          <span>Consultar Bíblia Livre</span>
                        </button>
                      )}
                      {showAudio && onToggleAudio && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettings(false);
                            onToggleAudio();
                          }}
                          className="w-full py-1.5 px-2.5 rounded-xl text-xs font-medium text-stone-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 opacity-70" />
                          <span>Leitura em Voz Alta (Áudio)</span>
                        </button>
                      )}
                    </div>

                    {/* Bloqueio de Acesso */}
                    {onLogout && (
                      <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-zinc-700/60">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettings(false);
                            onLogout();
                          }}
                          className="w-full py-1.5 px-2 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

          {/* Botão de Bloqueio Rápido Discreto (visível em telas médias/grandes) */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="hidden sm:inline-flex p-2 rounded-xl transition-colors text-stone-400 hover:text-stone-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
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
