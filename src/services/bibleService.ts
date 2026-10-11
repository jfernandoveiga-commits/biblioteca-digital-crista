import {
  BibleBookMeta,
  BibleBookData,
  BibleVerse,
  BibleReferenceTarget,
  BibleLicenseInfo,
} from '../types/bible';

// Cache em memória para livros já carregados
const bookDataCache = new Map<string, BibleBookData>();
let booksMetaCache: BibleBookMeta[] | null = null;
let aliasMapCache: Map<string, BibleBookMeta> | null = null;
let licenseCache: BibleLicenseInfo | null = null;

/**
 * Carrega a lista com os metadados dos 66 livros bíblicos
 */
export async function getBooksSummary(): Promise<BibleBookMeta[]> {
  if (booksMetaCache) return booksMetaCache;
  try {
    const res = await fetch('/bible/books.json');
    if (!res.ok) throw new Error(`Falha ao carregar índice de livros: ${res.statusText}`);
    const data: BibleBookMeta[] = await res.json();
    booksMetaCache = data;

    // Inicializa o mapa de aliases para busca ultrarrápida de referências
    aliasMapCache = new Map();
    for (const b of data) {
      aliasMapCache.set(b.name.toLowerCase(), b);
      aliasMapCache.set(b.abbrev.toLowerCase(), b);
      for (const a of b.aliases) {
        aliasMapCache.set(a.toLowerCase(), b);
      }
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar lista de livros da Bíblia:', error);
    return [];
  }
}

/**
 * Carrega informações oficiais de licença e autoria da Bíblia Livre
 */
export async function getBibleLicenseInfo(): Promise<BibleLicenseInfo | null> {
  if (licenseCache) return licenseCache;
  try {
    const res = await fetch('/bible/metadata.json');
    if (!res.ok) throw new Error('Falha ao carregar metadados da Bíblia Livre');
    licenseCache = await res.json();
    return licenseCache;
  } catch (error) {
    console.error('Erro ao carregar metadados de licença:', error);
    return null;
  }
}

/**
 * Carrega o conteúdo integral de um livro bíblico específico
 */
export async function getBookData(abbrev: string): Promise<BibleBookData | null> {
  const upper = abbrev.toUpperCase();
  if (bookDataCache.has(upper)) {
    return bookDataCache.get(upper)!;
  }

  try {
    const res = await fetch(`/bible/data/${upper}.json`);
    if (!res.ok) throw new Error(`Livro ${upper} não encontrado: ${res.statusText}`);
    const data: BibleBookData = await res.json();
    bookDataCache.set(upper, data);
    return data;
  } catch (error) {
    console.error(`Erro ao carregar texto do livro ${abbrev}:`, error);
    return null;
  }
}

/**
 * Obtém os versículos de um capítulo com suporte a intervalo
 */
export async function getChapterVerses(
  bookAbbrev: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number
): Promise<{ verses: BibleVerse[]; allChapterVerses: BibleVerse[]; book: BibleBookData } | null> {
  const book = await getBookData(bookAbbrev);
  if (!book) return null;

  const chapterList = book.chapters[String(chapter)] || [];
  if (chapterList.length === 0) return null;

  let filtered = chapterList;
  if (verseStart !== undefined) {
    const start = verseStart;
    const end = verseEnd !== undefined ? verseEnd : verseStart;
    filtered = chapterList.filter((v) => v.verse >= start && v.verse <= end);
  }

  return {
    verses: filtered,
    allChapterVerses: chapterList,
    book,
  };
}

/**
 * Interpreta uma string de referência bíblica em português
 * Exemplos aceitos:
 * "Salmo 1:1-3", "Salmo 1", "Romanos 12:2", "1 Coríntios 10:23-24", "Mateus 5:13-16", "1 João 3:16"
 */
export async function parseBibleReference(rawText: string): Promise<BibleReferenceTarget | null> {
  if (!rawText || typeof rawText !== 'string') return null;

  // Garante que o mapa de aliases está carregado
  if (!aliasMapCache) {
    await getBooksSummary();
  }
  if (!aliasMapCache) return null;

  const clean = rawText.trim().replace(/[.,;]+$/, '');

  // Regex para capturar:
  // Grupo 1: Nome do livro (ex: "1 Coríntios", "Salmo", "Romanos", "Cântico dos Cânticos")
  // Grupo 2: Capítulo
  // Grupo 3: Versículo inicial (opcional)
  // Grupo 4: Versículo final (opcional)
  const regex = /^([1-3]?\s*[A-Za-zÀ-ÿ]+(?:\s+dos\s+[A-Za-zÀ-ÿ]+|\s+[A-Za-zÀ-ÿ]+)?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i;
  const match = clean.match(regex);
  if (!match) return null;

  const rawBook = match[1].trim().toLowerCase();
  const chapter = parseInt(match[2], 10);
  const verseStart = match[3] ? parseInt(match[3], 10) : undefined;
  const verseEnd = match[4]
    ? parseInt(match[4], 10)
    : verseStart !== undefined
    ? verseStart
    : undefined;

  const found = aliasMapCache.get(rawBook);
  if (!found) return null;

  return {
    bookAbbrev: found.abbrev,
    bookName: found.name,
    chapter,
    verseStart,
    verseEnd,
    originalText: clean,
  };
}
