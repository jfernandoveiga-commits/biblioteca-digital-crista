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
  biblicalTexts?: BiblicalText[]; // Seção "Textos Bíblicos para Leitura" ou "Referências Bíblicas"
  biblicalTextsTitle?: string; // Título customizado da seção de textos bíblicos (ex: "Referências Bíblicas")
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
  audioReading: false,
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
 * Gestão de Acessos e PINs dos Leitores
 */
export type ReaderAccessStatus = 'active' | 'blocked' | 'revoked';

export type ReaderGender = 'Feminino' | 'Masculino' | 'Prefiro não informar';

export type ReaderMaritalStatus =
  | 'Solteiro(a)'
  | 'Casado(a)'
  | 'União estável'
  | 'Separado(a)'
  | 'Divorciado(a)'
  | 'Viúvo(a)'
  | 'Prefiro não informar';

export interface ReaderProfile {
  fullName: string; // Nome completo padronizado
  phone: string; // Dígitos normalizados com DDD (ex: "19981026699")
  phoneFormatted: string; // Telefone formatado para exibição: "(19) 98102-6699"
  birthDate: string; // YYYY-MM-DD
  gender: ReaderGender;
  maritalStatus: ReaderMaritalStatus;
  registeredAt: string;
  updatedAt: string;
}

export interface ReaderBookPermission {
  enabled: boolean; // true = Liberado, false = Bloqueado
  chapters: Record<string, boolean>; // [chapterId]: true = Liberado, false = Bloqueado
}

export interface ReaderContentPermissions {
  books: Record<string, ReaderBookPermission>;
}

export interface ReaderAccessRecord {
  id: string;
  name: string; // Identificação inicial ou nome do leitor
  pinHash?: string;
  pinSalt?: string;
  status: ReaderAccessStatus;
  createdAt: string;
  expiresAt: string | null; // Data de expiração opcional
  lastUsedAt: string | null;
  notes?: string;
  hasProfile?: boolean; // Indica se o leitor já concluiu o cadastro pessoal
  profile?: ReaderProfile | null; // Dados cadastrais vinculados
  contentPermissions?: ReaderContentPermissions | null; // Gestão individual de Liberado/Bloqueado de livros e capítulos
  updatedAt?: string;
}

export interface ReaderProfileUpdateInput {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: ReaderGender;
  maritalStatus: ReaderMaritalStatus;
}

export interface ReaderAccessCreateInput {
  name: string;
  pinMode: 'auto' | 'manual';
  customPin?: string;
  expiresAt?: string | null;
  notes?: string;
  contentPermissions?: ReaderContentPermissions;
}

export interface ReaderAccessCreatedResult {
  access: ReaderAccessRecord;
  pin: string; // Exibido uma única vez ao administrador
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
