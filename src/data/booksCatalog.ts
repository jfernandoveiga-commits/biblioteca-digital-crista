import { Book } from '../types/book';
import { chapter1 } from './sampleChapter';
import { chapter2 } from './chapter2';
import { eAiCrenteChapter1 } from './eAiCrenteChapter1';
import { eAiCrenteChapter2 } from './eAiCrenteChapter2';
import { eAiCrenteChapter3 } from './eAiCrenteChapter3';
import { eAiCrenteChapter4 } from './eAiCrenteChapter4';

export { chapter2, eAiCrenteChapter1, eAiCrenteChapter2, eAiCrenteChapter3, eAiCrenteChapter4 };

/**
 * Catálogo Oficial da Biblioteca Digital.
 *
 * DIRETRIZ EDITORIAL RIGOROSA:
 * - Apenas conteúdos genuinamente fornecidos pelo autor (Pr. Fernando Veiga)
 *   são publicados na biblioteca.
 * - A Inteligência Artificial está estritamente proibida de inventar,
 *   completar, reescrever ou simular capítulos ou livros.
 * - Textos de demonstração e fictícios foram removidos.
 * - Livros e capítulos em preparação são explicitamente identificados
 *   com status editorial aguardando publicação pelo autor.
 */

/**
 * Livro 1: ENTRE A CRUZ E O MUNDO
 * Autor: Pr. Fernando Veiga
 * Capítulos publicados: Capítulo 1 e Capítulo 2
 */
export const book1: Book = {
  id: 'entre-a-cruz-e-o-mundo',
  title: 'ENTRE A CRUZ E O MUNDO',
  author: 'Pr. Fernando Veiga',
  genre: 'Vida Cristã e Juventude',
  synopsis:
    'A jornada de jovens cristãos diante dos desafios, pressões sociais e escolhas cotidianas no mundo contemporâneo.',
  totalChapters: 2,
  status: 'published',
  chapters: [chapter1, chapter2],
};

/**
 * Livro 2: E Aí, CRENTE?
 * Autor: Pr. Fernando Veiga
 * Capítulos publicados: Capítulo 1 e Capítulo 2 publicados integralmente
 */
export const book2: Book = {
  id: 'e-ai-crente',
  title: 'E Aí, CRENTE?',
  author: 'Pr. Fernando Veiga',
  genre: 'Vida Cristã, Juventude e Discipulado',
  synopsis:
    'Reflexões, exortações e ensinamentos práticos do Pr. Fernando Veiga para a juventude cristã, abordando fé autêntica, santidade e vida no cotidiano.',
  totalChapters: 4,
  status: 'published',
  editorialNote:
    'Obra autoral do Pr. Fernando Veiga. Capítulos 1, 2, 3 e 4 publicados integralmente conforme texto original fornecido pelo autor.',
  chapters: [eAiCrenteChapter1, eAiCrenteChapter2, eAiCrenteChapter3, eAiCrenteChapter4],
};

/**
 * Catálogo Oficial Completo da Biblioteca Digital
 */
export const libraryBooks: Book[] = [book1, book2];

/**
 * Configuração Padrão de Disponibilidade Editorial dos Livros e Capítulos.
 *
 * REGRA ESTRITA DE SEGURANÇA E ACERVO:
 * - Novos capítulos são cadastrados com o status "Bloqueado" (false) por padrão.
 * - Apenas os capítulos explicitamente marcados como `true` (liberados pelo
 *   administrador no painel) ficam disponíveis para leitura pública.
 */
export const DEFAULT_CONTENT_AVAILABILITY = {
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
        'capitulo-2': true,
        'capitulo-3': true,
        'capitulo-4': false, // Novo capítulo: Bloqueado (Indisponível) por padrão
      },
    },
  },
};

/**
 * Função utilitária para avaliar se um capítulo está liberado para os leitores.
 * Retorna true APENAS se o livro estiver ativo e o capítulo estiver explicitamente com valor true.
 * Qualquer capítulo novo ou não liberado pelo administrador retorna false por padrão.
 */
export function isChapterAvailableToReaders(
  availability: { books?: Record<string, { enabled?: boolean; chapters?: Record<string, boolean> }> } | undefined,
  bookId: string,
  chapterId: string
): boolean {
  if (!availability?.books) return false;
  const bookConfig = availability.books[bookId];
  if (!bookConfig || bookConfig.enabled === false) return false;
  return bookConfig.chapters?.[chapterId] === true;
}
