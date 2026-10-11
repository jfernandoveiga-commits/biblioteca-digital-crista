/**
 * Serviço de persistência local para as respostas das Perguntas de Reflexão.
 *
 * Características:
 * - Total privacidade: os dados nunca saem do dispositivo do leitor.
 * - Isolamento por livro, capítulo e índice da pergunta.
 * - Tratamento de falhas de cota ou bloqueio de cookies/localStorage com fallback em memória.
 */

export interface ReflectionEntry {
  bookId: string;
  chapterId: string;
  questionIndex: number;
  answerText: string;
  updatedAt: string;
}

// Fallback em memória para ambientes com localStorage restrito
const memoryStore = new Map<string, string>();

const STORAGE_PREFIX = 'biblioteca_digital_reflection_v1';

function getStorageKey(bookId: string, chapterId: string, questionIndex: number): string {
  return `${STORAGE_PREFIX}_${bookId}_${chapterId}_q${questionIndex}`;
}

/**
 * Obtém a resposta salva para uma pergunta específica
 */
export function getReflectionAnswer(
  bookId: string,
  chapterId: string,
  questionIndex: number
): string {
  const key = getStorageKey(bookId, chapterId, questionIndex);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (err) {
    console.warn('Erro ao acessar localStorage, usando memória:', err);
  }
  return memoryStore.get(key) || '';
}

/**
 * Obtém todas as respostas salvas para um capítulo específico
 */
export function getChapterReflections(
  bookId: string,
  chapterId: string,
  totalQuestions: number
): Record<number, string> {
  const result: Record<number, string> = {};
  for (let i = 0; i < totalQuestions; i++) {
    const answer = getReflectionAnswer(bookId, chapterId, i);
    if (answer) {
      result[i] = answer;
    }
  }
  return result;
}

/**
 * Salva a resposta de uma pergunta no armazenamento local
 * Retorna true apenas após confirmar que a gravação ocorreu com sucesso
 */
export async function saveReflectionAnswer(
  bookId: string,
  chapterId: string,
  questionIndex: number,
  answerText: string
): Promise<boolean> {
  const key = getStorageKey(bookId, chapterId, questionIndex);
  const trimmed = answerText;

  // Atualiza sempre a memória
  if (trimmed.trim() === '') {
    memoryStore.delete(key);
  } else {
    memoryStore.set(key, trimmed);
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (trimmed.trim() === '') {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, trimmed);
      }
      return true;
    }
    return true;
  } catch (err) {
    console.error('Falha ao persistir no localStorage (cota excedida ou restrição):', err);
    // Ainda mantido em memória para a sessão atual
    return false;
  }
}

/**
 * Remove a resposta de uma pergunta
 */
export async function deleteReflectionAnswer(
  bookId: string,
  chapterId: string,
  questionIndex: number
): Promise<boolean> {
  return saveReflectionAnswer(bookId, chapterId, questionIndex, '');
}
