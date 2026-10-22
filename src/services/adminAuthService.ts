/**
 * Serviço de Autenticação e Gestão Administrativa da Biblioteca Digital.
 *
 * Comunica-se exclusivamente com a API do servidor (/api/admin/*)
 * utilizando credenciais seguras e tokens criptografados.
 */

import {
  LibraryFeaturesConfig,
  ContentAvailabilityConfig,
  ReaderAccessRecord,
  ReaderAccessCreateInput,
  ReaderAccessCreatedResult,
  ReaderAccessStatus,
  ReaderContentPermissions,
  ReaderProfileAdminUpdateInput,
} from '../types/book';

const ADMIN_TOKEN_KEY = 'bib_admin_session_token';

export interface AdminSessionStatus {
  authenticated: boolean;
  username?: string;
  expiresAt?: number;
}

export interface AdminLoginResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  retryAfter?: number;
  username?: string;
}

export interface AdminSystemStatus {
  success: boolean;
  isLibraryLocked: boolean;
  lockReason: string;
  activeReaderSessionsCount: number;
  totalReadersCount?: number;
  lastPinChangedAt: string | null;
  lastRevokedAt: string | null;
  adminUsername: string;
  storageType: string;
  features?: LibraryFeaturesConfig;
  contentAvailability?: ContentAvailabilityConfig;
  error?: string;
}

export const adminAuthService = {
  getToken(): string | null {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch {
      // Ignora erro de storage local
    }
  },

  clearToken(): void {
    try {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      // Ignora erro
    }
  },

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async checkSession(): Promise<AdminSessionStatus> {
    const token = this.getToken();
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/session', {
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
      console.warn('[adminAuthService] Falha ao verificar sessão administrativa:', err);
      return { authenticated: false };
    }
  },

  async login(username: string, password: string): Promise<AdminLoginResult> {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        this.setToken(data.token);
        return {
          success: true,
          username: data.username,
        };
      }

      return {
        success: false,
        error: data.error || 'Credenciais inválidas. Verifique seu usuário e senha.',
        remainingAttempts: data.remainingAttempts,
        retryAfter: data.retryAfter,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro de rede ao efetuar login administrativo:', err);
      return {
        success: false,
        error: 'Erro de conexão com o servidor. Verifique sua rede e tente novamente.',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
    } catch {
      // Ignora erro de rede no logout
    } finally {
      this.clearToken();
    }
  },

  async getStatus(): Promise<AdminSystemStatus> {
    try {
      const response = await fetch('/api/admin/status', {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          isLibraryLocked: false,
          lockReason: '',
          activeReaderSessionsCount: 0,
          lastPinChangedAt: null,
          lastRevokedAt: null,
          adminUsername: '',
          storageType: '',
          error: errorData.error || 'Não autorizado a consultar status do sistema.',
        };
      }

      return await response.json();
    } catch (err) {
      console.error('[adminAuthService] Erro ao obter status:', err);
      return {
        success: false,
        isLibraryLocked: false,
        lockReason: '',
        activeReaderSessionsCount: 0,
        lastPinChangedAt: null,
        lastRevokedAt: null,
        adminUsername: '',
        storageType: '',
        error: 'Erro de conexão com o servidor.',
      };
    }
  },

  async updatePin(
    newPin: string,
    confirmPin: string,
    revokeExistingSessions: boolean = true
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/admin/update-pin', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          newPin,
          confirmPin,
          revokeExistingSessions,
        }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao atualizar PIN de acesso.',
        };
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao atualizar PIN:', err);
      return {
        success: false,
        error: 'Erro de conexão ao salvar novo PIN.',
      };
    }
  },

  async toggleLock(
    locked: boolean,
    reason?: string
  ): Promise<{ success: boolean; isLibraryLocked?: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/admin/toggle-lock', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ locked, reason }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao alterar estado de bloqueio.',
        };
      }

      return {
        success: true,
        isLibraryLocked: data.isLibraryLocked,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao alterar bloqueio:', err);
      return {
        success: false,
        error: 'Erro de conexão ao alterar estado de bloqueio.',
      };
    }
  },

  async revokeAllSessions(): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/admin/revoke-sessions', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao revogar sessões.',
        };
      }

      return {
        success: true,
        count: data.count,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao revogar sessões:', err);
      return {
        success: false,
        error: 'Erro de conexão ao revogar sessões.',
      };
    }
  },

  async getFeatures(): Promise<{ success: boolean; features?: LibraryFeaturesConfig; error?: string }> {
    try {
      const response = await fetch('/api/admin/features', {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao consultar configurações de funcionalidades.',
        };
      }

      return {
        success: true,
        features: data.features,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao buscar funcionalidades:', err);
      return {
        success: false,
        error: 'Erro de conexão com o servidor ao consultar funcionalidades.',
      };
    }
  },

  async updateFeatures(
    features: Partial<LibraryFeaturesConfig>
  ): Promise<{ success: boolean; features?: LibraryFeaturesConfig; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/admin/features', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ features }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao atualizar funcionalidades da biblioteca.',
        };
      }

      return {
        success: true,
        features: data.features,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao atualizar funcionalidades:', err);
      return {
        success: false,
        error: 'Erro de conexão ao salvar alterações de funcionalidades.',
      };
    }
  },

  async getContentAvailability(): Promise<{
    success: boolean;
    contentAvailability?: ContentAvailabilityConfig;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/content-availability', {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao consultar disponibilidade de conteúdo.',
        };
      }

      return {
        success: true,
        contentAvailability: data.contentAvailability,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao buscar disponibilidade:', err);
      return {
        success: false,
        error: 'Erro de conexão ao consultar disponibilidade de livros e capítulos.',
      };
    }
  },

  async updateContentAvailability(
    contentAvailability: ContentAvailabilityConfig
  ): Promise<{
    success: boolean;
    contentAvailability?: ContentAvailabilityConfig;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/content-availability', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ contentAvailability }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao atualizar disponibilidade de conteúdo.',
        };
      }

      return {
        success: true,
        contentAvailability: data.contentAvailability,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao atualizar disponibilidade:', err);
      return {
        success: false,
        error: 'Erro de conexão ao salvar disponibilidade de livros e capítulos.',
      };
    }
  },

  /* -------------------------------------------------------------------------
     GESTÃO DOS ACESSOS DOS LEITORES (/api/admin/readers)
     ------------------------------------------------------------------------- */

  async getReaders(): Promise<{
    success: boolean;
    readers?: ReaderAccessRecord[];
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/readers', {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao consultar acessos dos leitores.',
        };
      }

      return {
        success: true,
        readers: data.readers,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao listar leitores:', err);
      return {
        success: false,
        error: 'Erro de conexão com o servidor ao consultar leitores.',
      };
    }
  },

  async createReaderAccess(
    input: ReaderAccessCreateInput
  ): Promise<{
    success: boolean;
    result?: ReaderAccessCreatedResult;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/readers', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(input),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao criar acesso de leitor.',
        };
      }

      return {
        success: true,
        result: {
          access: data.access,
          pin: data.pin,
        },
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao criar acesso de leitor:', err);
      return {
        success: false,
        error: 'Erro de conexão ao cadastrar acesso de leitor.',
      };
    }
  },

  async updateReaderStatus(
    id: string,
    status: ReaderAccessStatus
  ): Promise<{
    success: boolean;
    access?: ReaderAccessRecord;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/admin/readers/${id}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao atualizar estado do leitor.',
        };
      }

      return {
        success: true,
        access: data.access,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao atualizar status do leitor:', err);
      return {
        success: false,
        error: 'Erro de conexão ao atualizar status do leitor.',
      };
    }
  },

  async updateReaderPermissions(
    id: string,
    contentPermissions: ReaderContentPermissions
  ): Promise<{
    success: boolean;
    access?: ReaderAccessRecord;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/admin/readers/${id}/permissions`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ contentPermissions }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao atualizar permissões de conteúdo do leitor.',
        };
      }

      return {
        success: true,
        access: data.access,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao atualizar permissões do leitor:', err);
      return {
        success: false,
        error: 'Erro de conexão ao atualizar permissões do leitor.',
      };
    }
  },

  /**
   * Atualiza os dados cadastrais pessoais e observações do leitor diretamente (salvando no Firestore)
   */
  async updateReaderProfile(
    id: string,
    input: ReaderProfileAdminUpdateInput
  ): Promise<{
    success: boolean;
    access?: ReaderAccessRecord;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/admin/readers/${id}/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(input),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao atualizar dados cadastrais do leitor.',
        };
      }

      return {
        success: true,
        access: data.access,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao atualizar perfil do leitor:', err);
      return {
        success: false,
        error: 'Erro de conexão ao atualizar cadastro do leitor.',
      };
    }
  },

  async deleteReaderAccess(
    id: string
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/admin/readers/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao excluir acesso de leitor.',
        };
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao excluir leitor:', err);
      return {
        success: false,
        error: 'Erro de conexão ao excluir acesso.',
      };
    }
  },

  async resetReaderPin(
    id: string,
    options?: { pinMode?: 'auto' | 'manual'; customPin?: string }
  ): Promise<{
    success: boolean;
    result?: ReaderAccessCreatedResult;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/admin/readers/${id}/reset-pin`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(options || {}),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao redefinir PIN do leitor.',
        };
      }

      return {
        success: true,
        result: {
          access: data.access,
          pin: data.pin,
        },
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao redefinir PIN do leitor:', err);
      return {
        success: false,
        error: 'Erro de conexão ao redefinir PIN do leitor.',
      };
    }
  },

  async clearAllReaders(): Promise<{
    success: boolean;
    count?: number;
    firestoreDeleted?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/readers', {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao limpar cadastros de leitores.',
        };
      }

      return {
        success: true,
        count: data.count,
        firestoreDeleted: data.firestoreDeleted,
        message: data.message,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao limpar leitores:', err);
      return {
        success: false,
        error: 'Erro de conexão ao limpar cadastros de leitores.',
      };
    }
  },

  async getFirebaseStatus(): Promise<{
    success: boolean;
    status?: {
      type: string;
      isConnected: boolean;
      mode: string;
      projectId: string;
      databaseId: string;
      connectionError?: string;
      backupFileExists: boolean;
      totalReadersInFirestore?: number;
    };
    readerAccessesCount?: number;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/firebase/status', {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao obter status do Firebase.',
        };
      }
      return {
        success: true,
        status: data.status,
        readerAccessesCount: data.readerAccessesCount,
      };
    } catch (err) {
      console.error('[adminAuthService] Erro ao buscar status do Firebase:', err);
      return {
        success: false,
        error: 'Erro de conexão com o servidor ao consultar status do Firebase.',
      };
    }
  },

  async triggerFirebaseMigration(): Promise<{
    success: boolean;
    migratedCount?: number;
    totalLocalCount?: number;
    backupPath?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/firebase/migrate', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('[adminAuthService] Erro ao acionar migração do Firebase:', err);
      return {
        success: false,
        error: 'Erro de conexão ao sincronizar com o Firebase.',
      };
    }
  },

  async updateCredentials(params: {
    currentPassword: string;
    newUsername?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }): Promise<{
    success: boolean;
    username?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/update-credentials', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao atualizar credenciais do administrador.',
        };
      }
      return data;
    } catch (err: any) {
      console.error('[adminAuthService] Erro ao atualizar credenciais do administrador:', err);
      return {
        success: false,
        error: 'Erro de conexão ao atualizar credenciais do administrador.',
      };
    }
  },

  async generateWhatsAppMessage(params: {
    readerName: string;
    readerPhone?: string;
    bookTitle?: string;
    chapterTitle?: string;
    prompt?: string;
    messageType?: 'custom' | 'chapter_notification' | 'reading_feedback' | 'welcome';
  }): Promise<{
    success: boolean;
    message?: string;
    modelUsed?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/admin/generate-whatsapp-message', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao redigir mensagem com a IA.',
        };
      }
      return data;
    } catch (err: any) {
      console.error('[adminAuthService] Erro ao gerar mensagem com IA:', err);
      return {
        success: false,
        error: 'Erro de conexão ao gerar mensagem com a Inteligência Artificial.',
      };
    }
  },
};

