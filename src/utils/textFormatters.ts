/**
 * Utilitários de Formatação, Validação e Cálculo de Idade
 * em conformidade com as regras editoriais e gramaticais da Biblioteca Digital.
 */

/**
 * Preposições e partículas comuns de sobrenomes da língua portuguesa
 * que permanecem em minúsculas (a menos que sejam a primeira palavra do nome).
 */
const LOWERCASE_PARTICLES = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
]);

/**
 * Formata um nome completo para o padrão de iniciais maiúsculas com partículas em minúsculas.
 * Preserva acentuação (ex: José, Ângela, Conceição, Ávila, Müller).
 *
 * Exemplos:
 * "JOSÉ FERNANDO VEIGA" -> "José Fernando Veiga"
 * "josé fernando da silva" -> "José Fernando da Silva"
 * "jOsÉ fErNaNdO vEiGa" -> "José Fernando Veiga"
 * "MARIA DAS DORES DE SOUZA" -> "Maria das Dores de Souza"
 */
export function formatFullName(input: string): string {
  if (!input) return '';

  // Remove espaços múltiplos e nas extremidades
  const clean = input.trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  const words = clean.split(' ');

  const formattedWords = words.map((word, index) => {
    if (!word) return '';

    // Se houver hífen no nome composto (ex: "Silva-Santos"), trata cada parte
    if (word.includes('-')) {
      return word
        .split('-')
        .map((part) => formatWord(part, false))
        .join('-');
    }

    // Se houver apóstrofo (ex: "D'Ávila", "O'Connor"), preserva capitalização após apóstrofo
    if (word.includes("'")) {
      return word
        .split("'")
        .map((part, pIdx) => {
          if (pIdx === 0 && part.toLowerCase() === 'd') return 'd';
          return formatWord(part, false);
        })
        .join("'");
    }

    const lower = word.toLowerCase();

    // Primeira palavra sempre começa com maiúscula.
    // Palavras intermediárias que sejam partículas ("de", "da", "do", "das", "dos", "e") ficam em minúsculas.
    if (index > 0 && LOWERCASE_PARTICLES.has(lower)) {
      return lower;
    }

    return formatWord(word, index === 0);
  });

  return formattedWords.join(' ');
}

function formatWord(w: string, _isFirst: boolean): string {
  if (!w) return '';
  const lower = w.toLowerCase();
  // Capitaliza o primeiro caractere Unicode adequadamente
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Normaliza o telefone para conter apenas os dígitos.
 * Ex: "(19) 98102-6699" -> "19981026699"
 */
export function normalizePhone(input: string): string {
  if (!input) return '';
  return input.replace(/\D/g, '');
}

/**
 * Formata um telefone celular brasileiro no padrão oficial:
 * "(19) 98102-6699" ou enquanto o usuário digita.
 */
export function formatPhoneNumber(input: string): string {
  const digits = normalizePhone(input).slice(0, 11);

  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    // Número fixo ou celular incompleto
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // Celular padrão brasileiro de 11 dígitos com o nono dígito (9): (DD) 9XXXX-XXXX
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Validação rigorosa de telefone celular brasileiro (DDD válido + 11 dígitos iniciando por 9)
 */
export function validateBrazilianMobilePhone(input: string): {
  isValid: boolean;
  error?: string;
  normalized: string;
} {
  const digits = normalizePhone(input);

  if (!digits) {
    return { isValid: false, error: 'Por favor, informe o telefone celular com DDD.', normalized: '' };
  }

  if (digits.length < 11) {
    return {
      isValid: false,
      error: `Número incompleto. Um celular brasileiro com DDD deve ter 11 dígitos (atualmente tem ${digits.length}).`,
      normalized: digits,
    };
  }

  if (digits.length > 11) {
    return {
      isValid: false,
      error: 'O número informado possui dígitos a mais. O formato é (DD) 9XXXX-XXXX.',
      normalized: digits,
    };
  }

  const ddd = parseInt(digits.slice(0, 2), 10);
  // DDDs válidos no Brasil (11 a 99 com faixas reais da ANATEL)
  const validDDDs = new Set([
    11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
    21, 22, 24, // RJ
    27, 28, // ES
    31, 32, 33, 34, 35, 37, 38, // MG
    41, 42, 43, 44, 45, 46, // PR
    47, 48, 49, // SC
    51, 53, 54, 55, // RS
    61, // DF/GO
    62, 64, // GO
    63, // TO
    65, 66, // MT
    67, // MS
    68, // AC
    69, // RO
    71, 73, 74, 75, 77, // BA
    79, // SE
    81, 87, // PE
    82, // AL
    83, // PB
    84, // RN
    85, 88, // CE
    86, 89, // PI
    91, 93, 94, // PA
    92, 97, // AM
    95, // RR
    96, // AP
    98, 99, // MA
  ]);

  if (!validDDDs.has(ddd)) {
    return {
      isValid: false,
      error: `O DDD (${digits.slice(0, 2)}) não é um código de área brasileiro válido.`,
      normalized: digits,
    };
  }

  const ninthDigit = digits.charAt(2);
  if (ninthDigit !== '9') {
    return {
      isValid: false,
      error: 'Telefones celulares brasileiros devem iniciar pelo dígito 9 após o DDD (ex: (19) 9XXXX-XXXX).',
      normalized: digits,
    };
  }

  return { isValid: true, normalized: digits };
}

export interface DetailedAge {
  years: number;
  months: number;
  days: number;
  formatted: string;
  isValid: boolean;
  error?: string;
}

/**
 * Calcula a idade detalhada e exata (anos, meses e dias) a partir de uma data de nascimento (YYYY-MM-DD),
 * considerando meses com diferentes durações, anos bissextos e rejeitando datas futuras ou inválidas.
 */
export function calculateDetailedAge(birthDateInput: string, referenceDate: Date = new Date()): DetailedAge {
  if (!birthDateInput) {
    return {
      years: 0,
      months: 0,
      days: 0,
      formatted: 'Informe a data de nascimento',
      isValid: false,
      error: 'Data de nascimento não fornecida.',
    };
  }

  // Suporta YYYY-MM-DD
  const parts = birthDateInput.split('-');
  if (parts.length !== 3) {
    return {
      years: 0,
      months: 0,
      days: 0,
      formatted: 'Data inválida',
      isValid: false,
      error: 'Formato de data inválido. Use o seletor de calendário.',
    };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed no JS
  const day = parseInt(parts[2], 10);

  const birthDate = new Date(year, month, day);

  if (
    isNaN(birthDate.getTime()) ||
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month ||
    birthDate.getDate() !== day
  ) {
    return {
      years: 0,
      months: 0,
      days: 0,
      formatted: 'Data inválida',
      isValid: false,
      error: 'A data informada não existe no calendário.',
    };
  }

  // Validação: não permitir datas futuras
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  if (birthDate.getTime() > today.getTime()) {
    return {
      years: 0,
      months: 0,
      days: 0,
      formatted: 'Data futura não permitida',
      isValid: false,
      error: 'A data de nascimento não pode ser futura.',
    };
  }

  // Validação de limite biológico razoável (mais de 130 anos)
  if (today.getFullYear() - year > 130) {
    return {
      years: 0,
      months: 0,
      days: 0,
      formatted: 'Ano fora do limite',
      isValid: false,
      error: 'O ano de nascimento informado está fora do intervalo permitido.',
    };
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    // Pega o número de dias do mês anterior ao atual
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonthDate.getDate();
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Formatação legível em português
  const yearText = `${years} ${years === 1 ? 'ano' : 'anos'}`;
  const monthText = `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const dayText = `${days} ${days === 1 ? 'dia' : 'dias'}`;

  const formatted = `${yearText}, ${monthText} e ${dayText}`;

  return {
    years,
    months,
    days,
    formatted,
    isValid: true,
  };
}

/**
 * Padroniza e higieniza qualquer PIN de acesso:
 * - Garante conversão estrita para string (evitando falhas quando o valor for numérico)
 * - Remove espaços no início e no final
 * - Remove espaços acidentais internos (espaço comum, quebra de linha, tabs)
 * - Remove caracteres invisíveis/zero-width (U+200B, U+200C, U+200D, U+FEFF, U+00A0 etc.)
 * - Remove hífens decorativos acidentais (ex: "123-456" -> "123456")
 */
export function standardizePin(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .trim()
    .replace(/[\s\u200B-\u200D\uFEFF\u00A0-]+/g, '');
}

/**
 * Valida se o formato do PIN padronizado atende aos requisitos do sistema (4 a 12 caracteres).
 */
export function isPinFormatValid(input: unknown): boolean {
  const pin = standardizePin(input);
  return pin.length >= 4 && pin.length <= 12;
}
