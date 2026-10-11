import { Bookmark } from '../types/book';

/**
 * Serviço de armazenamento local para Marcadores e Favoritos dos Leitores.
 *
 * Garante privacidade absoluta: os marcadores são salvos no dispositivo do leitor.
 * Caso a funcionalidade seja desativada pelo administrador, os marcadores continuam
 * preservados no armazenamento e voltam a ser exibidos quando reativada.
 */

const BOOKMARKS_STORAGE_KEY = 'biblioteca_digital_bookmarks_v1';

export const bookmarkStorageService = {
  getAll(): Bookmark[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('[bookmarkStorageService] Erro ao carregar marcadores do localStorage:', err);
    }
    return [];
  },

  getByChapter(bookId: string, chapterId: string): Bookmark[] {
    const all = this.getAll();
    return all.filter((b) => b.bookId === bookId && b.chapterId === chapterId);
  },

  isBookmarked(bookId: string, chapterId: string, paragraphIndex: number): boolean {
    const all = this.getAll();
    return all.some(
      (b) => b.bookId === bookId && b.chapterId === chapterId && b.paragraphIndex === paragraphIndex
    );
  },

  toggleBookmark(bookmarkData: Omit<Bookmark, 'id' | 'createdAt'>): { isBookmarked: boolean; bookmark?: Bookmark } {
    const all = this.getAll();
    const existingIndex = all.findIndex(
      (b) =>
        b.bookId === bookmarkData.bookId &&
        b.chapterId === bookmarkData.chapterId &&
        b.paragraphIndex === bookmarkData.paragraphIndex
    );

    if (existingIndex >= 0) {
      // Remove
      all.splice(existingIndex, 1);
      this.saveAll(all);
      return { isBookmarked: false };
    } else {
      // Adiciona
      const newBookmark: Bookmark = {
        ...bookmarkData,
        id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      all.unshift(newBookmark);
      this.saveAll(all);
      return { isBookmarked: true, bookmark: newBookmark };
    }
  },

  remove(id: string): void {
    const all = this.getAll().filter((b) => b.id !== id);
    this.saveAll(all);
  },

  saveAll(bookmarks: Bookmark[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
      }
    } catch (err) {
      console.warn('[bookmarkStorageService] Falha ao salvar marcadores no localStorage:', err);
    }
  },
};
