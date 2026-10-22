import { useState, useEffect, useRef } from 'react';
import { libraryBooks } from './data/booksCatalog';
import { ChapterReader } from './components/ChapterReader';
import { BibleReader } from './components/BibleReader';
import { BiblePassageModal } from './components/BiblePassageModal';
import { PinLockScreen } from './components/PinLockScreen';
import { AdminPanel } from './components/AdminPanel';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ReaderRegistrationScreen } from './components/ReaderRegistrationScreen';
import { authService } from './services/authService';
import { adminAuthService } from './services/adminAuthService';
import {
  ReadingTheme,
  FontSizeScale,
  LibraryFeaturesConfig,
  ContentAvailabilityConfig,
  DEFAULT_LIBRARY_FEATURES,
  Book,
  Chapter,
  ReaderProfile,
} from './types/book';
import { BibleReferenceTarget } from './types/bible';
import {
  Library,
  BookOpen,
  X,
  Check,
  Lock,
  Loader2,
  Shield,
  AlertCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<ReadingTheme>('cream');
  const [fontSize, setFontSize] = useState<FontSizeScale>('md');
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);

  // Roteamento SPA (/ e /admin)
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  // Estado de controle de acesso por PIN e cadastro pessoal do leitor
  const [isAdminSession, setIsAdminSession] = useState<boolean>(() => {
    return Boolean(adminAuthService.getToken());
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(adminAuthService.getToken() || authService.getToken());
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(() => {
    return !adminAuthService.getToken();
  });
  const [hasProfile, setHasProfile] = useState<boolean | null>(() => {
    return Boolean(adminAuthService.getToken()) ? true : null;
  });
  const [readerProfile, setReaderProfile] = useState<ReaderProfile | null>(() => {
    if (adminAuthService.getToken()) {
      return {
        fullName: 'Administrador',
        phone: '',
        phoneFormatted: 'Acesso Administrativo',
        birthDate: '1970-01-01',
        gender: 'Prefiro não informar',
        maritalStatus: 'Prefiro não informar',
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  });
  const [readerName, setReaderName] = useState<string>(() => {
    return adminAuthService.getToken() ? 'Administrador' : '';
  });

  // Funcionalidades e Disponibilidade gerenciadas pelo Administrador
  const [features, setFeatures] = useState<LibraryFeaturesConfig>(DEFAULT_LIBRARY_FEATURES);
  const [contentAvailability, setContentAvailability] = useState<ContentAvailabilityConfig>({
    books: {
      'entre-a-cruz-e-o-mundo': {
        enabled: true,
        chapters: {
          'capitulo-1': true,
          'capitulo-2': true,
        },
      },
      'e-ai-crente': {
        enabled: true,
        chapters: {
          'capitulo-1': true,
          'capitulo-2': true,
        },
      },
    },
  });

  // Livro e Capítulo Ativos na Leitura (persistidos para restaurar após recarregar a página ou reiniciar)
  const [currentBookId, setCurrentBookId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bib_active_book_id');
      if (saved && libraryBooks.some((b) => b.id === saved)) {
        return saved;
      }
    }
    return 'entre-a-cruz-e-o-mundo';
  });
  const [currentChapterId, setCurrentChapterId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bib_active_chapter_id');
      if (saved) return saved;
    }
    return 'capitulo-1';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bib_active_book_id', currentBookId);
      localStorage.setItem('bib_active_chapter_id', currentChapterId);
    }
  }, [currentBookId, currentChapterId]);

  // Navegação entre Leitor Literário e Leitor Bíblico
  const [currentView, setCurrentView] = useState<'reader' | 'bible'>('reader');
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);

  // Sincronização de histórico do navegador (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentRoute(path);
    }
  };

  // Atalho secreto de acesso administrativo: 5 cliques rápidos consecutivos no logotipo da modal
  const modalSecretClickCountRef = useRef<number>(0);
  const modalSecretLastClickRef = useRef<number>(0);

  const handleModalLogoSecretClick = () => {
    const now = Date.now();
    if (now - modalSecretLastClickRef.current > 650) {
      modalSecretClickCountRef.current = 1;
    } else {
      modalSecretClickCountRef.current += 1;
    }
    modalSecretLastClickRef.current = now;

    if (modalSecretClickCountRef.current >= 5) {
      modalSecretClickCountRef.current = 0;
      setShowLibraryModal(false);
      navigateTo('/admin');
    }
  };

  // Alvo para a modal rápida de passagem ou para a página completa da Bíblia
  const [activePassageTarget, setActivePassageTarget] = useState<BibleReferenceTarget | null>(null);
  const [activeBibleReaderTarget, setActiveBibleReaderTarget] = useState<BibleReferenceTarget | null>(null);

  // Busca configurações da biblioteca e status de sessão no servidor
  useEffect(() => {
    let isMounted = true;
    const loadSessionAndConfig = async () => {
      try {
        // 1. Verifica se há sessão administrativa ativa no navegador ou servidor
        let isUserAdmin = false;
        let adminUsername = '';
        try {
          const adminStatus = await adminAuthService.checkSession();
          if (adminStatus.authenticated) {
            isUserAdmin = true;
            adminUsername = adminStatus.username || 'admin';
          }
        } catch {
          // ignora
        }

        // 2. Consulta status de sessão da biblioteca
        const session = await authService.checkSession();
        if (isMounted) {
          if (isUserAdmin || session.isAdmin) {
            setIsAdminSession(true);
            setIsAuthenticated(true);
            setHasProfile(true);
            const admName = session.readerName || `Administrador (${adminUsername || 'admin'})`;
            setReaderName(admName);
            setReaderProfile(
              session.readerProfile || {
                fullName: admName,
                phone: '',
                phoneFormatted: 'Acesso Administrativo',
                birthDate: '1970-01-01',
                gender: 'Prefiro não informar',
                maritalStatus: 'Prefiro não informar',
                registeredAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            );
          } else {
            setIsAdminSession(false);
            setIsAuthenticated(session.authenticated);
            if (session.authenticated) {
              const isProfileComplete = Boolean(
                session.hasProfile &&
                !session.requiresRegistration &&
                session.readerProfile?.fullName &&
                session.readerProfile?.phone &&
                session.readerProfile?.birthDate
              );
              setHasProfile(isProfileComplete);
              setReaderProfile(session.readerProfile || null);
              setReaderName(session.readerName || '');
            } else {
              setHasProfile(false);
              setReaderProfile(null);
              setReaderName('');
            }
          }
          if (session.features) {
            setFeatures(session.features);
          }
          if (session.contentAvailability) {
            setContentAvailability(session.contentAvailability);
          }
        }

        // Se não vieram na sessão, busca do endpoint público de configurações
        if (!session.features || !session.contentAvailability) {
          const config = await authService.getLibraryConfig();
          if (isMounted) {
            if (config.features) setFeatures(config.features);
            if (config.contentAvailability) setContentAvailability(config.contentAvailability);
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          setHasProfile(null);
          setReaderProfile(null);
          setReaderName('');
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    loadSessionAndConfig();
    return () => {
      isMounted = false;
    };
  }, [currentRoute]);

  // Bloqueio manual de acesso / Logout
  const handleLogout = async () => {
    if (isAdminSession) {
      try {
        await adminAuthService.logout();
      } catch {}
      setIsAdminSession(false);
    }
    await authService.logout();
    setIsAuthenticated(false);
    setHasProfile(null);
    setReaderProfile(null);
    setReaderName('');
    setShowLibraryModal(false);
  };

  // Abre modal de biblioteca
  const handleReturnToLibrary = () => {
    setShowLibraryModal(true);
  };

  // Abre a Bíblia diretamente pela barra de navegação
  const handleOpenBibleFromNav = () => {
    if (features.integratedBible === false) return;
    setSavedScrollPosition(window.scrollY);
    setActiveBibleReaderTarget({
      bookAbbrev: 'PSA',
      bookName: 'Salmos',
      chapter: 1,
      originalText: 'Salmo 1',
    });
    setCurrentView('bible');
  };

  // Quando o leitor clica em uma referência bíblica no texto
  const handleOpenBibleReference = (target: BibleReferenceTarget) => {
    if (features.integratedBible === false) return;
    setActivePassageTarget(target);
  };

  // Quando o leitor opta por "Ler capítulo completo" a partir da modal
  const handleOpenFullChapterFromModal = (target: BibleReferenceTarget) => {
    if (features.integratedBible === false) return;
    setSavedScrollPosition(window.scrollY);
    setActivePassageTarget(null);
    setActiveBibleReaderTarget(target);
    setCurrentView('bible');
  };

  // Retorno ao livro literário preservando o ponto exato de leitura
  const handleReturnToBook = () => {
    setCurrentView('reader');
  };

  // Sincroniza a classe 'dark' no documento para Tailwind
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Restaura a posição exata da rolagem após retornar ao leitor literário
  useEffect(() => {
    if (currentView === 'reader' && savedScrollPosition > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({
          top: savedScrollPosition,
          behavior: 'instant' as ScrollBehavior,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentView, savedScrollPosition]);

  // Identifica livro e capítulo atuais a partir do catálogo
  const currentBook: Book =
    libraryBooks.find((b) => b.id === currentBookId) || libraryBooks[0];

  const currentChapter: Chapter =
    currentBook.chapters.find((c) => c.id === currentChapterId) ||
    currentBook.chapters[0] ||
    libraryBooks[0].chapters[0];

  const currentChapterIndex = currentBook.chapters.findIndex((c) => c.id === currentChapter.id);
  const hasPreviousChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex >= 0 && currentChapterIndex < currentBook.chapters.length - 1;

  // Verificação de disponibilidade editorial do livro e capítulo selecionados (se for administrador ativo, acesso total irrestrito)
  const bookConfig = contentAvailability.books[currentBook.id] || { enabled: true, chapters: {} };
  const isCurrentBookEnabled = isAdminSession || bookConfig.enabled !== false;
  const isCurrentChapterEnabled = isAdminSession || (isCurrentBookEnabled && bookConfig.chapters?.[currentChapter.id] !== false);

  // Seleciona um livro e capítulo para ler
  const handleSelectChapter = (bookId: string, chapterId: string) => {
    setCurrentBookId(bookId);
    setCurrentChapterId(chapterId);
    setShowLibraryModal(false);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Avança para o próximo capítulo
  const handleNextChapter = () => {
    if (hasNextChapter) {
      const nextCh = currentBook.chapters[currentChapterIndex + 1];
      setCurrentChapterId(nextCh.id);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  // Retorna para o capítulo anterior
  const handlePreviousChapter = () => {
    if (hasPreviousChapter) {
      const prevCh = currentBook.chapters[currentChapterIndex - 1];
      setCurrentChapterId(prevCh.id);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  // Verificação contínua no servidor: se o cadastro estiver pendente, trava o leitor no cadastro inicial (a menos que seja admin)
  useEffect(() => {
    if (isAuthenticated && hasProfile && !isAdminSession) {
      authService.checkAccess(currentBookId, currentChapterId).then((res) => {
        if (res.requiresRegistration) {
          setHasProfile(false);
        }
      });
    }
  }, [isAuthenticated, hasProfile, isAdminSession, currentBookId, currentChapterId]);

  // ROTA 1: Área Administrativa independente do PIN dos leitores (/admin)
  if (currentRoute.startsWith('/admin')) {
    return (
      <AdminPanel
        theme={theme}
        onNavigateToLibrary={() => {
          setIsAdminSession(true);
          setIsAuthenticated(true);
          setHasProfile(true);
          navigateTo('/');
        }}
      />
    );
  }

  // ROTA 2: Verificação de Sessão Inicial
  if (isCheckingAuth && !isAdminSession) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-200 ${
          theme === 'dark' ? 'bg-zinc-950 text-zinc-300' : 'bg-[#FBF8F3] text-stone-700'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <BookOpen className="w-8 h-8 opacity-40 animate-pulse" />
          <div className="flex items-center gap-2 text-xs font-serif italic text-stone-500 dark:text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Consultando acesso seguro...</span>
          </div>
        </div>
      </div>
    );
  }

  // ROTA 3: Tela de Acesso por PIN (se ainda não autenticado no servidor)
  // BYPASS COMPLETO: administradores nunca passam por esta tela
  if (!isAuthenticated && !isAdminSession) {
    return (
      <PinLockScreen
        theme={theme}
        onAuthenticated={(result) => {
          setIsAuthenticated(true);
          const isComplete = Boolean(
            result?.hasProfile &&
            !result?.requiresRegistration &&
            result?.readerProfile?.fullName &&
            result?.readerProfile?.phone &&
            result?.readerProfile?.birthDate
          );
          setHasProfile(isComplete);
          setReaderProfile(result?.readerProfile || null);
          setReaderName(result?.readerName || '');
        }}
        onNavigateToAdmin={() => navigateTo('/admin')}
      />
    );
  }

  // ROTA 3.5: Obrigatoriedade de Cadastro no Primeiro Acesso
  // BYPASS COMPLETO: administradores nunca passam pela tela de cadastro de leitor
  if (!isAdminSession) {
    const isProfileComplete = Boolean(
      hasProfile === true &&
      readerProfile &&
      readerProfile.fullName &&
      readerProfile.phone &&
      readerProfile.birthDate
    );

    if (!isProfileComplete) {
      return (
        <ReaderRegistrationScreen
          theme={theme}
          initialName={readerName}
          onRegistrationSuccess={(profile) => {
            setHasProfile(true);
            setReaderProfile(profile);
            setReaderName(profile.fullName);
          }}
          onLogout={handleLogout}
        />
      );
    }
  }

  // ROTA 4: Aplicação Desbloqueada aos Leitores
  return (
    <>
      {/* 1. VISÃO DO LIVRO LITERÁRIO */}
      {currentView === 'reader' && (
        <>
          {/* Se o Administrador desativou o Leitor Literário */}
          {!features.literaryReader ? (
            <div
              className={`min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans ${
                theme === 'dark' ? 'bg-zinc-950 text-zinc-200' : 'bg-[#FBF8F3] text-stone-800'
              }`}
            >
              <div className="max-w-md w-full p-8 rounded-3xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-zinc-50">
                  Leitor Literário em Manutenção
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-300 font-serif leading-relaxed">
                  A leitura das obras literárias está temporariamente pausada pela administração para atualizações editoriais.
                </p>

                <div className="pt-4 flex flex-col gap-2">
                  {features.integratedBible && (
                    <button
                      onClick={handleOpenBibleFromNav}
                      className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-stone-50 dark:text-zinc-950 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      Consultar a Bíblia Sagrada
                    </button>
                  )}
                  <button
                    onClick={() => setShowLibraryModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Ver Catálogo da Biblioteca
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline pt-2 cursor-pointer"
                  >
                    Bloquear Acesso (Sair)
                  </button>
                </div>
              </div>
            </div>
          ) : !isCurrentBookEnabled ? (
            /* Se o Livro Selecionado estiver desativado pelo Administrador */
            <div
              className={`min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans ${
                theme === 'dark' ? 'bg-zinc-950 text-zinc-200' : 'bg-[#FBF8F3] text-stone-800'
              }`}
            >
              <div className="max-w-md w-full p-8 rounded-3xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-zinc-50">
                  Livro Indisponível
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-300 font-serif leading-relaxed">
                  O livro <strong>{currentBook.title}</strong> foi temporariamente desativado pela administração. Escolha outro livro liberado na Biblioteca.
                </p>

                <div className="pt-4 flex flex-col gap-2">
                  <button
                    onClick={() => setShowLibraryModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-stone-50 dark:text-zinc-950 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Library className="w-4 h-4" />
                    Abrir Estante da Biblioteca
                  </button>
                </div>
              </div>
            </div>
          ) : !isCurrentChapterEnabled ? (
            /* Se o Capítulo Selecionado estiver desativado pelo Administrador */
            <div
              className={`min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans ${
                theme === 'dark' ? 'bg-zinc-950 text-zinc-200' : 'bg-[#FBF8F3] text-stone-800'
              }`}
            >
              <div className="max-w-md w-full p-8 rounded-3xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-zinc-50">
                  Capítulo Indisponível
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-300 font-serif leading-relaxed">
                  O <strong>{currentChapter.romanNumber || 'Capítulo ' + currentChapter.number} ({currentChapter.title})</strong> foi bloqueado temporariamente para leitura.
                </p>

                <div className="pt-4 flex flex-col gap-2">
                  <button
                    onClick={() => setShowLibraryModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-stone-50 dark:text-zinc-950 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Library className="w-4 h-4" />
                    Escolher Outro Capítulo na Biblioteca
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Leitor do Capítulo Totalmente Operacional */
            <ChapterReader
              book={currentBook}
              chapter={currentChapter}
              theme={theme}
              fontSize={fontSize}
              onThemeChange={setTheme}
              onFontSizeChange={setFontSize}
              onReturnToLibrary={handleReturnToLibrary}
              onOpenBible={features.integratedBible ? handleOpenBibleFromNav : undefined}
              onOpenBibleReference={features.integratedBible ? handleOpenBibleReference : undefined}
              onLogout={handleLogout}
              isAdmin={isAdminSession}
              onNavigateToAdmin={() => navigateTo('/admin')}
              hasPreviousChapter={hasPreviousChapter}
              hasNextChapter={hasNextChapter}
              onNextChapter={handleNextChapter}
              onPreviousChapter={handlePreviousChapter}
              features={features}
            />
          )}
        </>
      )}

      {/* 2. VISÃO DA BÍBLIA SAGRADA INTEGRADA (se habilitada) */}
      {currentView === 'bible' && features.integratedBible && (
        <BibleReader
          initialTarget={activeBibleReaderTarget}
          returnToBookTitle={currentBook.title}
          returnToChapterTitle={currentChapter.title}
          theme={theme}
          fontSize={fontSize}
          onThemeChange={setTheme}
          onFontSizeChange={setFontSize}
          onReturnToBook={handleReturnToBook}
          onReturnToLibrary={handleReturnToLibrary}
          onLogout={handleLogout}
          isAdmin={isAdminSession}
          onNavigateToAdmin={() => navigateTo('/admin')}
        />
      )}

      {/* 3. MODAL DE PASSAGEM BÍBLICA FOCADA (se habilitada) */}
      {activePassageTarget && features.integratedBible && (
        <BiblePassageModal
          target={activePassageTarget}
          theme={theme}
          fontSize={fontSize}
          onClose={() => setActivePassageTarget(null)}
          onOpenFullChapter={handleOpenFullChapterFromModal}
        />
      )}

      {/* 4. MODAL DO CATÁLOGO E ESTANTE DA BIBLIOTECA */}
      {showLibraryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="library-modal-title"
        >
          <div className="bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-800 dark:text-zinc-100 rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 font-sans max-h-[90vh] flex flex-col justify-between">
            <button
              onClick={() => setShowLibraryModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="overflow-y-auto pr-1 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/icon.svg"
                  alt="Logotipo Oficial da Biblioteca Digital"
                  width={40}
                  height={40}
                  onClick={handleModalLogoSecretClick}
                  className="w-10 h-10 rounded-xl object-contain shadow-xs border border-stone-200/80 dark:border-zinc-800 shrink-0 select-none cursor-default active:scale-95 transition-transform"
                />
                <div>
                  <h2 id="library-modal-title" className="text-lg font-serif font-bold text-stone-900 dark:text-zinc-50">
                    Biblioteca Digital
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif">
                    Catálogo de obras e seleção de capítulos
                  </p>
                </div>
              </div>

              {/* Lista de Livros Disponíveis */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                  Obras do Acervo
                </div>

                {libraryBooks.map((b) => {
                  const bCfg = contentAvailability.books[b.id] || { enabled: true, chapters: {} };
                  const isBEnabled = isAdminSession || bCfg.enabled !== false;

                  return (
                    <div
                      key={b.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isBEnabled
                          ? 'bg-white dark:bg-zinc-800/80 border-stone-200 dark:border-zinc-700/80'
                          : 'bg-stone-100/60 dark:bg-zinc-800/30 border-stone-200/50 dark:border-zinc-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm text-stone-900 dark:text-zinc-100">
                              {b.title}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                bCfg.enabled !== false
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {bCfg.enabled !== false ? 'Liberado' : 'Indisponível'}
                            </span>
                          </div>
                          <span className="text-xs text-stone-500 dark:text-zinc-400 font-serif">
                            {b.author}
                          </span>
                        </div>
                      </div>

                      {/* Capítulos do Livro */}
                      <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-zinc-700/60">
                        {b.chapters.length === 0 ? (
                          <div className="p-3 rounded-lg bg-stone-50 dark:bg-zinc-800/50 text-center font-serif">
                            <span className="text-xs text-amber-850 dark:text-amber-300 font-medium block">
                              Em preparação editorial
                            </span>
                            <span className="text-[11px] text-stone-500 dark:text-zinc-400 block mt-0.5">
                              {b.editorialNote || 'Aguardando publicação dos capítulos originais pelo autor Pr. Fernando Veiga.'}
                            </span>
                          </div>
                        ) : (
                          b.chapters.map((ch) => {
                            const isChEnabled = isAdminSession || (bCfg.enabled !== false && bCfg.chapters?.[ch.id] !== false);
                            const isCurrent = currentBookId === b.id && currentChapterId === ch.id;

                            return (
                              <button
                                key={ch.id}
                                type="button"
                                disabled={!isChEnabled}
                                onClick={() => handleSelectChapter(b.id, ch.id)}
                                className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isCurrent
                                    ? 'bg-amber-100/70 text-amber-950 dark:bg-amber-500/20 dark:text-amber-300 font-semibold'
                                    : isChEnabled
                                    ? 'hover:bg-stone-100 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200'
                                    : 'text-stone-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                  <span className="truncate">
                                    {ch.romanNumber || `Capítulo ${ch.number}`} – {ch.title}
                                  </span>
                                  {ch.status === 'awaiting_publication' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 shrink-0 font-sans">
                                      Em Preparação
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0 text-[11px]">
                                  {isCurrent && (
                                    <span className="text-[10px] bg-amber-500/20 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-sm">
                                      Lendo agora
                                    </span>
                                  )}
                                  {!isChEnabled && (
                                    <span className="text-[10px] text-rose-600 dark:text-rose-400">
                                      Indisponível
                                    </span>
                                  )}
                                  {isChEnabled && !isCurrent && (
                                    <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rodapé da Modal com ações */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 mt-4 border-t border-stone-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleLogout}
                  className="w-full sm:w-auto px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Bloquear Acesso
                </button>

                {isAdminSession && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLibraryModal(false);
                      navigateTo('/admin');
                    }}
                    className="w-full sm:w-auto px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/25 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Retornar ao Painel do Administrador"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>Painel Admin</span>
                  </button>
                )}

                <PWAInstallButton theme={theme} variant="header" />
              </div>

              {features.literaryReader && isCurrentChapterEnabled && (
                <button
                  onClick={() => setShowLibraryModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-50 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Continuar Lendo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Conexão Offline Global */}
      <OfflineIndicator />
    </>
  );
}
