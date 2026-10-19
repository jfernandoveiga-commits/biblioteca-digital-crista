import { Book } from '../types/book';
import { chapter1 } from './sampleChapter';
import { chapter2 } from './chapter2';
import { eAiCrenteChapter1 } from './eAiCrenteChapter1';
import { eAiCrenteChapter2 } from './eAiCrenteChapter2';

export { chapter2, eAiCrenteChapter1, eAiCrenteChapter2 };

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
 * Livro 2: E AÍ, CRENTE!
 * Autor: Pr. Fernando Veiga
 * Capítulos publicados: Capítulo 1 e Capítulo 2 publicados integralmente
 */
export const book2: Book = {
  id: 'e-ai-crente',
  title: 'E AÍ, CRENTE!',
  author: 'Pr. Fernando Veiga',
  genre: 'Vida Cristã, Juventude e Discipulado',
  synopsis:
    'Reflexões, exortações e ensinamentos práticos do Pr. Fernando Veiga para a juventude cristã, abordando fé autêntica, santidade e vida no cotidiano.',
  totalChapters: 2,
  status: 'published',
  editorialNote:
    'Obra autoral do Pr. Fernando Veiga. Capítulos 1 e 2 publicados integralmente conforme texto original fornecido pelo autor.',
  chapters: [eAiCrenteChapter1, eAiCrenteChapter2],
};

/**
 * Catálogo Oficial Completo da Biblioteca Digital
 */
export const libraryBooks: Book[] = [book1, book2];
