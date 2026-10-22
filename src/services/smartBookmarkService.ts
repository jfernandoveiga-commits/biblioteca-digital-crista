/**
 * Serviço de Marcador de Página Inteligente ("Continuar Lendo")
 * Persiste automaticamente o progresso exato da rolagem, parágrafo e percentual de leitura
 * no localStorage e sincroniza entre os componentes da biblioteca.
 */

export interface SmartBookmark {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  chapterNumberText: string;
  scrollY: number;
  percentage: number;
  paragraphIndex?: number;
  textSnippet?: string;
  updatedAt: string; // ISO 8601
}

const LATEST_BOOKMARK_KEY = 'bib_smart_bookmark_latest';
const BOOKMARK_PREFIX = 'bib_smart_bookmark_book_';
const BOOKMARK_EVENT_NAME = 'bib-smart-bookmark-changed';

export const smartBookmarkService = {
  /**
   * Salva ou atualiza a posição do marcador de leitura
   */
  saveBookmark(bookmark: SmartBookmark): void {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify(bookmark);
      localStorage.setItem(LATEST_BOOKMARK_KEY, payload);
      localStorage.setItem(`${BOOKMARK_PREFIX}${bookmark.bookId}`, payload);

      // Notifica componentes em tempo real (ex: catálogo da biblioteca e modais)
      window.dispatchEvent(
        new CustomEvent(BOOKMARK_EVENT_NAME, { detail: bookmark })
      );
    } catch (err) {
      console.warn('[smartBookmarkService] Erro ao salvar marcador local:', err);
    }
  },

  /**
   * Obtém o último marcador registrado na biblioteca
   */
  getLatestBookmark(): SmartBookmark | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LATEST_BOOKMARK_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SmartBookmark;
    } catch {
      return null;
    }
  },

  /**
   * Obtém o marcador de um livro específico
   */
  getBookBookmark(bookId: string): SmartBookmark | null {
    if (typeof window === 'undefined' || !bookId) return null;
    try {
      const raw = localStorage.getItem(`${BOOKMARK_PREFIX}${bookId}`);
      if (!raw) return null;
      return JSON.parse(raw) as SmartBookmark;
    } catch {
      return null;
    }
  },

  /**
   * Limpa o marcador quando o leitor conclui a obra ou decide reiniciar
   */
  clearBookmark(bookId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      if (bookId) {
        localStorage.removeItem(`${BOOKMARK_PREFIX}${bookId}`);
        const latest = this.getLatestBookmark();
        if (latest && latest.bookId === bookId) {
          localStorage.removeItem(LATEST_BOOKMARK_KEY);
        }
      } else {
        localStorage.removeItem(LATEST_BOOKMARK_KEY);
      }
      window.dispatchEvent(new CustomEvent(BOOKMARK_EVENT_NAME, { detail: null }));
    } catch (err) {
      console.warn('[smartBookmarkService] Erro ao limpar marcador:', err);
    }
  },

  /**
   * Inscreve um ouvinte para alterações no marcador
   */
  subscribe(callback: (bookmark: SmartBookmark | null) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SmartBookmark | null>;
      callback(customEvent.detail || null);
    };

    window.addEventListener(BOOKMARK_EVENT_NAME, handler);
    return () => {
      window.removeEventListener(BOOKMARK_EVENT_NAME, handler);
    };
  },

  /**
   * Formata data/hora relativa de forma humanizada e elegante para o autor/leitor
   */
  formatRelativeTime(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 45) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) {
        return `Hoje às ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (diffDays === 1) {
        return `Ontem às ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return `${date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} às ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  },
};
