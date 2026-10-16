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
  UserCheck,
  UserX,
  UserPlus,
  Trash2,
  Copy,
  Calendar,
  Sparkles,
  Clock,
  Printer,
  FileSpreadsheet,
  ExternalLink,
  MessageCircle,
  Database,
  Cloud,
  Server,
  CheckCheck,
  Ban,
} from 'lucide-react';
import { adminAuthService, AdminSystemStatus } from '../services/adminAuthService';
import {
  ReadingTheme,
  LibraryFeaturesConfig,
  ContentAvailabilityConfig,
  DEFAULT_LIBRARY_FEATURES,
  Book,
  ReaderAccessRecord,
  ReaderAccessStatus,
  ReaderContentPermissions,
  ReaderBookPermission,
} from '../types/book';
import { libraryBooks } from '../data/booksCatalog';
import { PWAInstallButton } from './PWAInstallButton';
import { calculateDetailedAge, standardizePin } from '../utils/textFormatters';

interface AdminPanelProps {
  theme?: ReadingTheme;
  onNavigateToLibrary: () => void;
}

type AdminTab = 'readers' | 'features' | 'books' | 'security' | 'credentials' | 'pwa';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  theme = 'cream',
  onNavigateToLibrary,
}) => {
  // Aba ativa do painel
  const [activeTab, setActiveTab] = useState<AdminTab>('readers');

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

  // GESTÃO DOS ACESSOS DOS LEITORES
  const [readers, setReaders] = useState<ReaderAccessRecord[]>([]);
  const [isLoadingReaders, setIsLoadingReaders] = useState<boolean>(false);
  const [newReaderName, setNewReaderName] = useState<string>('');
  const [pinMode, setPinMode] = useState<'auto' | 'manual'>('auto');
  const [customPinInput, setCustomPinInput] = useState<string>('');
  const [readerNotes, setReaderNotes] = useState<string>('');
  const [readerExpiryDays, setReaderExpiryDays] = useState<string>('never'); // 'never', '7', '30', '90', 'custom'
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [isCreatingReader, setIsCreatingReader] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'revoked'>('all');
  const [registrationFilter, setRegistrationFilter] = useState<'all' | 'registered' | 'pending'>('all');
  const [selectedReaderDetails, setSelectedReaderDetails] = useState<ReaderAccessRecord | null>(null);

  // Permissões de Livros e Capítulos na Ficha Cadastral do Leitor
  const [readerContentPermissions, setReaderContentPermissions] = useState<ReaderContentPermissions>({
    books: {},
  });
  const [isSavingReaderPermissions, setIsSavingReaderPermissions] = useState<boolean>(false);
  const [permissionsSuccessMessage, setPermissionsSuccessMessage] = useState<string | null>(null);

  // Permissões opcionais ao cadastrar Novo Leitor
  const [newReaderPermissions, setNewReaderPermissions] = useState<ReaderContentPermissions | null>(null);
  const [showNewReaderPermissionsToggle, setShowNewReaderPermissionsToggle] = useState<boolean>(false);

  // Status e sincronização do Firebase Cloud Firestore
  const [firebaseStatus, setFirebaseStatus] = useState<{
    isConnected: boolean;
    type: string;
    mode: string;
    projectId: string;
    databaseId: string;
    totalReadersInFirestore?: number;
    backupFileExists: boolean;
  } | null>(null);
  const [isMigratingFirebase, setIsMigratingFirebase] = useState<boolean>(false);

  // Modal de Exibição Única e Segura do PIN Recém-Criado ou Redefinido
  const [createdPinModal, setCreatedPinModal] = useState<{
    isOpen: boolean;
    readerName: string;
    pin: string;
    copied: boolean;
    title?: string;
    subtitle?: string;
  }>({
    isOpen: false,
    readerName: '',
    pin: '',
    copied: false,
  });

  // Modal de Redefinição de PIN do Leitor
  const [resetPinModal, setResetPinModal] = useState<{
    isOpen: boolean;
    reader: ReaderAccessRecord | null;
    pinMode: 'auto' | 'manual';
    customPin: string;
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    reader: null,
    pinMode: 'auto',
    customPin: '',
    isSubmitting: false,
    error: null,
  });

  // Formulário de Alteração de PIN Geral/Legado
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [revokeOnPinChange, setRevokeOnPinChange] = useState<boolean>(true);
  const [isUpdatingPin, setIsUpdatingPin] = useState<boolean>(false);

  // Formulário de Alteração de Credenciais do Administrador (Login e Senha)
  const [currentAdminPasswordInput, setCurrentAdminPasswordInput] = useState<string>('');
  const [newAdminUsernameInput, setNewAdminUsernameInput] = useState<string>('');
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState<string>('');
  const [confirmAdminPasswordInput, setConfirmAdminPasswordInput] = useState<string>('');
  const [showAdminPassToggle, setShowAdminPassToggle] = useState<boolean>(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState<boolean>(false);
  const [credentialsSuccessMessage, setCredentialsSuccessMessage] = useState<string | null>(null);
  const [credentialsErrorMessage, setCredentialsErrorMessage] = useState<string | null>(null);

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
        chapters: {
          'capitulo-1': true,
        },
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

  // Carrega status detalhado do Firebase Cloud Firestore
  const fetchFirebaseStatus = async () => {
    try {
      const res = await adminAuthService.getFirebaseStatus();
      if (res.success && res.status) {
        setFirebaseStatus(res.status);
      }
    } catch {
      // Ignora erro
    }
  };

  const handleMigrateFirebase = async () => {
    setIsMigratingFirebase(true);
    setActionErrorMessage(null);
    try {
      const res = await adminAuthService.triggerFirebaseMigration();
      if (res.success) {
        setActionSuccessMessage(res.message || 'Sincronização com Cloud Firestore concluída!');
        await fetchFirebaseStatus();
        await fetchReaders();
      } else {
        setActionErrorMessage(res.error || res.message || 'Falha ao sincronizar com o Firebase.');
      }
    } catch {
      setActionErrorMessage('Erro de conexão ao sincronizar com o Firebase.');
    } finally {
      setIsMigratingFirebase(false);
    }
  };

  // Carrega lista de leitores cadastrados
  const fetchReaders = async () => {
    setIsLoadingReaders(true);
    try {
      const res = await adminAuthService.getReaders();
      if (res.success && res.readers) {
        setReaders(res.readers);
      }
      await fetchFirebaseStatus();
    } catch {
      console.warn('Erro ao carregar lista de leitores');
    } finally {
      setIsLoadingReaders(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      fetchReaders();
      fetchFirebaseStatus();
    }
  }, [isAuthenticated]);

  // Criação de novo PIN de Leitor
  const handleCreateReader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReaderName.trim()) {
      setActionErrorMessage('Informe o nome ou identificador do leitor.');
      return;
    }

    if (pinMode === 'manual') {
      const pin = standardizePin(customPinInput);
      if (pin.length < 4 || pin.length > 12) {
        setActionErrorMessage('O PIN manual deve conter entre 4 e 12 dígitos ou caracteres (sem espaços).');
        return;
      }
    }

    // Calcula data de expiração
    let calculatedExpiresAt: string | null = null;
    if (readerExpiryDays === 'custom' && customExpiryDate) {
      calculatedExpiresAt = new Date(customExpiryDate).toISOString();
    } else if (readerExpiryDays !== 'never') {
      const days = parseInt(readerExpiryDays, 10);
      if (!isNaN(days) && days > 0) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        calculatedExpiresAt = d.toISOString();
      }
    }

    setIsCreatingReader(true);
    setActionErrorMessage(null);

    try {
      const res = await adminAuthService.createReaderAccess({
        name: newReaderName.trim(),
        pinMode,
        customPin: pinMode === 'manual' ? standardizePin(customPinInput) : undefined,
        expiresAt: calculatedExpiresAt,
        notes: readerNotes.trim() || undefined,
        contentPermissions: newReaderPermissions || undefined,
      });

      if (res.success && res.result) {
        // Exibe o PIN na modal de visualização única
        setCreatedPinModal({
          isOpen: true,
          readerName: res.result.access.name,
          pin: res.result.pin,
          copied: false,
        });

        // Limpa formulário
        setNewReaderName('');
        setCustomPinInput('');
        setReaderNotes('');
        setReaderExpiryDays('never');
        setCustomExpiryDate('');
        setPinMode('auto');
        setNewReaderPermissions(null);
        setShowNewReaderPermissionsToggle(false);

        setActionSuccessMessage(`Acesso criado com sucesso para "${res.result.access.name}".`);
        await fetchReaders();
        await fetchStatus();
      } else {
        setActionErrorMessage(res.error || 'Falha ao criar acesso de leitor.');
      }
    } catch {
      setActionErrorMessage('Erro de rede ao criar acesso de leitor.');
    } finally {
      setIsCreatingReader(false);
    }
  };

  // Sincroniza permissões ao abrir a Ficha Cadastral do Leitor
  useEffect(() => {
    if (!selectedReaderDetails) {
      setPermissionsSuccessMessage(null);
      return;
    }

    const initialPerms: ReaderContentPermissions = { books: {} };
    libraryBooks.forEach((book) => {
      const readerBook = selectedReaderDetails.contentPermissions?.books?.[book.id];
      const chMap: Record<string, boolean> = {};
      book.chapters.forEach((ch) => {
        chMap[ch.id] = readerBook?.chapters?.[ch.id] !== false;
      });
      initialPerms.books[book.id] = {
        enabled: readerBook?.enabled !== false,
        chapters: chMap,
      };
    });

    setReaderContentPermissions(initialPerms);
    setPermissionsSuccessMessage(null);
  }, [selectedReaderDetails]);

  // Alterna disponibilidade do livro para o leitor na ficha cadastral
  const handleToggleReaderBook = (bookId: string) => {
    setReaderContentPermissions((prev) => {
      const current = prev.books[bookId] || { enabled: true, chapters: {} };
      const nextEnabled = !current.enabled;
      return {
        ...prev,
        books: {
          ...prev.books,
          [bookId]: {
            ...current,
            enabled: nextEnabled,
          },
        },
      };
    });
  };

  // Alterna disponibilidade do capítulo para o leitor na ficha cadastral
  const handleToggleReaderChapter = (bookId: string, chapterId: string) => {
    setReaderContentPermissions((prev) => {
      const currentBook = prev.books[bookId] || { enabled: true, chapters: {} };
      const currentChapters = currentBook.chapters || {};
      const nextChapterState = !(currentChapters[chapterId] !== false);
      return {
        ...prev,
        books: {
          ...prev.books,
          [bookId]: {
            ...currentBook,
            chapters: {
              ...currentChapters,
              [chapterId]: nextChapterState,
            },
          },
        },
      };
    });
  };

  // Libera todos os livros e capítulos para o leitor na ficha cadastral
  const handleAllowAllContentForReader = () => {
    const allAllowed: ReaderContentPermissions = { books: {} };
    libraryBooks.forEach((b) => {
      const chMap: Record<string, boolean> = {};
      b.chapters.forEach((c) => {
        chMap[c.id] = true;
      });
      allAllowed.books[b.id] = { enabled: true, chapters: chMap };
    });
    setReaderContentPermissions(allAllowed);
  };

  // Bloqueia todos os livros e capítulos para o leitor na ficha cadastral
  const handleBlockAllContentForReader = () => {
    const allBlocked: ReaderContentPermissions = { books: {} };
    libraryBooks.forEach((b) => {
      const chMap: Record<string, boolean> = {};
      b.chapters.forEach((c) => {
        chMap[c.id] = false;
      });
      allBlocked.books[b.id] = { enabled: false, chapters: chMap };
    });
    setReaderContentPermissions(allBlocked);
  };

  // Salva as permissões do leitor no servidor e Firestore
  const handleSaveReaderPermissions = async () => {
    if (!selectedReaderDetails) return;
    setIsSavingReaderPermissions(true);
    setPermissionsSuccessMessage(null);
    try {
      const res = await adminAuthService.updateReaderPermissions(
        selectedReaderDetails.id,
        readerContentPermissions
      );
      if (res.success && res.access) {
        setSelectedReaderDetails(res.access);
        setReaders((prev) => prev.map((r) => (r.id === res.access!.id ? res.access! : r)));
        setPermissionsSuccessMessage('Permissões de livros e capítulos atualizadas e salvas com sucesso!');
        setTimeout(() => setPermissionsSuccessMessage(null), 4000);
      } else {
        setActionErrorMessage(res.error || 'Erro ao atualizar permissões do leitor.');
      }
    } catch {
      setActionErrorMessage('Erro de conexão ao salvar permissões do leitor.');
    } finally {
      setIsSavingReaderPermissions(false);
    }
  };

  // Handlers para o formulário de NOVO LEITOR (pré-configuração opcional)
  const handleToggleNewReaderBook = (bookId: string) => {
    setNewReaderPermissions((prev) => {
      const base: ReaderContentPermissions = prev || { books: {} };
      const currentBook = base.books[bookId] || { enabled: true, chapters: {} };
      return {
        ...base,
        books: {
          ...base.books,
          [bookId]: {
            ...currentBook,
            enabled: !currentBook.enabled,
          },
        },
      };
    });
  };

  const handleToggleNewReaderChapter = (bookId: string, chapterId: string) => {
    setNewReaderPermissions((prev) => {
      const base: ReaderContentPermissions = prev || { books: {} };
      const currentBook = base.books[bookId] || { enabled: true, chapters: {} };
      const curChapters = currentBook.chapters || {};
      return {
        ...base,
        books: {
          ...base.books,
          [bookId]: {
            ...currentBook,
            chapters: {
              ...curChapters,
              [chapterId]: !(curChapters[chapterId] !== false),
            },
          },
        },
      };
    });
  };

  // Alteração de estado de leitor (bloquear / reativar / revogar) com confirmação
  const handleUpdateReaderStatus = (reader: ReaderAccessRecord, targetStatus: ReaderAccessStatus) => {
    const actionLabel =
      targetStatus === 'blocked' ? 'Bloquear' : targetStatus === 'active' ? 'Reativar' : 'Revogar';

    setConfirmModal({
      isOpen: true,
      title: `${actionLabel} Acesso de "${reader.name}"?`,
      description:
        targetStatus === 'blocked'
          ? `O leitor "${reader.name}" não conseguirá mais entrar na biblioteca até ser reativado. Sua sessão atual será encerrada imediatamente.`
          : targetStatus === 'revoked'
          ? `O PIN do leitor "${reader.name}" será permanentemente invalidado e revogado no servidor.`
          : `O leitor "${reader.name}" voltará a ter acesso normal com seu PIN cadastrado.`,
      confirmText: `Sim, ${actionLabel}`,
      variant: targetStatus === 'revoked' ? 'danger' : targetStatus === 'blocked' ? 'warning' : 'primary',
      action: async () => {
        try {
          const res = await adminAuthService.updateReaderStatus(reader.id, targetStatus);
          if (res.success) {
            setActionSuccessMessage(res.message || `Acesso de "${reader.name}" atualizado.`);
            await fetchReaders();
            await fetchStatus();
          } else {
            setActionErrorMessage(res.error || 'Falha ao alterar estado do acesso.');
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Exclusão definitiva de leitor
  const handleDeleteReader = (reader: ReaderAccessRecord) => {
    setConfirmModal({
      isOpen: true,
      title: `Excluir Registro de "${reader.name}"?`,
      description: `Esta ação removerá definitivamente o cadastro de "${reader.name}". Qualquer sessão associada será encerrada.`,
      confirmText: 'Sim, Excluir Registro',
      variant: 'danger',
      action: async () => {
        try {
          const res = await adminAuthService.deleteReaderAccess(reader.id);
          if (res.success) {
            setActionSuccessMessage(res.message || `Registro de "${reader.name}" excluído.`);
            await fetchReaders();
            await fetchStatus();
          } else {
            setActionErrorMessage(res.error || 'Falha ao excluir registro.');
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Abrir modal de redefinição de PIN
  const handleOpenResetPinModal = (reader: ReaderAccessRecord) => {
    setResetPinModal({
      isOpen: true,
      reader,
      pinMode: 'auto',
      customPin: '',
      isSubmitting: false,
      error: null,
    });
  };

  // Confirmar redefinição de PIN
  const handleConfirmResetPin = async () => {
    if (!resetPinModal.reader) return;

    if (resetPinModal.pinMode === 'manual') {
      const pin = standardizePin(resetPinModal.customPin);
      if (pin.length < 4 || pin.length > 12) {
        setResetPinModal((prev) => ({
          ...prev,
          error: 'O PIN manual deve conter entre 4 e 12 dígitos ou caracteres (sem espaços).',
        }));
        return;
      }
    }

    setResetPinModal((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const res = await adminAuthService.resetReaderPin(resetPinModal.reader.id, {
        pinMode: resetPinModal.pinMode,
        customPin: resetPinModal.pinMode === 'manual' ? standardizePin(resetPinModal.customPin) : undefined,
      });

      if (res.success && res.result) {
        const readerName = res.result.access.name;
        const assignedPin = res.result.pin;

        // Fecha modal de redefinição e ficha se estiver aberta
        setResetPinModal({
          isOpen: false,
          reader: null,
          pinMode: 'auto',
          customPin: '',
          isSubmitting: false,
          error: null,
        });
        setSelectedReaderDetails(null);

        // Exibe o novo PIN na modal segura de exibição única
        setCreatedPinModal({
          isOpen: true,
          readerName,
          pin: assignedPin,
          copied: false,
          title: 'PIN Redefinido com Sucesso!',
          subtitle: 'O código anterior foi invalidado. Copie o novo PIN abaixo para entregar ao leitor:',
        });

        setActionSuccessMessage(`PIN do leitor "${readerName}" redefinido com sucesso.`);
        await fetchReaders();
        await fetchStatus();
      } else {
        setResetPinModal((prev) => ({
          ...prev,
          isSubmitting: false,
          error: res.error || 'Falha ao redefinir o PIN.',
        }));
      }
    } catch {
      setResetPinModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: 'Erro de conexão ao redefinir o PIN.',
      }));
    }
  };

  // Limpeza de todos os leitores (inclusive testes)
  const handleClearAllReaders = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Todos os Cadastros de Leitores?',
      description: `Esta ação removerá PERMANENTEMENTE todos os ${readers.length} leitores cadastrados (inclusive testes e reais) do banco de dados Cloud Firestore e do servidor, encerrando todas as sessões ativas. Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, Limpar Todos os Cadastros',
      variant: 'danger',
      action: async () => {
        try {
          const res = await adminAuthService.clearAllReaders();
          if (res.success) {
            setActionSuccessMessage(res.message || 'Todos os cadastros de leitores foram removidos com sucesso.');
            await fetchReaders();
            await fetchStatus();
          } else {
            setActionErrorMessage(res.error || 'Falha ao limpar cadastros de leitores.');
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

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

  // Alteração de Login e Senha do Administrador
  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsSuccessMessage(null);
    setCredentialsErrorMessage(null);

    if (!currentAdminPasswordInput.trim()) {
      setCredentialsErrorMessage('Por favor, informe a senha atual para confirmar a alteração.');
      return;
    }

    const cleanUser = newAdminUsernameInput.trim();
    const cleanPass = newAdminPasswordInput.trim();
    const cleanConfirm = confirmAdminPasswordInput.trim();

    if (!cleanUser && !cleanPass) {
      setCredentialsErrorMessage('Informe um novo nome de usuário ou uma nova senha para atualizar.');
      return;
    }

    if (cleanUser && cleanUser.length < 3) {
      setCredentialsErrorMessage('O novo nome de usuário deve conter no mínimo 3 caracteres.');
      return;
    }

    if (cleanPass) {
      if (cleanPass.length < 6) {
        setCredentialsErrorMessage('A nova senha deve conter no mínimo 6 caracteres.');
        return;
      }
      if (cleanPass !== cleanConfirm) {
        setCredentialsErrorMessage('A confirmação da nova senha não confere com a nova senha digitada.');
        return;
      }
    }

    setIsUpdatingCredentials(true);
    try {
      const res = await adminAuthService.updateCredentials({
        currentPassword: currentAdminPasswordInput.trim(),
        newUsername: cleanUser || undefined,
        newPassword: cleanPass || undefined,
        confirmNewPassword: cleanConfirm || undefined,
      });

      if (res.success) {
        setCredentialsSuccessMessage(res.message || 'Credenciais atualizadas com sucesso!');
        if (res.username) {
          setAdminUsername(res.username);
        }
        setCurrentAdminPasswordInput('');
        setNewAdminPasswordInput('');
        setConfirmAdminPasswordInput('');
        setNewAdminUsernameInput('');
        await fetchStatus();
      } else {
        setCredentialsErrorMessage(res.error || 'Falha ao atualizar credenciais.');
      }
    } catch {
      setCredentialsErrorMessage('Erro de conexão ao atualizar credenciais do administrador.');
    } finally {
      setIsUpdatingCredentials(false);
    }
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

  const formatBirthDate = (isoDate?: string | null) => {
    if (!isoDate) return '-';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  };

  const getReaderDetailedAge = (birthDate?: string | null) => {
    if (!birthDate) return '-';
    try {
      const res = calculateDetailedAge(birthDate);
      return res.isValid ? res.formatted : '-';
    } catch {
      return '-';
    }
  };

  const handleExportCSV = () => {
    if (!readers || readers.length === 0) {
      return;
    }

    const headers = [
      'ID',
      'Nome Completo',
      'Telefone Celular (WhatsApp)',
      'Data de Nascimento',
      'Idade Detalhada',
      'Sexo',
      'Estado Civil',
      'Status do PIN',
      'Cadastro Concluído',
      'Data de Criação',
      'Último Acesso',
      'Validade',
      'Observações',
    ];

    const escapeCsv = (val: string | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = readers.map((r) => {
      const profile = r.profile;
      const isExpired = r.expiresAt && new Date(r.expiresAt).getTime() < Date.now();
      const statusText =
        r.status === 'active'
          ? isExpired
            ? 'Expirado'
            : 'Ativo'
          : r.status === 'blocked'
          ? 'Bloqueado'
          : 'Revogado';

      return [
        escapeCsv(r.id),
        escapeCsv(profile?.fullName || r.name),
        escapeCsv(profile?.phoneFormatted || (profile?.phone ? profile.phone : 'Não informado')),
        escapeCsv(profile?.birthDate ? formatBirthDate(profile.birthDate) : 'Não informado'),
        escapeCsv(profile?.birthDate ? getReaderDetailedAge(profile.birthDate) : 'Não informado'),
        escapeCsv(profile?.gender || 'Não informado'),
        escapeCsv(profile?.maritalStatus || 'Não informado'),
        escapeCsv(statusText),
        escapeCsv(r.hasProfile && profile ? 'Sim' : 'Pendente'),
        escapeCsv(formatDate(r.createdAt)),
        escapeCsv(r.lastUsedAt ? formatDate(r.lastUsedAt) : 'Ainda não acessou'),
        escapeCsv(r.expiresAt ? formatDate(r.expiresAt) : 'Permanente'),
        escapeCsv(r.notes || ''),
      ].join(';');
    });

    // BOM UTF-8 (\uFEFF) para abrir com acentuação correta no Excel e Google Sheets
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `relatorio_leitores_biblioteca_digital_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
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
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 font-sans ${
                    isDark
                      ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100 focus:border-amber-400'
                      : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
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
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm border transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 font-sans ${
                      isDark
                        ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100 focus:border-amber-400'
                        : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
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
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-stone-400 dark:text-zinc-400 font-sans">
                    Sessão ativa: <strong className="font-semibold text-stone-700 dark:text-zinc-200">{adminUsername || 'Administrador'}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('credentials')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    title="Alterar login e senha do administrador"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Alterar Login/Senha</span>
                  </button>
                </div>
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
            onClick={() => setActiveTab('readers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'readers'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-stone-900 text-stone-50 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Acessos dos Leitores</span>
            {readers.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                {readers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'credentials'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-stone-900 text-stone-50 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-zinc-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Alterar Login e Senha</span>
          </button>

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
            ABA 0: ACESSOS DOS LEITORES (GESTÃO DE PINS INDIVIDUAIS)
            ========================================================================= */}
        {activeTab === 'readers' && (
          <section className="space-y-6 animate-in fade-in duration-200 font-sans">
            {/* Introdução e métricas de leitores */}
            <div
              className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-zinc-50">
                      Acessos dos Leitores
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 font-serif max-w-2xl leading-relaxed">
                    Cadastre leitores, gere ou defina PINs individuais, acompanhe o estado dos acessos,
                    estabeleça validades ou bloqueie e revogue permissões a qualquer momento com validação no servidor.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={fetchReaders}
                    disabled={isLoadingReaders}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Atualizar lista de leitores"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReaders ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>

              {/* Cards de resumo rápido */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-stone-100 dark:border-zinc-800">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200/50 dark:border-zinc-700/50">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 block">Total de Acessos</span>
                  <span className="text-lg font-bold text-stone-900 dark:text-zinc-100 mt-0.5 block font-mono">
                    {readers.length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/30">
                  <span className="text-[11px] font-medium text-sky-700 dark:text-sky-400 block">Cadastrados</span>
                  <span className="text-lg font-bold text-sky-700 dark:text-sky-300 mt-0.5 block font-mono">
                    {readers.filter((r) => r.hasProfile && r.profile).length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-900/30">
                  <span className="text-[11px] font-medium text-violet-700 dark:text-violet-400 block">Aguardando Cadastro</span>
                  <span className="text-lg font-bold text-violet-700 dark:text-violet-300 mt-0.5 block font-mono">
                    {readers.filter((r) => !r.hasProfile || !r.profile).length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block">Ativos</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block font-mono">
                    {readers.filter((r) => r.status === 'active').length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 block">Bloqueados / Revogados</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5 block font-mono">
                    {readers.filter((r) => r.status === 'blocked' || r.status === 'revoked').length}
                  </span>
                </div>
              </div>

              {/* Status e Sincronização com o Firebase Cloud Firestore */}
              <div
                className={`mt-4 p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  firebaseStatus?.isConnected
                    ? isDark
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : isDark
                      ? 'bg-zinc-800/50 border-zinc-700 text-zinc-300'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      firebaseStatus?.isConnected
                        ? isDark
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[13px] text-stone-900 dark:text-zinc-100 flex items-center gap-1.5">
                        Banco de Dados: Firebase Cloud Firestore
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            firebaseStatus?.isConnected
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              firebaseStatus?.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                          />
                          {firebaseStatus?.isConnected ? 'Persistência em Nuvem Conectada' : 'Contingência Local'}
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                      {firebaseStatus?.isConnected
                        ? `Projeto: ${firebaseStatus.projectId} • Banco: ${firebaseStatus.databaseId} • ${
                            firebaseStatus.totalReadersInFirestore !== undefined
                              ? `${firebaseStatus.totalReadersInFirestore} leitores sincronizados em nuvem`
                              : 'Conectado em nuvem'
                          }`
                        : 'Os dados estão preservados no backup local. Conecte ao Firebase para sincronizar em nuvem.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleMigrateFirebase}
                    disabled={isMigratingFirebase}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Forçar sincronização de todos os acessos locais para o Firebase Firestore"
                  >
                    <RefreshCw className={`w-3 h-3 ${isMigratingFirebase ? 'animate-spin' : ''}`} />
                    <span>{isMigratingFirebase ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Formulário de Criação de Novo Acesso / PIN */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-serif font-bold text-stone-900 dark:text-zinc-50">
                  Novo Acesso de Leitor
                </h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif leading-relaxed mb-5">
                Crie um PIN exclusivo para um leitor ou grupo. O código é validado no servidor com PBKDF2 e
                será exibido <strong>uma única vez</strong> ao salvar para que você possa entregá-lo com segurança.
              </p>

              <form onSubmit={handleCreateReader} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome do Leitor */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5">
                      Identificação do Usuário / Leitor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newReaderName}
                      onChange={(e) => setNewReaderName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                  </div>

                  {/* Modo do PIN (Automático ou Manual) */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5">
                      Geração do PIN
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPinMode('auto')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          pinMode === 'auto'
                            ? isDark
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                              : 'bg-stone-900 text-white border-stone-900'
                            : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Automático (6 dígitos)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPinMode('manual')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          pinMode === 'manual'
                            ? isDark
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                              : 'bg-stone-900 text-white border-stone-900'
                            : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Definir Manualmente</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Campo de PIN Manual se selecionado */}
                {pinMode === 'manual' && (
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in duration-150">
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5">
                      PIN Personalizado (entre 4 e 12 dígitos) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={customPinInput}
                      onChange={(e) => setCustomPinInput(e.target.value)}
                      className={`w-full max-w-sm px-3.5 py-2.5 rounded-xl text-sm font-mono tracking-widest border transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-white border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-1.5">
                      O servidor rejeitará automaticamente códigos duplicados que já pertençam a outros usuários.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Validade / Expiração */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Validade do Acesso</span>
                    </label>
                    <select
                      value={readerExpiryDays}
                      onChange={(e) => setReaderExpiryDays(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 cursor-pointer ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    >
                      <option value="never">Sem expiração (Acesso permanente)</option>
                      <option value="7">7 dias (1 semana)</option>
                      <option value="30">30 dias (1 mês)</option>
                      <option value="90">90 dias (3 meses)</option>
                      <option value="custom">Data e hora específica...</option>
                    </select>

                    {readerExpiryDays === 'custom' && (
                      <input
                        type="datetime-local"
                        required
                        value={customExpiryDate}
                        onChange={(e) => setCustomExpiryDate(e.target.value)}
                        className={`w-full mt-2 px-3.5 py-2 rounded-xl text-xs border transition-colors outline-hidden ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                            : 'bg-stone-50 border-stone-300 text-stone-900'
                        }`}
                      />
                    )}
                  </div>

                  {/* Notas internas */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5">
                      Observações Internas (opcional)
                    </label>
                    <input
                      type="text"
                      value={readerNotes}
                      onChange={(e) => setReaderNotes(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Permissões Iniciais de Conteúdo para este Novo Leitor */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!showNewReaderPermissionsToggle && !newReaderPermissions) {
                        const init: ReaderContentPermissions = { books: {} };
                        libraryBooks.forEach((b) => {
                          const chs: Record<string, boolean> = {};
                          b.chapters.forEach((c) => { chs[c.id] = true; });
                          init.books[b.id] = { enabled: true, chapters: chs };
                        });
                        setNewReaderPermissions(init);
                      }
                      setShowNewReaderPermissionsToggle(!showNewReaderPermissionsToggle);
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-between transition-colors cursor-pointer ${
                      showNewReaderPermissionsToggle
                        ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                        : isDark ? 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:text-zinc-200' : 'border-stone-200 bg-stone-50/60 text-stone-600 hover:text-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Permissões de Livros e Capítulos para este Novo Leitor</span>
                      <span className="text-[10px] font-normal opacity-80">(Padrão: Todos Liberados)</span>
                    </div>
                    {showNewReaderPermissionsToggle ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showNewReaderPermissionsToggle && newReaderPermissions && (
                    <div className="mt-3 p-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/40 space-y-3 animate-in fade-in duration-150">
                      <p className="text-[11px] text-stone-500 dark:text-zinc-400 leading-relaxed">
                        Defina previamente se algum livro ou capítulo deve iniciar bloqueado para este novo leitor.
                      </p>
                      <div className="space-y-2.5">
                        {libraryBooks.map((book) => {
                          const bPerm = newReaderPermissions.books[book.id] || { enabled: true, chapters: {} };
                          const isBookOn = bPerm.enabled !== false;
                          return (
                            <div key={book.id} className="p-3 rounded-lg border border-stone-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-serif font-bold text-xs text-stone-900 dark:text-zinc-100">{book.title}</span>
                                  <span className="text-[10px] text-stone-500 dark:text-zinc-400 block">{book.author}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleNewReaderBook(book.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                    isBookOn
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                  }`}
                                >
                                  {isBookOn ? 'Liberado' : 'Bloqueado'}
                                </button>
                              </div>
                              {isBookOn && (
                                <div className="mt-2 pt-2 border-t border-stone-100 dark:border-zinc-700/60 space-y-1.5 pl-2">
                                  {book.chapters.map((ch, idx) => {
                                    const chOn = bPerm.chapters?.[ch.id] !== false;
                                    return (
                                      <div key={ch.id} className="flex items-center justify-between text-[11px]">
                                        <span className="text-stone-700 dark:text-zinc-300 truncate max-w-[240px]">
                                          Cap. {idx + 1}: {ch.title}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleNewReaderChapter(book.id, ch.id)}
                                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                            chOn
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                          }`}
                                        >
                                          {chOn ? 'Liberado' : 'Bloqueado'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreatingReader || !newReaderName.trim()}
                    className="py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-stone-50 dark:text-zinc-950 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isCreatingReader ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Criando Acesso no Servidor...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Gerar e Cadastrar PIN</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista dos Acessos Cadastrados */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-stone-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 dark:text-zinc-50 flex items-center gap-2">
                    <span>Planilha de Acessos dos Leitores</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      {readers.length}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans mt-0.5">
                    Planilha completa com dados pessoais, WhatsApp, nascimento, idade calculada e estado de acesso.
                  </p>
                </div>

                {/* Filtros, Busca e Exportação */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border transition-colors outline-hidden ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                          : 'bg-stone-50 border-stone-300 text-stone-900'
                      }`}
                    />
                  </div>

                  {/* Filtro por Estado do PIN */}
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs border transition-colors outline-hidden cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                        : 'bg-stone-50 border-stone-300 text-stone-900'
                    }`}
                  >
                    <option value="all">Todos os Estados</option>
                    <option value="active">Apenas Ativos</option>
                    <option value="blocked">Apenas Bloqueados</option>
                    <option value="revoked">Apenas Revogados</option>
                  </select>

                  {/* Filtro por Cadastro Concluído */}
                  <select
                    value={registrationFilter}
                    onChange={(e: any) => setRegistrationFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs border transition-colors outline-hidden cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                        : 'bg-stone-50 border-stone-300 text-stone-900'
                    }`}
                  >
                    <option value="all">Todos os Cadastros</option>
                    <option value="registered">Cadastrados (Com Perfil)</option>
                    <option value="pending">Aguardando Cadastro</option>
                  </select>

                  {/* Botão Exportar Planilha (CSV) */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={readers.length === 0}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isDark
                        ? 'border-emerald-800/80 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                    title="Exportar dados para planilha Excel / Google Sheets em CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>

                  {/* Botão Imprimir / Relatório */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                        : 'border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                    title="Imprimir relatório da planilha"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Imprimir</span>
                  </button>

                  {/* Botão Limpar Todos os Leitores */}
                  {readers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllReaders}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isDark
                          ? 'border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50'
                          : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                      title="Remover todos os cadastros de leitores (inclusive cadastros de teste)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Limpar Todos</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabela / Planilha Administrativa de Leitores */}
              {isLoadingReaders ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs font-serif italic">Carregando planilha dos leitores...</span>
                </div>
              ) : readers.length === 0 ? (
                <div className="py-12 text-center text-stone-400 dark:text-zinc-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-serif">Nenhum acesso de leitor cadastrado até o momento.</p>
                  <p className="text-[11px] mt-1 text-stone-400">
                    Utilize o formulário acima para gerar o primeiro PIN.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-stone-200/80 dark:border-zinc-800">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-zinc-800 bg-stone-50/75 dark:bg-zinc-800/40 text-stone-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3.5">Nome Completo (Formatado)</th>
                        <th className="py-3 px-3">WhatsApp / Celular</th>
                        <th className="py-3 px-3">Nascimento</th>
                        <th className="py-3 px-3">Idade Calculada</th>
                        <th className="py-3 px-3">Sexo & Estado Civil</th>
                        <th className="py-3 px-3">Status do PIN</th>
                        <th className="py-3 px-3">Livros & Capítulos</th>
                        <th className="py-3 px-3">Data de Cadastro</th>
                        <th className="py-3 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-zinc-800/60">
                      {readers
                        .filter((r) => {
                          const q = searchTerm.trim().toLowerCase();
                          const fullNameMatch = r.profile?.fullName?.toLowerCase().includes(q);
                          const nameMatch = r.name.toLowerCase().includes(q);
                          const phoneMatch =
                            r.profile?.phone?.includes(q) ||
                            r.profile?.phoneFormatted?.includes(q);
                          const notesMatch = r.notes && r.notes.toLowerCase().includes(q);
                          const matchesSearch =
                            !q || fullNameMatch || nameMatch || phoneMatch || notesMatch;

                          const matchesStatus =
                            statusFilter === 'all' || r.status === statusFilter;

                          const matchesReg =
                            registrationFilter === 'all'
                              ? true
                              : registrationFilter === 'registered'
                              ? Boolean(r.hasProfile && r.profile)
                              : !r.hasProfile || !r.profile;

                          return matchesSearch && matchesStatus && matchesReg;
                        })
                        .map((reader) => {
                          const isExpired =
                            reader.expiresAt && new Date(reader.expiresAt).getTime() < Date.now();
                          const profile = reader.profile;
                          const displayName = profile?.fullName || reader.name;
                          const phoneDigits = profile?.phone
                            ? profile.phone.replace(/\D/g, '')
                            : '';

                          return (
                            <tr
                              key={reader.id}
                              className={`transition-colors ${
                                isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-stone-50/80'
                              } ${
                                reader.status === 'blocked'
                                  ? 'opacity-70 bg-amber-500/5'
                                  : reader.status === 'revoked'
                                  ? 'opacity-50 bg-rose-500/5'
                                  : ''
                              }`}
                            >
                              {/* 1. Nome Completo e Badge de Cadastro */}
                              <td className="py-3.5 px-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-900 dark:text-zinc-100 text-sm">
                                    {displayName}
                                  </span>
                                  {reader.hasProfile && profile ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300">
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      Cadastrado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                                      <Clock className="w-2.5 h-2.5" />
                                      Aguardando PIN
                                    </span>
                                  )}
                                </div>
                                {reader.notes && (
                                  <div className="text-[11px] text-stone-500 dark:text-zinc-400 italic mt-0.5">
                                    {reader.notes}
                                  </div>
                                )}
                              </td>

                              {/* 2. WhatsApp / Celular */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {profile?.phoneFormatted ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-stone-800 dark:text-zinc-200 text-xs">
                                      {profile.phoneFormatted}
                                    </span>
                                    {phoneDigits && (
                                      <a
                                        href={`https://wa.me/55${phoneDigits}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                                        title={`Abrir conversa no WhatsApp com ${displayName}`}
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-stone-400 dark:text-zinc-500 italic text-[11px]">
                                    Pendente
                                  </span>
                                )}
                              </td>

                              {/* 3. Data de Nascimento */}
                              <td className="py-3.5 px-3 whitespace-nowrap text-[11px] text-stone-700 dark:text-zinc-300">
                                {profile?.birthDate ? (
                                  <span className="font-mono">
                                    {formatBirthDate(profile.birthDate)}
                                  </span>
                                ) : (
                                  <span className="text-stone-400 dark:text-zinc-500 italic">
                                    -
                                  </span>
                                )}
                              </td>

                              {/* 4. Idade Calculada */}
                              <td className="py-3.5 px-3 text-[11px] text-stone-700 dark:text-zinc-300">
                                {profile?.birthDate ? (
                                  <span className="font-medium">
                                    {getReaderDetailedAge(profile.birthDate)}
                                  </span>
                                ) : (
                                  <span className="text-stone-400 dark:text-zinc-500 italic">
                                    -
                                  </span>
                                )}
                              </td>

                              {/* 5. Sexo & Estado Civil */}
                              <td className="py-3.5 px-3 whitespace-nowrap text-[11px] text-stone-600 dark:text-zinc-300">
                                {profile ? (
                                  <div>
                                    <span className="font-medium text-stone-800 dark:text-zinc-200">
                                      {profile.gender}
                                    </span>
                                    <span className="text-stone-400 mx-1">•</span>
                                    <span>{profile.maritalStatus}</span>
                                  </div>
                                ) : (
                                  <span className="text-stone-400 dark:text-zinc-500 italic">
                                    -
                                  </span>
                                )}
                              </td>

                              {/* 6. Status do PIN */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {reader.status === 'active' ? (
                                  isExpired ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                      <Clock className="w-3 h-3" />
                                      Expirado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      Ativo
                                    </span>
                                  )
                                ) : reader.status === 'blocked' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    <Lock className="w-3 h-3" />
                                    Bloqueado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                    <X className="w-3 h-3" />
                                    Revogado
                                  </span>
                                )}
                              </td>

                              {/* 6.1 Permissões de Livros e Capítulos */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {(() => {
                                  const hasRestrictions = reader.contentPermissions?.books && Object.values(reader.contentPermissions.books).some(
                                    (b) => b.enabled === false || (b.chapters && Object.values(b.chapters).some((ch) => ch === false))
                                  );
                                  if (hasRestrictions) {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                        <Lock className="w-3 h-3" />
                                        Personalizado
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Liberado Total
                                    </span>
                                  );
                                })()}
                              </td>

                              {/* 7. Data de Cadastro / Criação */}
                              <td className="py-3.5 px-3 text-stone-600 dark:text-zinc-300 whitespace-nowrap font-mono text-[11px]">
                                {formatDate(profile?.registeredAt || reader.createdAt)}
                              </td>

                              {/* 8. Botões de Ação */}
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  {/* Botão Ver Ficha / Detalhes */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReaderDetails(reader)}
                                    className="p-1.5 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                                    title="Ver ficha cadastral completa deste leitor"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {/* Botão Redefinir PIN */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenResetPinModal(reader)}
                                    className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                    title="Redefinir PIN deste leitor"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>

                                  {/* Botão Bloquear / Desbloquear */}
                                  {reader.status === 'active' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReaderStatus(reader, 'blocked')}
                                      className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                      title="Bloquear temporariamente este leitor"
                                    >
                                      <Lock className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReaderStatus(reader, 'active')}
                                      className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                      title="Reativar acesso do leitor"
                                    >
                                      <Unlock className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Botão Revogar */}
                                  {reader.status !== 'revoked' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReaderStatus(reader, 'revoked')}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      title="Revogar definitivamente este PIN"
                                    >
                                      <UserX className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Botão Excluir */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReader(reader)}
                                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-black/5 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                    title="Excluir registro permanentemente"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

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

            {/* STATUS E CONFIGURAÇÃO DO BANCO DE DADOS FIREBASE CLOUD FIRESTORE */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-zinc-800">
                <div>
                  <h2 className="text-base font-serif font-bold text-stone-900 dark:text-zinc-50 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Persistência: Firebase Cloud Firestore
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans mt-0.5">
                    Banco de dados relacional e escalável em nuvem para sobrevivência a reinicializações e novas implantações.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      firebaseStatus?.isConnected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        firebaseStatus?.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    {firebaseStatus?.isConnected ? 'Conectado à Nuvem' : 'Contingência Local'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 block mb-1">
                    Projeto Firebase
                  </span>
                  <span className="text-xs font-mono font-semibold text-stone-900 dark:text-zinc-100 block truncate">
                    {firebaseStatus?.projectId || 'Não configurado'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 block mb-1">
                    ID do Banco de Dados
                  </span>
                  <span className="text-xs font-mono font-semibold text-stone-900 dark:text-zinc-100 block truncate">
                    {firebaseStatus?.databaseId || '(default)'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 block mb-1">
                    Cópia de Backup Local
                  </span>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ativa (<code className="font-mono text-[10px]">security-config.backup.json</code>)
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Coleções sincronizadas: <strong className="text-stone-800 dark:text-zinc-200">/reader_accesses</strong> (acessos e cadastros de leitores) e <strong className="text-stone-800 dark:text-zinc-200">/system_config</strong> (travas e parâmetros).
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleMigrateFirebase}
                  disabled={isMigratingFirebase}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-900 dark:bg-zinc-100 text-stone-50 dark:text-zinc-900 hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isMigratingFirebase ? 'animate-spin' : ''}`} />
                  <span>{isMigratingFirebase ? 'Sincronizando...' : 'Forçar Sincronização em Nuvem'}</span>
                </button>
              </div>
            </div>

            {/* 2. ALTERAÇÃO DE LOGIN E SENHA DO ADMINISTRADOR */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-base font-serif font-bold text-stone-900 dark:text-zinc-50">
                      Alterar Login e Senha do Administrador
                    </h2>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans">
                    Defina um novo nome de usuário (login) ou uma nova senha para acessar o painel administrativo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans text-stone-500 dark:text-zinc-400">
                    Login atual:
                  </span>
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 border border-stone-200 dark:border-zinc-700">
                    {adminUsername || 'admin'}
                  </span>
                </div>
              </div>

              {credentialsSuccessMessage && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-sans flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{credentialsSuccessMessage}</span>
                </div>
              )}

              {credentialsErrorMessage && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-sans flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{credentialsErrorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateAdminCredentials} className="space-y-4 max-w-2xl mt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Novo Nome de Usuário / Login */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                      Novo Nome de Usuário (Login)
                    </label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={newAdminUsernameInput}
                      onChange={(e) => {
                        setNewAdminUsernameInput(e.target.value);
                        setCredentialsErrorMessage(null);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-sans transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                    <span className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1 block">
                      Deixe em branco caso queira manter o login atual ({adminUsername || 'admin'}).
                    </span>
                  </div>

                  {/* Senha Atual */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                      Senha Atual <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassToggle ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={currentAdminPasswordInput}
                        onChange={(e) => {
                          setCurrentAdminPasswordInput(e.target.value);
                          setCredentialsErrorMessage(null);
                        }}
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm border font-sans transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                            : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassToggle(!showAdminPassToggle)}
                        tabIndex={-1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        aria-label={showAdminPassToggle ? 'Ocultar senhas' : 'Exibir senhas'}
                      >
                        {showAdminPassToggle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1 block">
                      Obrigatória para confirmar a alteração de segurança.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Nova Senha */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                      Nova Senha Administrativa
                    </label>
                    <input
                      type={showAdminPassToggle ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newAdminPasswordInput}
                      onChange={(e) => {
                        setNewAdminPasswordInput(e.target.value);
                        setCredentialsErrorMessage(null);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-sans transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                    <span className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1 block">
                      Mínimo de 6 caracteres. Deixe em branco se for alterar apenas o login.
                    </span>
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type={showAdminPassToggle ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmAdminPasswordInput}
                      onChange={(e) => {
                        setConfirmAdminPasswordInput(e.target.value);
                        setCredentialsErrorMessage(null);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-sans transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingCredentials || !currentAdminPasswordInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-stone-50 dark:text-zinc-950 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isUpdatingCredentials ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando Credenciais...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar Novas Credenciais</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* 3. ALTERAÇÃO DO PIN DOS LEITORES */}
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
                        required
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm border font-mono tracking-wider transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                            : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
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
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-mono tracking-wider transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
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
            ABA: ALTERAÇÃO DE LOGIN E SENHA DO ADMINISTRADOR
            ========================================================================= */}
        {activeTab === 'credentials' && (
          <section className="space-y-6 animate-in fade-in duration-200 font-sans">
            {/* Introdução e Status das Credenciais */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-zinc-50">
                      Alterar Login e Senha do Administrador
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans mt-0.5">
                      Atualize seu usuário de login e/ou sua senha de acesso com criptografia e persistência no servidor.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans text-stone-500 dark:text-zinc-400">
                    Login atual:
                  </span>
                  <span className="font-mono font-bold text-xs px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 border border-stone-200 dark:border-zinc-700">
                    {adminUsername || 'admin'}
                  </span>
                </div>
              </div>

              {credentialsSuccessMessage && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-sans flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{credentialsSuccessMessage}</span>
                </div>
              )}

              {credentialsErrorMessage && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-sans flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{credentialsErrorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateAdminCredentials} className="space-y-4 max-w-2xl mt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Novo Nome de Usuário / Login */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                      Novo Nome de Usuário (Login)
                    </label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={newAdminUsernameInput}
                      onChange={(e) => {
                        setNewAdminUsernameInput(e.target.value);
                        setCredentialsErrorMessage(null);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-sans transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                    <span className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1 block">
                      Deixe em branco caso queira manter o login atual ({adminUsername || 'admin'}).
                    </span>
                  </div>

                  {/* Senha Atual */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                      Senha Atual <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassToggle ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={currentAdminPasswordInput}
                        onChange={(e) => {
                          setCurrentAdminPasswordInput(e.target.value);
                          setCredentialsErrorMessage(null);
                        }}
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm border font-sans transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                            : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassToggle(!showAdminPassToggle)}
                        tabIndex={-1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        aria-label={showAdminPassToggle ? 'Ocultar senhas' : 'Exibir senhas'}
                      >
                        {showAdminPassToggle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1 block">
                      Obrigatória para autorizar a alteração de segurança.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Nova Senha */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                      Nova Senha Administrativa
                    </label>
                    <input
                      type={showAdminPassToggle ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newAdminPasswordInput}
                      onChange={(e) => {
                        setNewAdminPasswordInput(e.target.value);
                        setCredentialsErrorMessage(null);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-sans transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                    <span className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1 block">
                      Mínimo de 6 caracteres. Deixe em branco se for alterar apenas o login.
                    </span>
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1.5 font-sans">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type={showAdminPassToggle ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmAdminPasswordInput}
                      onChange={(e) => {
                        setConfirmAdminPasswordInput(e.target.value);
                        setCredentialsErrorMessage(null);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-sans transition-colors outline-hidden focus:ring-2 focus:ring-amber-500/40 ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-400'
                          : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingCredentials || !currentAdminPasswordInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-stone-50 dark:text-zinc-950 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isUpdatingCredentials ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando Credenciais...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar Novas Credenciais</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Cartão Informativo de Proteção e Criptografia */}
            <div
              className={`p-5 rounded-2xl border transition-all text-xs space-y-3 ${
                isDark ? 'bg-zinc-900/40 border-zinc-800 text-zinc-300' : 'bg-stone-50/70 border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-zinc-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Segurança e Persistência das Credenciais</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-stone-600 dark:text-zinc-400 font-sans leading-relaxed">
                <li>
                  As senhas são protegidas com <strong>hash PBKDF2 (SHA-512)</strong> com 30.000 iterações e salt criptográfico individual de 128 bits.
                </li>
                <li>
                  Suas credenciais são salvas permanentemente no disco e sincronizadas de forma segura no <strong>Firebase Cloud Firestore</strong>.
                </li>
                <li>
                  Após atualizar as credenciais, sua sessão permanece ativa automaticamente sem interrupções.
                </li>
              </ul>
            </div>
          </section>
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
                    Nome curto: "Biblioteca Digital"
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

      {/* MODAL DE REDEFINIÇÃO DE PIN DO LEITOR */}
      {resetPinModal.isOpen && resetPinModal.reader && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`max-w-md w-full p-6 sm:p-7 rounded-3xl border shadow-2xl relative animate-in zoom-in-95 duration-150 ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-zinc-50">
                  Redefinir PIN do Leitor
                </h3>
                <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans mt-0.5">
                  Leitor: <strong className="font-semibold text-stone-800 dark:text-zinc-200">{resetPinModal.reader.name}</strong>
                </p>
              </div>
            </div>

            {/* Aviso Importante de Invalidação do PIN Anterior */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 mb-4 text-xs font-sans flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-stone-700 dark:text-zinc-300 leading-relaxed">
                <strong className="text-stone-900 dark:text-zinc-100">Atenção:</strong> O PIN anterior será invalidado imediatamente. O cadastro pessoal, observações e histórico do leitor serão <strong className="text-emerald-700 dark:text-emerald-400">100% preservados</strong>.
              </div>
            </div>

            {/* Seleção do Modo de Geração */}
            <div className="space-y-3 mb-4">
              <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300 block">
                Como deseja definir o novo PIN?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResetPinModal((prev) => ({ ...prev, pinMode: 'auto', error: null }))}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    resetPinModal.pinMode === 'auto'
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 font-semibold ring-1 ring-amber-500/50'
                      : 'border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/30 text-stone-600 dark:text-zinc-400 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Automático (6 dígitos)</span>
                  </div>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-normal block leading-tight">
                    Código numérico aleatório seguro
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setResetPinModal((prev) => ({ ...prev, pinMode: 'manual', error: null }))}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    resetPinModal.pinMode === 'manual'
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 font-semibold ring-1 ring-amber-500/50'
                      : 'border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/30 text-stone-600 dark:text-zinc-400 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-xs">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    <span>Personalizado</span>
                  </div>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-normal block leading-tight">
                    Você digita o novo código
                  </span>
                </button>
              </div>

              {/* Campo para PIN Manual */}
              {resetPinModal.pinMode === 'manual' && (
                <div className="pt-2 animate-in fade-in duration-150">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-zinc-400 block mb-1">
                    Novo PIN Personalizado (4 a 12 caracteres):
                  </label>
                  <input
                    type="text"
                    value={resetPinModal.customPin}
                    onChange={(e) =>
                      setResetPinModal((prev) => ({ ...prev, customPin: e.target.value, error: null }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    maxLength={12}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Mensagem de Erro se houver */}
            {resetPinModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{resetPinModal.error}</span>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() =>
                  setResetPinModal({
                    isOpen: false,
                    reader: null,
                    pinMode: 'auto',
                    customPin: '',
                    isSubmitting: false,
                    error: null,
                  })
                }
                disabled={resetPinModal.isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmResetPin}
                disabled={resetPinModal.isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white dark:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {resetPinModal.isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Redefinindo PIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Confirmar Redefinição</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXIBIÇÃO ÚNICA E SEGURA DO PIN CRIADO OU REDEFINIDO */}
      {createdPinModal.isOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`max-w-md w-full p-6 sm:p-7 rounded-3xl border shadow-2xl relative animate-in zoom-in-95 duration-150 ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-zinc-50">
                  {createdPinModal.title || 'PIN Gerado com Sucesso!'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans">
                  Leitor: <strong className="font-semibold text-stone-800 dark:text-zinc-200">{createdPinModal.readerName}</strong>
                </p>
                {createdPinModal.subtitle && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-sans mt-0.5">
                    {createdPinModal.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 mb-4 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
                Código PIN do Leitor
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-stone-900 dark:text-zinc-100 py-1 select-all">
                {createdPinModal.pin}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-100 dark:bg-zinc-800/80 text-stone-600 dark:text-zinc-300 text-xs flex items-start gap-2.5 mb-6">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Atenção de Segurança:</strong> Este PIN é exibido <strong>apenas uma vez</strong>.
                Copie ou anote o código agora para entregar ao leitor. No servidor, ele será guardado
                exclusivamente como hash criptográfico irreversível.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdPinModal.pin);
                  setCreatedPinModal((prev) => ({ ...prev, copied: true }));
                  setTimeout(() => {
                    setCreatedPinModal((prev) => ({ ...prev, copied: false }));
                  }, 2500);
                }}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  createdPinModal.copied
                    ? 'bg-emerald-600 text-white'
                    : isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                }`}
              >
                {createdPinModal.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>PIN Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar PIN</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreatedPinModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 transition-colors cursor-pointer"
              >
                Entendido, já guardei o PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE AÇÃO CRÍTICA */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
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

      {/* MODAL DE FICHA CADASTRAL DETALHADA DO LEITOR */}
      {selectedReaderDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`max-w-lg w-full p-6 sm:p-7 rounded-3xl border shadow-2xl relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            {/* Cabeçalho da Modal */}
            <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-stone-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-zinc-50 leading-tight">
                    Ficha Cadastral do Leitor
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 font-sans mt-0.5">
                    ID Interno: <span className="font-mono">{selectedReaderDetails.id}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenResetPinModal(selectedReaderDetails)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-zinc-950 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Redefinir PIN deste leitor"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Redefinir PIN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReaderDetails(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Fechar ficha"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Informações Pessoais */}
            <div className="space-y-4 text-xs font-sans">
              {/* Nome e Status */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200/60 dark:border-zinc-700/60">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-400">
                    Nome Completo Padronizado
                  </span>
                  {selectedReaderDetails.hasProfile && selectedReaderDetails.profile ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300">
                      <CheckCircle2 className="w-3 h-3" />
                      Cadastro Concluído
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                      <Clock className="w-3 h-3" />
                      Aguardando Primeiro Acesso
                    </span>
                  )}
                </div>
                <div className="text-base font-serif font-bold text-stone-900 dark:text-zinc-100">
                  {selectedReaderDetails.profile?.fullName || selectedReaderDetails.name}
                </div>
              </div>

              {/* Contato WhatsApp */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200/60 dark:border-zinc-700/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-400 block mb-2">
                  Telefone Celular (WhatsApp)
                </span>
                {selectedReaderDetails.profile?.phoneFormatted ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-mono font-bold text-stone-900 dark:text-zinc-100">
                      {selectedReaderDetails.profile.phoneFormatted}
                    </span>
                    <a
                      href={`https://wa.me/55${selectedReaderDetails.profile.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Conversar no WhatsApp</span>
                    </a>
                  </div>
                ) : (
                  <span className="text-stone-400 dark:text-zinc-500 italic">
                    Telefone ainda não cadastrado pelo leitor.
                  </span>
                )}
              </div>

              {/* Data de Nascimento & Idade Calculada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-400 block mb-1">
                    Data de Nascimento
                  </span>
                  <span className="text-sm font-mono font-bold text-stone-900 dark:text-zinc-100 block">
                    {selectedReaderDetails.profile?.birthDate
                      ? formatBirthDate(selectedReaderDetails.profile.birthDate)
                      : 'Não informado'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
                    Idade Calculada
                  </span>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    {selectedReaderDetails.profile?.birthDate
                      ? getReaderDetailedAge(selectedReaderDetails.profile.birthDate)
                      : 'Não calculada'}
                  </span>
                </div>
              </div>

              {/* Sexo e Estado Civil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-400 block mb-1">
                    Sexo
                  </span>
                  <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200 block">
                    {selectedReaderDetails.profile?.gender || 'Não informado'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-400 block mb-1">
                    Estado Civil
                  </span>
                  <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200 block">
                    {selectedReaderDetails.profile?.maritalStatus || 'Não informado'}
                  </span>
                </div>
              </div>

              {/* Histórico e Validade */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200/60 dark:border-zinc-700/60 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-stone-500 dark:text-zinc-400">PIN Criado Em:</span>
                  <span className="font-mono text-stone-800 dark:text-zinc-200">{formatDate(selectedReaderDetails.createdAt)}</span>
                </div>
                {selectedReaderDetails.profile?.registeredAt && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-stone-500 dark:text-zinc-400">Cadastro Pessoal Em:</span>
                    <span className="font-mono text-stone-800 dark:text-zinc-200">{formatDate(selectedReaderDetails.profile.registeredAt)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-stone-500 dark:text-zinc-400">Último Acesso à Biblioteca:</span>
                  <span className="font-mono text-stone-800 dark:text-zinc-200">
                    {selectedReaderDetails.lastUsedAt ? formatDate(selectedReaderDetails.lastUsedAt) : 'Ainda não acessou'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-stone-500 dark:text-zinc-400">Validade do Acesso:</span>
                  <span className="font-mono text-stone-800 dark:text-zinc-200">
                    {selectedReaderDetails.expiresAt ? formatDate(selectedReaderDetails.expiresAt) : 'Permanente'}
                  </span>
                </div>
                {selectedReaderDetails.notes && (
                  <div className="pt-2 border-t border-stone-200/60 dark:border-zinc-700/60">
                    <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 block mb-0.5">
                      Observações Administrativas:
                    </span>
                    <p className="italic text-stone-600 dark:text-zinc-300">{selectedReaderDetails.notes}</p>
                  </div>
                )}
              </div>

              {/* Gestão de Permissões de Livros e Capítulos para este Leitor */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 dark:bg-zinc-800/60 border border-amber-200/70 dark:border-zinc-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-zinc-100">
                        Liberado / Bloqueado de Livros e Capítulos
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 font-sans mt-0.5">
                      Gerencie individualmente quais obras e capítulos este leitor pode acessar.
                    </p>
                  </div>

                  {/* Ações Rápidas: Liberar Todos / Bloquear Todos */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={handleAllowAllContentForReader}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer flex items-center gap-1"
                      title="Liberar todos os livros e capítulos para este leitor"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Liberar Todos</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBlockAllContentForReader}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1"
                      title="Bloquear todos os livros e capítulos para este leitor"
                    >
                      <Ban className="w-3 h-3" />
                      <span>Bloquear Todos</span>
                    </button>
                  </div>
                </div>

                {permissionsSuccessMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{permissionsSuccessMessage}</span>
                  </div>
                )}

                {/* Lista dos livros do acervo com controle por capítulo */}
                <div className="space-y-3">
                  {libraryBooks.map((book) => {
                    const bookPerm = readerContentPermissions.books[book.id] || {
                      enabled: true,
                      chapters: {},
                    };
                    const isBookAllowed = bookPerm.enabled !== false;
                    const chaptersCount = book.chapters.length;
                    const allowedChaptersCount = book.chapters.filter((ch) => bookPerm.chapters?.[ch.id] !== false).length;

                    return (
                      <div
                        key={book.id}
                        className={`rounded-xl border transition-all ${
                          isBookAllowed
                            ? 'bg-white dark:bg-zinc-900/80 border-stone-200 dark:border-zinc-700/80 shadow-2xs'
                            : 'bg-stone-100/70 dark:bg-zinc-900/40 border-stone-300/60 dark:border-zinc-800 opacity-80'
                        }`}
                      >
                        {/* Linha principal do livro */}
                        <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isBookAllowed
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-zinc-100">
                                  {book.title}
                                </h5>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isBookAllowed
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  }`}
                                >
                                  {isBookAllowed ? 'Liberado' : 'Bloqueado'}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 dark:text-zinc-400 font-serif mt-0.5">
                                {book.author} • {isBookAllowed ? `${allowedChaptersCount} de ${chaptersCount} cap. liberado(s)` : 'Acesso suspenso'}
                              </p>
                            </div>
                          </div>

                          {/* Botão de Alternar Livro */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleReaderBook(book.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isBookAllowed
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                              }`}
                            >
                              {isBookAllowed ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Bloquear Livro</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Liberar Livro</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Capítulos do livro (se livro estiver liberado) */}
                        {isBookAllowed ? (
                          <div className="px-3.5 pb-3.5 pt-1 border-t border-stone-100 dark:border-zinc-800/80 space-y-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-400 block pt-1">
                              Capítulos da Obra:
                            </span>
                            <div className="space-y-1.5">
                              {book.chapters.map((chapter, chIdx) => {
                                const isChapterAllowed = bookPerm.chapters?.[chapter.id] !== false;
                                return (
                                  <div
                                    key={chapter.id}
                                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2.5 transition-colors ${
                                      isChapterAllowed
                                        ? 'bg-stone-50/70 dark:bg-zinc-800/50 border-stone-200/60 dark:border-zinc-700/60'
                                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-mono text-[10px] font-bold text-stone-400 dark:text-zinc-500 shrink-0">
                                        #{chIdx + 1}
                                      </span>
                                      <span className="text-xs text-stone-800 dark:text-zinc-200 font-serif truncate">
                                        {chapter.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          isChapterAllowed
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                        }`}
                                      >
                                        {isChapterAllowed ? 'Liberado' : 'Bloqueado'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleReaderChapter(book.id, chapter.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                          isChapterAllowed
                                            ? 'bg-stone-100 hover:bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 border-stone-300 dark:border-zinc-600'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                        }`}
                                      >
                                        {isChapterAllowed ? 'Bloquear' : 'Liberar'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="px-3.5 pb-3 pt-0 text-[11px] text-rose-600 dark:text-rose-400 italic">
                            Livro bloqueado para este leitor. Todos os seus capítulos estão automaticamente indisponíveis.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Botão de Salvar Permissões */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveReaderPermissions}
                    disabled={isSavingReaderPermissions}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSavingReaderPermissions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando Permissões no Servidor e Nuvem...</span>
                      </>
                    ) : (
                      <>
                        <BookCheck className="w-4 h-4" />
                        <span>Salvar Permissões de Conteúdo deste Leitor</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Rodapé da Modal com Ações Rápidas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 mt-5 border-t border-stone-100 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                {/* Botão Redefinir PIN */}
                <button
                  type="button"
                  onClick={() => handleOpenResetPinModal(selectedReaderDetails)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-zinc-950 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Redefinir PIN deste leitor com geração automática ou manual"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Redefinir PIN</span>
                </button>

                {selectedReaderDetails.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedReaderDetails;
                      setSelectedReaderDetails(null);
                      handleUpdateReaderStatus(target, 'blocked');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 transition-colors cursor-pointer"
                  >
                    Bloquear Acesso
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedReaderDetails;
                      setSelectedReaderDetails(null);
                      handleUpdateReaderStatus(target, 'active');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 transition-colors cursor-pointer"
                  >
                    Reativar Acesso
                  </button>
                )}

                {selectedReaderDetails.status !== 'revoked' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedReaderDetails;
                      setSelectedReaderDetails(null);
                      handleUpdateReaderStatus(target, 'revoked');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                  >
                    Revogar PIN
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedReaderDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Fechar
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
