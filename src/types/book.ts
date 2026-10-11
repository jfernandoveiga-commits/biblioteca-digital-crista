/**
 * Tipos e modelos de dados para a Biblioteca Digital.
 * Estrutura: Biblioteca -> Livro -> Capítulo -> Conteúdo
 * Suporta os três momentos editoriais do livro:
 * 1. Narrativa
 * 2. Textos Bíblicos para Leitura
 * 3. Perguntas para Reflexão
 */

export interface BiblicalText {
  reference: string;
  text: string;
}

export type EditorialStatus = 'published' | 'awaiting_publication' | 'in_preparation';

export interface Chapter {
  id: string;
  bookId: string;
  number: number;
  romanNumber?: string;
  title: string;
  subtitle?: string;
  content: string[]; // Parágrafos integrais da narrativa
  biblicalTexts?: BiblicalText[]; // Seção "Textos Bíblicos para Leitura"
  reflectionQuestions?: string[]; // Seção "Perguntas para Reflexão" (1 a 10)
  estimatedReadingTimeMinutes?: number;
  status?: EditorialStatus;
  editorialNote?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string;
  synopsis?: string;
  totalChapters: number;
  chapters: Chapter[];
  status?: EditorialStatus;
  editorialNote?: string;
}

export type ReadingTheme = 'paper' | 'cream' | 'sepia' | 'dark';
export type FontSizeScale = 'sm' | 'md' | 'lg' | 'xl';

export interface ReadingSettings {
  fontSize: FontSizeScale;
  theme: ReadingTheme;
}

export interface ReadingProgressState {
  chapterId: string;
  percentage: number; // 0 - 100
  lastReadAt?: string;
}

/**
 * Configurações de funcionalidades gerenciáveis pelo Administrador
 */
export interface LibraryFeaturesConfig {
  literaryReader: boolean; // Leitor literário
  integratedBible: boolean; // Bíblia integrada
  reflectionQuestions: boolean; // Perguntas para reflexão
  readingProgress: boolean; // Progresso e retomada da leitura
  bookmarks: boolean; // Marcadores e favoritos
  search: boolean; // Pesquisa de conteúdo
  audioReading: boolean; // Áudio e velocidade de leitura
  themeToggle: boolean; // Alternância entre tema claro e escuro
}

export const DEFAULT_LIBRARY_FEATURES: LibraryFeaturesConfig = {
  literaryReader: true,
  integratedBible: true,
  reflectionQuestions: true,
  readingProgress: true,
  bookmarks: true,
  search: true,
  audioReading: true,
  themeToggle: true,
};

/**
 * Disponibilidade individual de livros e capítulos
 */
export interface BookAvailability {
  enabled: boolean;
  chapters: Record<string, boolean>; // chapterId -> boolean
}

export interface ContentAvailabilityConfig {
  books: Record<string, BookAvailability>; // bookId -> BookAvailability
}

/**
 * Marcadores de leitura do leitor
 */
export interface Bookmark {
  id: string;
  bookId: string;
  bookTitle?: string;
  chapterId: string;
  chapterNumber?: number;
  chapterTitle?: string;
  paragraphIndex: number;
  textSnippet: string;
  createdAt: string;
}
