/**
 * Tipos de dados e metadados para a Bíblia Livre integrada à Biblioteca Digital.
 */

export type Testament = 'AT' | 'NT';

export interface BibleBookMeta {
  order: number;
  abbrev: string;
  name: string;
  testament: Testament;
  aliases: string[];
  totalChapters: number;
  totalVerses: number;
  chapterVerses: Record<number, number>;
}

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleBookData {
  abbrev: string;
  name: string;
  testament: Testament;
  aliases: string[];
  totalChapters: number;
  totalVerses: number;
  chapters: Record<string, BibleVerse[]>;
}

export interface BibleReferenceTarget {
  bookAbbrev: string;
  bookName: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  originalText: string;
}

export interface BibleLicenseInfo {
  name: string;
  shortName: string;
  version: string;
  textualVariant: string;
  authors: string;
  sourceUrl: string;
  websiteUrl: string;
  license: {
    name: string;
    url: string;
    notice: string;
  };
  totalBooks: number;
  totalVerses: number;
}
