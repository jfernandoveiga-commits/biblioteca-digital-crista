/**
 * Serviço de Autenticação Segura por PIN para a Biblioteca Digital.
 *
 * Comunica-se exclusivamente com a API do servidor (/api/auth/*)
 * garantindo que o PIN nunca fique exposto no cliente nem no código do navegador.
 */

import {
  LibraryFeaturesConfig,
  ContentAvailabilityConfig,
  DEFAULT_LIBRARY_FEATURES,
  ReaderProfile,
  ReaderProfileUpdateInput,
} from '../types/book';

const SESSION_TOKEN_KEY = 'bib_session_token';

export interface VerifyPinResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  retryAfter?: number;
  token?: string;
  expiresAt?: number;
  isLocked?: boolean;
  accessId?: string;
  readerName?: string;
  hasProfile?: boolean;
  readerProfile?: ReaderProfile | null;
}

export interface SessionStatus {
  authenticated: boolean;
  expiresAt?: number;
  isLocked?: boolean;
  reason?: string;
  message?: string;
  accessId?: string;
  readerName?: string;
  hasProfile?: boolean;
  readerProfile?: ReaderProfile | null;
  features?: LibraryFeaturesConfig;
  contentAvailability?: ContentAvailabilityConfig;
}

export const authService = {
  /**
   * Obtém o token armazenado localmente
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Salva o token de sessão localmente
   */
  setToken(token: string): void {
    try {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } catch {
      // Ignora erro de storage restrito
    }
  },

  /**
   * Remove o token local
   */
  clearToken(): void {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {
      // Ignora erro
    }
  },

  /**
   * Verifica se há uma sessão ativa válida no servidor
   */
  async checkSession(): Promise<SessionStatus> {
    const token = this.getToken();
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        return { authenticated: false };
      }

      const data = await response.json();
      if (!data.authenticated) {
        this.clearToken();
      }
      return data;
    } catch (err) {
      console.warn('[authService] Erro ao verificar sessão no servidor:', err);
      // Se não for possível contactar o servidor, mantém não autenticado
      return { authenticated: false };
    }
  },

  /**
   * Envia o PIN ao servidor para validação segura
   */
  async verifyPin(pin: string): Promise<VerifyPinResult> {
    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        this.setToken(data.token);
        return {
          success: true,
          token: data.token,
          expiresAt: data.expiresAt,
          accessId: data.accessId,
          readerName: data.readerName,
          hasProfile: data.hasProfile,
          readerProfile: data.readerProfile,
        };
      }

      return {
        success: false,
        error: data.error || 'PIN incorreto. Tente novamente.',
        remainingAttempts: data.remainingAttempts,
        retryAfter: data.retryAfter,
        isLocked: data.isLocked,
      };
    } catch (err) {
      console.error('[authService] Erro de rede ao validar PIN:', err);
      return {
        success: false,
        error: 'Erro de conexão com o servidor. Verifique sua rede e tente novamente.',
      };
    }
  },

  /**
   * Conclui o cadastro pessoal do leitor no primeiro acesso
   */
  async registerProfile(
    input: ReaderProfileUpdateInput
  ): Promise<{
    success: boolean;
    profile?: ReaderProfile;
    readerName?: string;
    hasProfile?: boolean;
    error?: string;
  }> {
    const token = this.getToken();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth/reader-profile', {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          profile: data.profile,
          readerName: data.readerName,
          hasProfile: true,
        };
      }

      return {
        success: false,
        error: data.error || 'Falha ao salvar dados cadastrais. Verifique os campos.',
      };
    } catch (err) {
      console.error('[authService] Erro ao enviar cadastro do leitor:', err);
      return {
        success: false,
        error: 'Erro de conexão ao salvar cadastro. Verifique sua rede e tente novamente.',
      };
    }
  },

  /**
   * Consulta o perfil pessoal do próprio leitor autenticado
   */
  async getReaderProfile(): Promise<{
    success: boolean;
    profile?: ReaderProfile | null;
    hasProfile?: boolean;
    error?: string;
  }> {
    const token = this.getToken();
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth/reader-profile', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return {
          success: true,
          profile: data.profile,
          hasProfile: data.hasProfile,
        };
      }
      return { success: false, error: data.error };
    } catch (err) {
      console.warn('[authService] Erro ao buscar perfil do leitor:', err);
      return { success: false, error: 'Erro de rede ao carregar perfil.' };
    }
  },

  /**
   * Encerra a sessão ativa no servidor e no navegador
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch {
      // Ignora erro de rede no logout
    } finally {
      this.clearToken();
    }
  },

  /**
   * Obtém as configurações públicas de funcionalidades e livros da biblioteca
   */
  async getLibraryConfig(): Promise<{
    features: LibraryFeaturesConfig;
    contentAvailability: ContentAvailabilityConfig;
    isLibraryLocked: boolean;
    lockReason?: string;
  }> {
    try {
      const response = await fetch('/api/library/config');
      if (response.ok) {
        const data = await response.json();
        return {
          features: data.features || DEFAULT_LIBRARY_FEATURES,
          contentAvailability: data.contentAvailability || { books: {} },
          isLibraryLocked: Boolean(data.isLibraryLocked),
          lockReason: data.lockReason || '',
        };
      }
    } catch (err) {
      console.warn('[authService] Erro ao carregar configurações da biblioteca:', err);
    }

    return {
      features: DEFAULT_LIBRARY_FEATURES,
      contentAvailability: { books: {} },
      isLibraryLocked: false,
    };
  },

  /**
   * Valida permissão para leitura de livro/capítulo
   */
  async checkAccess(
    bookId: string,
    chapterId: string
  ): Promise<{ allowed: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/library/check-access/${bookId}/${chapterId}`);
      const data = await response.json();
      return {
        allowed: Boolean(data.allowed),
        error: data.error,
      };
    } catch {
      return { allowed: true };
    }
  },
};

