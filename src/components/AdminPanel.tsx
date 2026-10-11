import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Users,
  RefreshCw,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
  Info,
  SlidersHorizontal,
  BookOpen,
  Library,
  BookCheck,
  HelpCircle,
  TrendingUp,
  Bookmark,
  Search,
  Volume2,
  Palette,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Smartphone,
  Download,
  Share2,
} from 'lucide-react';
import { adminAuthService, AdminSystemStatus } from '../services/adminAuthService';
import {
  ReadingTheme,
  LibraryFeaturesConfig,
  ContentAvailabilityConfig,
  DEFAULT_LIBRARY_FEATURES,
  Book,
} from '../types/book';
import { libraryBooks } from '../data/booksCatalog';
import { PWAInstallButton } from './PWAInstallButton';

interface AdminPanelProps {
  theme?: ReadingTheme;
  onNavigateToLibrary: () => void;
}

type AdminTab = 'security' | 'features' | 'books' | 'pwa';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  theme = 'cream',
  onNavigateToLibrary,
}) => {
  // Aba ativa do painel
  const [activeTab, setActiveTab] = useState<AdminTab>('features');

  // Estado de autenticação do administrador
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [adminUsername, setAdminUsername] = useState<string>('');

  // Formulário de Login Administrativo
  const [loginUser, setLoginUser] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Status Geral do Sistema Administrativo
  const [status, setStatus] = useState<AdminSystemStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Formulário de Alteração de PIN
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [revokeOnPinChange, setRevokeOnPinChange] = useState<boolean>(true);
  const [isUpdatingPin, setIsUpdatingPin] = useState<boolean>(false);

  // Estado das Funcionalidades da Biblioteca
  const [features, setFeatures] = useState<LibraryFeaturesConfig>(DEFAULT_LIBRARY_FEATURES);
  const [isSavingFeatures, setIsSavingFeatures] = useState<boolean>(false);

  // Estado da Disponibilidade de Livros e Capítulos
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
        chapters: {},
      },
    },
  });
  const [expandedBookIds, setExpandedBookIds] = useState<Record<string, boolean>>({
    'entre-a-cruz-e-o-mundo': true,
    'e-ai-crente': false,
  });
  const [isSavingContent, setIsSavingContent] = useState<boolean>(false);

  // Modais de Confirmação para Ações Críticas
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    variant: 'primary',
    action: async () => {},
  });

  const isDark = theme === 'dark';

  // Verifica sessão administrativa ao montar
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const res = await adminAuthService.checkSession();
        if (isMounted) {
          setIsAuthenticated(res.authenticated);
          if (res.authenticated && res.username) {
            setAdminUsername(res.username);
          }
        }
      } catch {
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    };
    check();
    return () => {
      isMounted = false;
    };
  }, []);

  // Carrega status quando autenticado
  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    setActionErrorMessage(null);
    try {
      const data = await adminAuthService.getStatus();
      if (data.success) {
        setStatus(data);
        if (data.adminUsername) setAdminUsername(data.adminUsername);
        if (data.features) setFeatures(data.features);
        if (data.contentAvailability) setContentAvailability(data.contentAvailability);
      } else {
        setActionErrorMessage(data.error || 'Erro ao consultar status administrativo.');
      }
    } catch {
      setActionErrorMessage('Erro de conexão ao carregar dados do servidor.');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
    }
  }, [isAuthenticated]);

  // Limpa mensagens temporárias após 6 segundos
  useEffect(() => {
    if (actionSuccessMessage) {
      const timer = setTimeout(() => setActionSuccessMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMessage]);

  // Efetua login administrativo
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPassword.trim()) {
      setLoginError('Por favor, informe o usuário e a senha.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await adminAuthService.login(loginUser, loginPassword);
      if (res.success) {
        setIsAuthenticated(true);
        if (res.username) setAdminUsername(res.username);
        setLoginPassword('');
      } else {
        setLoginError(res.error || 'Usuário ou senha incorretos.');
      }
    } catch {
      setLoginError('Falha ao comunicar com o servidor.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout administrativo
  const handleLogout = async () => {
    await adminAuthService.logout();
    setIsAuthenticated(false);
    setStatus(null);
    setLoginPassword('');
  };

  // Alteração do PIN com Confirmação
  const handleRequestPinChange = (e: React.FormEvent) => {
    e.preventDefault();
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    if (newPin.trim().length < 4) {
      setActionErrorMessage('O novo PIN deve conter no mínimo 4 caracteres ou dígitos.');
      return;
    }

    if (newPin.trim() !== confirmPin.trim()) {
      setActionErrorMessage('A confirmação do PIN não confere com o novo PIN digitado.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Alteração do PIN',
      description: `Tem certeza de que deseja atualizar o PIN de acesso dos leitores? ${
        revokeOnPinChange
          ? 'Todas as sessões ativas serão desconectadas e o novo PIN será exigido imediatamente de todos os usuários.'
          : 'Sessões já conectadas permanecerão válidas até expirarem.'
      }`,
      confirmText: 'Sim, Atualizar PIN',
      variant: 'primary',
      action: async () => {
        setIsUpdatingPin(true);
        try {
          const res = await adminAuthService.updatePin(newPin, confirmPin, revokeOnPinChange);
          if (res.success) {
            setActionSuccessMessage(res.message || 'PIN de acesso atualizado com sucesso e salvo em disco.');
            setNewPin('');
            setConfirmPin('');
            await fetchStatus();
          } else {
            setActionErrorMessage(res.error || 'Falha ao atualizar o PIN.');
          }
        } finally {
          setIsUpdatingPin(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Bloqueio/Desbloqueio da Biblioteca com Confirmação
  const handleToggleLock = (targetLocked: boolean) => {
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    setConfirmModal({
      isOpen: true,
      title: targetLocked ? 'Bloquear Acessos à Biblioteca?' : 'Liberar Acessos à Biblioteca?',
      description: targetLocked
        ? 'Ao bloquear, nenhum leitor conseguirá entrar com o PIN até que você libere novamente o acesso. Ideal para manutenções ou atualizações.'
        : 'Ao liberar, leitores autorizados com o PIN poderão acessar novamente os livros e a Bíblia.',
      confirmText: targetLocked ? 'Sim, Bloquear Acessos' : 'Sim, Liberar Acessos',
      variant: targetLocked ? 'warning' : 'primary',
      action: async () => {
        try {
          const res = await adminAuthService.toggleLock(targetLocked);
          if (res.success) {
            setActionSuccessMessage(res.message || 'Estado de acesso atualizado com sucesso.');
            await fetchStatus();
          } else {
            setActionErrorMessage(res.error || 'Falha ao alterar estado de bloqueio.');
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Revogação de Todas as Sessões com Confirmação
  const handleRevokeAllSessions = () => {
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    setConfirmModal({
      isOpen: true,
      title: 'Revogar Todas as Sessões de Leitores?',
      description:
        'Esta ação desconectará todos os dispositivos atualmente conectados à biblioteca digital. Todos os leitores precisarão digitar o PIN novamente para continuar.',
      confirmText: 'Sim, Revogar Todas as Sessões',
      variant: 'danger',
      action: async () => {
        try {
          const res = await adminAuthService.revokeAllSessions();
          if (res.success) {
            setActionSuccessMessage(
              res.message || 'Todas as sessões de leitores foram revogadas com sucesso.'
            );
            await fetchStatus();
          } else {
            setActionErrorMessage(res.error || 'Falha ao revogar sessões.');
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Alterna uma funcionalidade específica
  const handleToggleFeature = async (key: keyof LibraryFeaturesConfig) => {
    const updated = {
      ...features,
      [key]: !features[key],
    };
    setFeatures(updated);
    setIsSavingFeatures(true);
    setActionErrorMessage(null);

    try {
      const res = await adminAuthService.updateFeatures({ [key]: updated[key] });
      if (res.success && res.features) {
        setFeatures(res.features);
        setActionSuccessMessage(`Funcionalidade "${getFeatureName(key)}" atualizada para: ${updated[key] ? 'Ativado' : 'Desativado'}.`);
      } else {
        setActionErrorMessage(res.error || 'Erro ao salvar alteração da funcionalidade no servidor.');
        // Reverte
        setFeatures(features);
      }
    } catch {
      setActionErrorMessage('Erro de rede ao salvar funcionalidade.');
      setFeatures(features);
    } finally {
      setIsSavingFeatures(false);
    }
  };

  // Ativa todas as funcionalidades
  const handleEnableAllFeatures = async () => {
    const allEnabled: LibraryFeaturesConfig = {
      literaryReader: true,
      integratedBible: true,
      reflectionQuestions: true,
      readingProgress: true,
      bookmarks: true,
      search: true,
      audioReading: true,
      themeToggle: true,
    };
    setFeatures(allEnabled);
    setIsSavingFeatures(true);

    try {
      const res = await adminAuthService.updateFeatures(allEnabled);
      if (res.success && res.features) {
        setFeatures(res.features);
        setActionSuccessMessage('Todas as funcionalidades da biblioteca foram ativadas com sucesso.');
      }
    } finally {
      setIsSavingFeatures(false);
    }
  };

  // Alterna a disponibilidade de um livro inteiro
  const handleToggleBook = async (bookId: string) => {
    const currentBookConfig = contentAvailability.books[bookId] || {
      enabled: true,
      chapters: {},
    };
    const newEnabled = !currentBookConfig.enabled;

    const updatedConfig: ContentAvailabilityConfig = {
      books: {
        ...contentAvailability.books,
        [bookId]: {
          ...currentBookConfig,
          enabled: newEnabled,
        },
      },
    };

    setContentAvailability(updatedConfig);
    setIsSavingContent(true);
    setActionErrorMessage(null);

    try {
      const res = await adminAuthService.updateContentAvailability(updatedConfig);
      if (res.success && res.contentAvailability) {
        setContentAvailability(res.contentAvailability);
        setActionSuccessMessage(
          `Livro "${bookId}" ${newEnabled ? 'liberado para leitores' : 'bloqueado temporariamente'}.`
        );
      } else {
        setActionErrorMessage(res.error || 'Falha ao salvar disponibilidade do livro.');
        setContentAvailability(contentAvailability);
      }
    } catch {
      setActionErrorMessage('Erro de conexão ao salvar alteração do livro.');
      setContentAvailability(contentAvailability);
    } finally {
      setIsSavingContent(false);
    }
  };

  // Alterna a disponibilidade de um capítulo específico
  const handleToggleChapter = async (bookId: string, chapterId: string) => {
    const currentBookConfig = contentAvailability.books[bookId] || {
      enabled: true,
      chapters: {},
    };
    const currentChapters = currentBookConfig.chapters || {};
    const currentChapterEnabled = currentChapters[chapterId] !== false; // padrão true
    const newChapterEnabled = !currentChapterEnabled;

    const updatedConfig: ContentAvailabilityConfig = {
      books: {
        ...contentAvailability.books,
        [bookId]: {
          ...currentBookConfig,
          chapters: {
            ...currentChapters,
            [chapterId]: newChapterEnabled,
          },
        },
      },
    };

    setContentAvailability(updatedConfig);
    setIsSavingContent(true);
    setActionErrorMessage(null);

    try {
      const res = await adminAuthService.updateContentAvailability(updatedConfig);
      if (res.success && res.contentAvailability) {
        setContentAvailability(res.contentAvailability);
        setActionSuccessMessage(
          `Capítulo "${chapterId}" ${newChapterEnabled ? 'liberado para leitura' : 'bloqueado para leitores'}.`
        );
      } else {
        setActionErrorMessage(res.error || 'Falha ao salvar disponibilidade do capítulo.');
        setContentAvailability(contentAvailability);
      }
    } catch {
      setActionErrorMessage('Erro de conexão ao salvar disponibilidade do capítulo.');
      setContentAvailability(contentAvailability);
    } finally {
      setIsSavingContent(false);
    }
  };

  // Ação em lote: Liberar ou bloquear todos os capítulos de um livro
  const handleBatchChapters = async (book: Book, enableAll: boolean) => {
    const currentBookConfig = contentAvailability.books[book.id] || {
      enabled: true,
      chapters: {},
    };
    const updatedChapters: Record<string, boolean> = { ...currentBookConfig.chapters };
    book.chapters.forEach((ch) => {
      updatedChapters[ch.id] = enableAll;
    });

    const updatedConfig: ContentAvailabilityConfig = {
      books: {
        ...contentAvailability.books,
        [book.id]: {
          ...currentBookConfig,
          chapters: updatedChapters,
        },
      },
    };

    setContentAvailability(updatedConfig);
    setIsSavingContent(true);

    try {
      const res = await adminAuthService.updateContentAvailability(updatedConfig);
      if (res.success && res.contentAvailability) {
        setContentAvailability(res.contentAvailability);
        setActionSuccessMessage(
          `Todos os capítulos de "${book.title}" foram ${enableAll ? 'liberados' : 'bloqueados'}.`
        );
      }
    } finally {
      setIsSavingContent(false);
    }
  };

  // Expande / recolhe sanfona de capítulos
  const toggleAccordion = (bookId: string) => {
    setExpandedBookIds((prev) => ({
      ...prev,
      [bookId]: !prev[bookId],
    }));
  };

  const getFeatureName = (key: keyof LibraryFeaturesConfig): string => {
    switch (key) {
      case 'literaryReader':
        return 'Leitor Literário';
      case 'integratedBible':
        return 'Bíblia Integrada';
      case 'reflectionQuestions':
        return 'Perguntas para Reflexão';
      case 'readingProgress':
        return 'Progresso e Retomada da Leitura';
      case 'bookmarks':
        return 'Marcadores e Favoritos';
      case 'search':
        return 'Pesquisa de Conteúdo';
      case 'audioReading':
        return 'Áudio e Leitura em Voz Alta';
      case 'themeToggle':
        return 'Alternância de Temas Claro/Escuro';
      default:
        return key;
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Nunca registrado';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // 1. Tela de Carregamento Inicial
  if (isCheckingAuth) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          isDark ? 'bg-zinc-950 text-zinc-300' : 'bg-[#FBF8F3] text-stone-700'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-8 h-8 opacity-40 animate-pulse text-stone-600 dark:text-zinc-400" />
          <div className="flex items-center gap-2 text-xs font-serif italic text-stone-500 dark:text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Verificando credenciais administrativas...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Tela de Login Administrativo (Quando não autenticado)
  if (!isAuthenticated) {
    return (
      <div
        className={`min-h-screen flex flex-col justify-between p-4 sm:p-8 font-sans ${
          isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#FBF8F3] text-stone-800'
        }`}
      >
        {/* Barra superior com retorno */}
        <div className="max-w-md w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateToLibrary}
            className="inline-flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors py-2 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retornar à Biblioteca</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-zinc-500 font-serif italic">
            <Shield className="w-3.5 h-3.5" />
            <span>Área Administrativa</span>
          </div>
        </div>

        {/* Card Central de Login */}
        <div className="max-w-md w-full mx-auto my-8">
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-all ${
              isDark
                ? 'bg-zinc-900/90 border-zinc-800 shadow-black/40'
                : 'bg-white/95 border-stone-200/90 shadow-stone-300/30'
            }`}
          >
            <div className="flex flex-col items-center text-center mb-7">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
                  isDark
                    ? 'bg-amber-950/40 border border-amber-800/40 text-amber-400'
                    : 'bg-stone-100 border border-stone-200 text-stone-800'
                }`}
              >
                <ShieldCheck className="w-7 h-7" />
              </div>

              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-stone-900 dark:text-zinc-50 mb-1.5">
                Área Administrativa
              </h1>

              <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 max-w-xs font-serif leading-relaxed">
                Gestão e controles soberanos da Biblioteca Digital.
              </p>
            </div>

            {loginError && (
              <div
                className={`mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
                  isDark
                    ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-sans">{loginError}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                  Usuário Administrativo
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="Ex: admin"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 font-sans ${
                    isDark
                      ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400'
                      : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-stone-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                  Senha Administrativa
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Digite a senha administrativa"
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm border transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 font-sans ${
                      isDark
                        ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400'
                        : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-stone-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-stone-50 dark:text-zinc-950 font-semibold text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Acessar Painel de Controle</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Rodapé discreto de apoio */}
        <div className="max-w-md w-full mx-auto text-center pb-2">
          <p className="text-[11px] text-stone-400 dark:text-zinc-500 font-sans">
            Acesso protegido por autenticação segura no servidor Node.js
          </p>
        </div>
      </div>
    );
  }

  // 3. Painel Administrativo Autenticado
  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#FBF8F3] text-stone-800'
      }`}
    >
      {/* CABEÇALHO DO PAINEL */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-800'
            : 'bg-white/90 border-stone-200'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToLibrary}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Voltar para a Biblioteca"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Biblioteca</span>
            </button>

            <span className="text-stone-300 dark:text-zinc-700">|</span>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-400/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-serif font-bold text-stone-900 dark:text-zinc-100 leading-tight">
                  Painel Administrativo
                </h1>
                <p className="text-[11px] text-stone-400 dark:text-zinc-400 font-sans">
                  Sessão ativa: <strong className="font-semibold text-stone-700 dark:text-zinc-200">{adminUsername || 'Administrador'}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoadingStatus}
              className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-stone-200 dark:border-zinc-700 text-stone-600 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-xs font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 border-t border-stone-100 dark:border-zinc-800/80 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('features')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'features'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-stone-900 text-stone-50 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-zinc-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Funcionalidades da Biblioteca</span>
          </button>

          <button
            onClick={() => setActiveTab('books')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'books'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-stone-900 text-stone-50 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-zinc-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Livros e Capítulos</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-stone-900 text-stone-50 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-zinc-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Segurança e Acesso</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'pwa'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-stone-900 text-stone-50 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-zinc-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>App Mobile (PWA)</span>
          </button>
        </div>
      </header>

      {/* FEEDBACK DE SUCESSO OU ERRO */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
        {actionSuccessMessage && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2.5 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button
              onClick={() => setActionSuccessMessage(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        )}

        {actionErrorMessage && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in ${
              isDark
                ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{actionErrorMessage}</span>
            </div>
            <button
              onClick={() => setActionErrorMessage(null)}
              className="text-rose-700 dark:text-rose-300 hover:opacity-75 cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL DAS ABAS */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* =========================================================================
            ABA 1: FUNCIONALIDADES DA BIBLIOTECA
            ========================================================================= */}
        {activeTab === 'features' && (
          <section className="space-y-6 animate-in fade-in duration-200">
            {/* Introdução da seção */}
            <div
              className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <SlidersHorizontal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-zinc-50">
                      Funcionalidades da Biblioteca
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 font-serif max-w-2xl leading-relaxed">
                    Controle de ativação e desativação independente de cada recurso para os leitores.
                    Quando uma opção é desativada, seu acesso é ocultado de forma coerente sem apagar
                    dados salvos.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleEnableAllFeatures}
                    disabled={isSavingFeatures}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Ativar Todas
                  </button>
                </div>
              </div>
            </div>

            {/* Grid dos 8 recursos administráveis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Leitor literário */}
              <FeatureCard
                icon={<BookOpen className="w-5 h-5 text-indigo-500" />}
                name="Leitor Literário"
                description="Permite a leitura imersiva das obras e capítulos cadastrados na biblioteca digital."
                enabled={features.literaryReader}
                isDark={isDark}
                isSaving={isSavingFeatures}
                onToggle={() => handleToggleFeature('literaryReader')}
                dependencyNotice="Se desativado, o acesso ao texto dos livros é temporariamente pausado."
              />

              {/* 2. Bíblia integrada */}
              <FeatureCard
                icon={<BookCheck className="w-5 h-5 text-amber-500" />}
                name="Bíblia Integrada"
                description="Acesso aos 66 livros da Bíblia Sagrada (BLIVRE) e abertura interativa de passagens bíblicas citadas."
                enabled={features.integratedBible}
                isDark={isDark}
                isSaving={isSavingFeatures}
                onToggle={() => handleToggleFeature('integratedBible')}
                dependencyNotice="Se desativada, os botões e links de abertura da Bíblia são ocultados do leitor."
              />

              {/* 3. Perguntas para reflexão */}
              <FeatureCard
                icon={<HelpCircle className="w-5 h-5 text-emerald-500" />}
                name="Perguntas para Reflexão"
                description="Seção interativa de meditação ao término dos capítulos com salvamento de anotações pessoais do leitor."
                enabled={features.reflectionQuestions}
                isDark={isDark}
                isSaving={isSavingFeatures}
                onToggle={() => handleToggleFeature('reflectionQuestions')}
                dependencyNotice="Respostas já salvas pelos leitores permanecem protegidas e não são apagadas."
              />

              {/* 4. Progresso e retomada da leitura */}
              <FeatureCard
                icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
                name="Progresso e Retomada de Leitura"
                description="Barra de avanço percentual em tempo real no topo do capítulo e restauração da posição exata da rolagem."
                enabled={features.readingProgress}
                isDark={isDark}
                isSaving={isSavingFeatures}
                onToggle={() => handleToggleFeature('readingProgress')}
              />

              {/* 5. Marcadores e favoritos */}
              <FeatureCard
                icon={<Bookmark className="w-5 h-5 text-rose-500" />}
                name="Marcadores e Favoritos"
                description="Permite aos leitores marcar parágrafos favoritos e gerenciar passagens destacadas na barra de ferramentas."
                enabled={features.bookmarks}
                isDark={isDark}
                isSaving={isSavingFeatures}
                onToggle={() => handleToggleFeature('bookmarks')}
                dependencyNotice="Os marcadores dos leitores continuam preservados no dispositivo ao desativar."
              />

              {/* 6. Pesquisa de conteúdo */}
              <FeatureCard
                icon={<Search className="w-5 h-5 text-cyan-500" />}
                name="Pesquisa de Conteúdo"
                description="Campo de busca rápida com contagem de ocorrências e destaque visual no corpo do capítulo."
                enabled={features.search}
                isDark={isDark}
                isSaving={isSavingFeatures}
                onToggle={() => handleToggleFeature('search')}
              />

              {/* 7. Áudio e velocidade de leitura */}
              <FeatureCard
                icon={<Volume2 className="w-5 h-5 text-violet-500" />}
                name="Áudio e Velocidade de Leitura"
                description="Narração do texto em voz alta com reprodução contínua e seletores de velocidade (0.75x a 1.75x)."
                enabled={features.audioReading}
                isDark={isDark}
                isSaving={isSavingFeatures}
                onToggle={() => handleToggleFeature('audioReading')}
              />

              {/* 8. Alternância entre tema claro e escuro */}
              <FeatureCard
                icon={<Palette className="w-5 h-5 text-amber-600" />}
                name="Alternância entre Tema Claro e Escuro"
                description="Seletor de temas (Papel, Creme, Sépia, Noturno) e escala tipográfica personalizável para o leitor."
                enabled={features.themeToggle}
                isDark={isDark}
                isSaving={isSavingFeatures}
                onToggle={() => handleToggleFeature('themeToggle')}
              />
            </div>
          </section>
        )}

        {/* =========================================================================
            ABA 2: LIVROS E CAPÍTULOS
            ========================================================================= */}
        {activeTab === 'books' && (
          <section className="space-y-6 animate-in fade-in duration-200">
            {/* Header da seção */}
            <div
              className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-zinc-50">
                      Livros e Capítulos
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 font-serif max-w-2xl leading-relaxed">
                    Escolha individualmente quais livros e quais capítulos ficam disponíveis aos leitores.
                    Se um livro for desativado, nenhum dos seus capítulos poderá ser lido.
                  </p>
                </div>

                <div className="text-xs text-stone-500 dark:text-zinc-400 font-mono">
                  Total no acervo: {libraryBooks.length} livro(s)
                </div>
              </div>
            </div>

            {/* Listagem dos livros do catálogo */}
            <div className="space-y-4">
              {libraryBooks.map((book) => {
                const bookConfig = contentAvailability.books[book.id] || {
                  enabled: true,
                  chapters: {},
                };
                const isBookEnabled = bookConfig.enabled !== false;
                const isExpanded = Boolean(expandedBookIds[book.id]);

                // Contagem de capítulos ativos
                const enabledChaptersCount = book.chapters.filter((ch) => {
                  const chVal = bookConfig.chapters?.[ch.id];
                  return chVal !== false;
                }).length;

                return (
                  <div
                    key={book.id}
                    className={`rounded-2xl border transition-all ${
                      isDark
                        ? 'bg-zinc-900/90 border-zinc-800'
                        : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
                    {/* Linha principal do livro */}
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            isBookEnabled
                              ? isDark
                                ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                                : 'bg-stone-100 text-stone-800 border border-stone-200'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 opacity-60'
                          }`}
                        >
                          <BookOpen className="w-6 h-6" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 dark:text-zinc-50">
                              {book.title}
                            </h3>
                            <span
                              className={`text-[11px] font-sans px-2.5 py-0.5 rounded-full font-medium ${
                                isBookEnabled
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {isBookEnabled ? 'Disponível' : 'Indisponível'}
                            </span>
                          </div>

                          <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif">
                            Autor: <strong>{book.author}</strong> {book.genre ? `• ${book.genre}` : ''}
                          </p>

                          {book.synopsis && (
                            <p className="text-xs text-stone-600 dark:text-zinc-300 font-serif mt-1 max-w-xl line-clamp-2">
                              {book.synopsis}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-xs text-stone-400 dark:text-zinc-500 font-sans">
                            <span>
                              Capítulos liberados: <strong>{enabledChaptersCount} de {book.chapters.length}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações do livro */}
                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        {/* Toggle do livro */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-stone-600 dark:text-zinc-400 hidden md:inline">
                            {isBookEnabled ? 'Livro Ativo' : 'Livro Pausado'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isBookEnabled}
                            onClick={() => handleToggleBook(book.id)}
                            disabled={isSavingContent}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-amber-400 ${
                              isBookEnabled ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-stone-300 dark:bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                isBookEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Botão de expansão dos capítulos */}
                        <button
                          type="button"
                          onClick={() => toggleAccordion(book.id)}
                          className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Recolher' : 'Capítulos'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Área Expandida de Capítulos */}
                    {isExpanded && (
                      <div className="border-t border-stone-100 dark:border-zinc-800/80 p-5 sm:p-6 bg-stone-50/50 dark:bg-zinc-950/40 rounded-b-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200/60 dark:border-zinc-800">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                            Capítulos do Livro ({book.chapters.length})
                          </h4>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleBatchChapters(book, true)}
                              disabled={isSavingContent}
                              className="text-xs text-stone-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 underline cursor-pointer"
                            >
                              Liberar Todos
                            </button>
                            <span className="text-stone-300 dark:text-zinc-700">•</span>
                            <button
                              type="button"
                              onClick={() => handleBatchChapters(book, false)}
                              disabled={isSavingContent}
                              className="text-xs text-stone-600 dark:text-zinc-400 hover:text-rose-700 dark:hover:text-rose-400 underline cursor-pointer"
                            >
                              Bloquear Todos
                            </button>
                          </div>
                        </div>

                        {!isBookEnabled && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                            <Info className="w-4 h-4 shrink-0" />
                            <span>
                              Como este livro está desativado como um todo, seus capítulos não serão acessíveis aos leitores até que o livro seja ativado acima.
                            </span>
                          </div>
                        )}

                        <div className="space-y-2.5">
                          {book.chapters.length === 0 ? (
                            <div className="p-5 rounded-xl border border-dashed border-stone-300 dark:border-zinc-700 text-center py-6 bg-white/60 dark:bg-zinc-900/60">
                              <BookOpen className="w-5 h-5 mx-auto mb-2 text-stone-400 dark:text-zinc-500" />
                              <p className="text-xs font-serif font-medium text-stone-700 dark:text-zinc-300">
                                Nenhum capítulo publicado até o momento.
                              </p>
                              <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                                Obra em preparação editorial pelo autor Pr. Fernando Veiga. A Inteligência Artificial não inventa conteúdo fictício.
                              </p>
                            </div>
                          ) : (
                            book.chapters.map((chapter) => {
                              const isChapterEnabled =
                                bookConfig.chapters?.[chapter.id] !== false;

                              return (
                                <div
                                  key={chapter.id}
                                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                    isChapterEnabled
                                      ? isDark
                                        ? 'bg-zinc-900 border-zinc-800'
                                        : 'bg-white border-stone-200'
                                      : isDark
                                      ? 'bg-zinc-900/40 border-zinc-800/50 opacity-60'
                                      : 'bg-stone-100/70 border-stone-200/70 opacity-70'
                                  }`}
                                >
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-serif italic text-stone-500 dark:text-zinc-400">
                                        {chapter.romanNumber || `Capítulo ${chapter.number}`}
                                      </span>
                                      <span className="text-stone-300 dark:text-zinc-700">•</span>
                                      <span className="text-sm font-serif font-bold text-stone-900 dark:text-zinc-100">
                                        {chapter.title}
                                      </span>
                                      {chapter.status === 'awaiting_publication' && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                                          Aguardando Texto Integral
                                        </span>
                                      )}
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                          isChapterEnabled
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                        }`}
                                      >
                                        {isChapterEnabled ? 'Liberado' : 'Indisponível'}
                                      </span>
                                    </div>

                                  {chapter.subtitle && (
                                    <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif mt-0.5">
                                      {chapter.subtitle}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-stone-400 dark:text-zinc-500">
                                    <span>
                                      {chapter.content?.length || 0} parágrafos integrais
                                    </span>
                                    {chapter.biblicalTexts && (
                                      <span>• {chapter.biblicalTexts.length} passagens bíblicas</span>
                                    )}
                                    {chapter.reflectionQuestions && (
                                      <span>• {chapter.reflectionQuestions.length} perguntas</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  <span className="text-xs font-medium text-stone-600 dark:text-zinc-400">
                                    {isChapterEnabled ? 'Liberado' : 'Bloqueado'}
                                  </span>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isChapterEnabled}
                                    onClick={() => handleToggleChapter(book.id, chapter.id)}
                                    disabled={isSavingContent}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-amber-400 ${
                                      isChapterEnabled ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-stone-300 dark:bg-zinc-700'
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                        isChapterEnabled ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            );
                          }))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================================
            ABA 3: SEGURANÇA E ACESSO
            ========================================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. STATUS GERAL DO SISTEMA */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-zinc-800">
                <div>
                  <h2 className="text-base font-serif font-bold text-stone-900 dark:text-zinc-50 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Estado do Sistema de Acesso
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans mt-0.5">
                    Persistência ativa em arquivo seguro (<code className="font-mono text-[11px]">security-config.json</code>)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      status?.isLibraryLocked
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        status?.isLibraryLocked ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                      }`}
                    />
                    {status?.isLibraryLocked ? 'Acesso Bloqueado' : 'Acesso Liberado com PIN'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 block mb-1">
                    Sessões Ativas de Leitores
                  </span>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-stone-600 dark:text-zinc-300" />
                    <span className="text-lg font-bold text-stone-900 dark:text-zinc-100">
                      {status?.activeReaderSessionsCount ?? 0}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 block mb-1">
                    Última Alteração do PIN
                  </span>
                  <span className="text-xs font-medium text-stone-800 dark:text-zinc-200 block truncate">
                    {formatDate(status?.lastPinChangedAt)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 block mb-1">
                    Última Revogação Global
                  </span>
                  <span className="text-xs font-medium text-stone-800 dark:text-zinc-200 block truncate">
                    {formatDate(status?.lastRevokedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. ALTERAÇÃO DO PIN DOS LEITORES */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-base font-serif font-bold text-stone-900 dark:text-zinc-50">
                  Alterar PIN Compartilhado dos Leitores
                </h2>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif leading-relaxed mb-5">
                Defina um novo PIN para o grupo de leitores. A nova senha será salva de forma persistente com criptografia PBKDF2 e salt único.
              </p>

              <form onSubmit={handleRequestPinChange} className="space-y-4 max-w-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5">
                      Novo PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="Ex: 2025"
                        required
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm border font-mono tracking-wider transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400'
                            : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-stone-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        tabIndex={-1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        aria-label={showNewPin ? 'Ocultar PIN' : 'Exibir PIN'}
                      >
                        {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5">
                      Confirmar Novo PIN
                    </label>
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="Repita o novo PIN"
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-mono tracking-wider transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-stone-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="revokeOnPinChange"
                    checked={revokeOnPinChange}
                    onChange={(e) => setRevokeOnPinChange(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-amber-500 text-amber-500 cursor-pointer"
                  />
                  <label
                    htmlFor="revokeOnPinChange"
                    className="text-xs text-stone-600 dark:text-zinc-300 font-sans cursor-pointer select-none"
                  >
                    Desconectar todas as sessões existentes imediatamente (exigir o novo PIN agora)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPin || !newPin.trim() || !confirmPin.trim()}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-stone-50 dark:text-zinc-950 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isUpdatingPin ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando Novo PIN...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar e Aplicar Novo PIN</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 3. BLOQUEIO TEMPORÁRIO E REVOGAÇÃO GLOBAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Controle de Bloqueio Geral */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {status?.isLibraryLocked ? (
                    <Lock className="w-5 h-5 text-rose-500" />
                  ) : (
                    <Unlock className="w-5 h-5 text-emerald-500" />
                  )}
                  <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-zinc-50">
                    Acesso Geral à Biblioteca
                  </h3>
                </div>
                <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif leading-relaxed mb-4">
                  Bloqueie instantaneamente novos acessos de leitores sem alterar o PIN. Útil durante manutenções ou pausas no teste.
                </p>

                {status?.isLibraryLocked ? (
                  <button
                    onClick={() => handleToggleLock(false)}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Liberar Acessos à Biblioteca</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleLock(true)}
                    className="w-full py-2.5 px-3 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Bloquear Temporariamente Novos Acessos</span>
                  </button>
                )}
              </div>

              {/* Controle de Revogação de Sessões */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-zinc-50">
                    Revogação Global de Sessões
                  </h3>
                </div>
                <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif leading-relaxed mb-4">
                  Invalida todos os tokens ativos no servidor. Todos os leitores atualmente conectados serão obrigados a digitar o PIN novamente.
                </p>

                <button
                  onClick={handleRevokeAllSessions}
                  className="w-full py-2.5 px-3 rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Desconectar Todos os Leitores Agora</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 4: APLICATIVO MÓVEL (PWA)
            ========================================================================= */}
        {activeTab === 'pwa' && (
          <section className="space-y-6 animate-in fade-in duration-200 font-sans">
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-zinc-50">
                      Configuração do Aplicativo Móvel (PWA)
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif">
                      Instalação como aplicativo nativo no Android (Chrome) e iOS (Safari).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <PWAInstallButton theme={theme} variant="header" />
                </div>
              </div>

              {/* Informações de conformidade do PWA */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-black/5 dark:bg-zinc-800/50 border border-black/5 dark:border-zinc-700/50">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 block">
                    Nome Oficial
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-zinc-100 mt-1 block">
                    Biblioteca Digital
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-zinc-500 mt-0.5 block">
                    Nome curto: "Biblioteca" (≤ 12 carac.)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/5 dark:bg-zinc-800/50 border border-black/5 dark:border-zinc-700/50">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 block">
                    Modo de Exibição
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    Standalone (Janela Própria)
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-zinc-500 mt-0.5 block">
                    Sem abas ou barra de navegação
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/5 dark:bg-zinc-800/50 border border-black/5 dark:border-zinc-700/50">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 block">
                    Ícones Configurados
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-zinc-100 mt-1 block">
                    192px, 512px e Maskable
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-zinc-500 mt-0.5 block">
                    + apple-touch-icon (180px PNG)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/5 dark:bg-zinc-800/50 border border-black/5 dark:border-zinc-700/50">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 block">
                    Cache Offline (Service Worker)
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    Ativo (Workbox)
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-zinc-500 mt-0.5 block">
                    Precache de livros, bíblia e fontes
                  </span>
                </div>
              </div>

              {/* Guia de Instalação e Testes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/30">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">✓</span>
                    Android (Google Chrome)
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed font-serif">
                    Ao acessar a biblioteca no Chrome para Android, o banner de instalação ou o botão "Instalar App" no cabeçalho aciona o diálogo nativo do sistema para fixação do aplicativo na tela inicial do celular.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/30">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">✓</span>
                    iOS (Apple Safari)
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed font-serif">
                    No Safari do iPhone/iPad, o botão exibe as instruções guiadas de 2 passos: tocar em <strong>Compartilhar</strong> e selecionar <strong>"Adicionar à Tela de Início"</strong>. O ícone oficial e tela cheia são ativados automaticamente.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* MODAL DE CONFIRMAÇÃO DE AÇÃO CRÍTICA */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.variant === 'danger'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                    : confirmModal.variant === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    : 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-amber-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-zinc-50">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-300 font-serif leading-relaxed mb-6">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmModal.action()}
                className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-colors cursor-pointer shadow-xs ${
                  confirmModal.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-stone-800 hover:bg-stone-900 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-zinc-950'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente do Cartão de Funcionalidade Individual
interface FeatureCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  enabled: boolean;
  isDark: boolean;
  isSaving: boolean;
  onToggle: () => void;
  dependencyNotice?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  name,
  description,
  enabled,
  isDark,
  isSaving,
  onToggle,
  dependencyNotice,
}) => {
  return (
    <div
      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
        isDark
          ? enabled
            ? 'bg-zinc-900/90 border-zinc-800 shadow-xs'
            : 'bg-zinc-900/40 border-zinc-800/60 opacity-75'
          : enabled
          ? 'bg-white border-stone-200 shadow-xs'
          : 'bg-stone-50 border-stone-200/70 opacity-75'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">{icon}</div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900 dark:text-zinc-50">
              {name}
            </h3>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-sans px-2 py-0.5 rounded-full font-medium ${
                enabled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-stone-200 text-stone-700 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {enabled ? 'Ativado' : 'Desativado'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={isSaving}
              onClick={onToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-amber-400 ${
                enabled ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-stone-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <p className="text-xs text-stone-600 dark:text-zinc-400 font-serif leading-relaxed mt-1">
          {description}
        </p>
      </div>

      {dependencyNotice && (
        <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 text-[11px] text-stone-400 dark:text-zinc-500 font-sans flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span>{dependencyNotice}</span>
        </div>
      )}
    </div>
  );
};
