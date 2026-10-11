import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

/* ==========================================================================
   CONFIGURAÇÃO E PERSISTÊNCIA DE SEGURANÇA
   ========================================================================== */

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const CONFIG_FILE_PATH =
  process.env.SECURITY_CONFIG_FILE || path.join(DATA_DIR, 'security-config.json');

const SESSION_SECRET = (process.env.SESSION_SECRET || 'bib-dig-secure-session-salt-2025').trim();

// Credenciais administrativas configuradas via variáveis de ambiente privadas (Render / .env)
const ENV_ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ENV_ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'admin2025').trim();
const ENV_READER_PIN = (process.env.ACCESS_PIN || process.env.PIN || '1234').trim();

export interface LibraryFeaturesConfig {
  literaryReader: boolean;
  integratedBible: boolean;
  reflectionQuestions: boolean;
  readingProgress: boolean;
  bookmarks: boolean;
  search: boolean;
  audioReading: boolean;
  themeToggle: boolean;
}

export interface BookAvailability {
  enabled: boolean;
  chapters: Record<string, boolean>;
}

export interface ContentAvailabilityConfig {
  books: Record<string, BookAvailability>;
}

const DEFAULT_FEATURES: LibraryFeaturesConfig = {
  literaryReader: true,
  integratedBible: true,
  reflectionQuestions: true,
  readingProgress: true,
  bookmarks: true,
  search: true,
  audioReading: true,
  themeToggle: true,
};

const DEFAULT_CONTENT_AVAILABILITY: ContentAvailabilityConfig = {
  books: {
    'entre-a-cruz-e-o-mundo': {
      enabled: true,
      chapters: {
        'capitulo-1': true,
        'capitulo-2': true,
      },
    },
    'e-ai-crentes-ok': {
      enabled: true,
      chapters: {},
    },
  },
};

export type ReaderAccessStatus = 'active' | 'blocked' | 'revoked';

export interface ReaderAccessRecord {
  id: string;
  name: string;
  pinHash: string;
  pinSalt: string;
  status: ReaderAccessStatus;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  notes?: string;
}

interface SecurityConfig {
  pinHash: string;
  pinSalt: string;
  isLibraryLocked: boolean;
  lockReason: string;
  lastPinChangedAt: string;
  lastRevokedAt: string | null;
  adminUsername: string;
  adminPasswordHash: string;
  adminPasswordSalt: string;
  sessionsRevokedBefore: number;
  features: LibraryFeaturesConfig;
  contentAvailability: ContentAvailabilityConfig;
  readerAccesses: ReaderAccessRecord[];
}

// Funções criptográficas de tempo constante (PBKDF2)
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin.trim(), salt, 10000, 32, 'sha256').toString('hex');
}

function verifyPinHash(candidatePin: string, storedHash: string, salt: string): boolean {
  try {
    const candidateHash = hashPin(candidatePin, salt);
    const bufCandidate = Buffer.from(candidateHash, 'hex');
    const bufStored = Buffer.from(storedHash, 'hex');
    if (bufCandidate.length !== bufStored.length) return false;
    return crypto.timingSafeEqual(bufCandidate, bufStored);
  } catch {
    return false;
  }
}

function hashAdminPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 30000, 32, 'sha512').toString('hex');
}

function verifyAdminPassword(candidatePassword: string, storedHash: string, salt: string): boolean {
  try {
    const candidateHash = hashAdminPassword(candidatePassword, salt);
    const bufCandidate = Buffer.from(candidateHash, 'hex');
    const bufStored = Buffer.from(storedHash, 'hex');
    if (bufCandidate.length !== bufStored.length) return false;
    return crypto.timingSafeEqual(bufCandidate, bufStored);
  } catch {
    return false;
  }
}

// Inicialização ou carregamento da configuração de segurança persistente
function loadOrCreateSecurityConfig(): SecurityConfig {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SecurityConfig>;

      // Validação de integridade do arquivo carregado
      if (parsed.pinHash && parsed.pinSalt && parsed.adminPasswordHash && parsed.adminPasswordSalt) {
        // Se a variável de ambiente do admin foi modificada e difere, atualiza o username
        const features: LibraryFeaturesConfig = {
          ...DEFAULT_FEATURES,
          ...(parsed.features || {}),
        };

        const contentAvailability: ContentAvailabilityConfig = {
          books: {
            ...DEFAULT_CONTENT_AVAILABILITY.books,
            ...(parsed.contentAvailability?.books || {}),
          },
        };

        const readerAccesses: ReaderAccessRecord[] = Array.isArray(parsed.readerAccesses)
          ? parsed.readerAccesses
          : [];

        // Se a lista estiver vazia e já houver um pinHash válido, cria o primeiro registro de acesso inicial
        if (readerAccesses.length === 0 && parsed.pinHash && parsed.pinSalt) {
          readerAccesses.push({
            id: 'access-initial-default',
            name: 'Acesso Padrão Inicial',
            pinHash: parsed.pinHash,
            pinSalt: parsed.pinSalt,
            status: 'active',
            createdAt: parsed.lastPinChangedAt || new Date().toISOString(),
            expiresAt: null,
            lastUsedAt: null,
            notes: 'Acesso inicial configurado pelo sistema',
          });
        }

        const config: SecurityConfig = {
          pinHash: parsed.pinHash,
          pinSalt: parsed.pinSalt,
          isLibraryLocked: Boolean(parsed.isLibraryLocked),
          lockReason: parsed.lockReason || '',
          lastPinChangedAt: parsed.lastPinChangedAt || new Date().toISOString(),
          lastRevokedAt: parsed.lastRevokedAt || null,
          adminUsername: parsed.adminUsername || ENV_ADMIN_USERNAME,
          adminPasswordHash: parsed.adminPasswordHash,
          adminPasswordSalt: parsed.adminPasswordSalt,
          sessionsRevokedBefore: Number(parsed.sessionsRevokedBefore) || 0,
          features,
          contentAvailability,
          readerAccesses,
        };

        // Salva novamente para garantir que chaves novas sejam persistidas no JSON
        saveSecurityConfig(config);
        return config;
      }
    }
  } catch (err) {
    console.warn('[Segurança] Falha ao ler arquivo de configuração persistente. Inicializando novo:', err);
  }

  // Gera nova configuração inicial a partir das variáveis de ambiente
  const initialPinSalt = crypto.randomBytes(16).toString('hex');
  const initialPinHash = hashPin(ENV_READER_PIN, initialPinSalt);

  const initialAdminSalt = crypto.randomBytes(16).toString('hex');
  const initialAdminHash = hashAdminPassword(ENV_ADMIN_PASSWORD, initialAdminSalt);

  const initialConfig: SecurityConfig = {
    pinHash: initialPinHash,
    pinSalt: initialPinSalt,
    isLibraryLocked: false,
    lockReason: '',
    lastPinChangedAt: new Date().toISOString(),
    lastRevokedAt: null,
    adminUsername: ENV_ADMIN_USERNAME,
    adminPasswordHash: initialAdminHash,
    adminPasswordSalt: initialAdminSalt,
    sessionsRevokedBefore: 0,
    features: DEFAULT_FEATURES,
    contentAvailability: DEFAULT_CONTENT_AVAILABILITY,
    readerAccesses: [
      {
        id: 'access-initial-default',
        name: 'Acesso Geral Inicial',
        pinHash: initialPinHash,
        pinSalt: initialPinSalt,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
        notes: 'PIN inicial configurado via variáveis de ambiente',
      },
    ],
  };

  saveSecurityConfig(initialConfig);
  return initialConfig;
}

function saveSecurityConfig(config: SecurityConfig): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${CONFIG_FILE_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(config, null, 2), 'utf-8');
    fs.renameSync(tempFile, CONFIG_FILE_PATH);
  } catch (err) {
    console.error('[Segurança] Erro ao persistir configuração de segurança no disco:', err);
  }
}

// Instância ativa em memória
const securityConfig: SecurityConfig = loadOrCreateSecurityConfig();

/* ==========================================================================
   SESSÕES DOS LEITORES E DOS ADMINISTRADORES
   ========================================================================== */

interface SessionRecord {
  token: string;
  accessId?: string;
  readerName?: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

interface AdminSessionRecord {
  token: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

const activeReaderSessions = new Map<string, SessionRecord>();
const activeAdminSessions = new Map<string, AdminSessionRecord>();

const READER_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const ADMIN_SESSION_LIFETIME_MS = 4 * 60 * 60 * 1000; // 4 horas

/* ==========================================================================
   RATE LIMITING E PROTEÇÃO CONTRA FORÇA BRUTA
   ========================================================================== */

interface RateLimitEntry {
  attempts: number;
  lockedUntil: number;
  lastAttempt: number;
}

const readerRateLimitStore = new Map<string, RateLimitEntry>();
const adminRateLimitStore = new Map<string, RateLimitEntry>();

const MAX_READER_ATTEMPTS = 5;
const READER_LOCKOUT_MS = 60 * 1000; // 60 segundos

const MAX_ADMIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 300 * 1000; // 5 minutos de bloqueio para tentativas administrativas

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Limpeza periódica de sessões e rate limits expirados
setInterval(() => {
  const now = Date.now();

  for (const [token, record] of activeReaderSessions.entries()) {
    if (now > record.expiresAt || record.createdAt < securityConfig.sessionsRevokedBefore) {
      activeReaderSessions.delete(token);
    }
  }

  for (const [token, record] of activeAdminSessions.entries()) {
    if (now > record.expiresAt) {
      activeAdminSessions.delete(token);
    }
  }

  for (const [ip, entry] of readerRateLimitStore.entries()) {
    if (now > entry.lockedUntil && now - entry.lastAttempt > READER_LOCKOUT_MS * 5) {
      readerRateLimitStore.delete(ip);
    }
  }

  for (const [ip, entry] of adminRateLimitStore.entries()) {
    if (now > entry.lockedUntil && now - entry.lastAttempt > ADMIN_LOCKOUT_MS * 2) {
      adminRateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Helper para extrair token do cabeçalho Bearer ou Cookie
function extractReaderToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('bib_session=')) {
        return decodeURIComponent(cookie.substring('bib_session='.length)).trim();
      }
    }
  }

  return null;
}

function extractAdminToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('bib_admin_session=')) {
        return decodeURIComponent(cookie.substring('bib_admin_session='.length)).trim();
      }
    }
  }

  return null;
}

// Middleware para autorização de Administrador no servidor
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = extractAdminToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Acesso não autorizado. Autentique-se como administrador.',
    });
    return;
  }

  const session = activeAdminSessions.get(token);
  if (!session) {
    res.status(401).json({
      success: false,
      error: 'Sessão administrativa expirada ou inválida.',
    });
    return;
  }

  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    res.status(401).json({
      success: false,
      error: 'Sessão administrativa expirada. Efetue novo login.',
    });
    return;
  }

  next();
}

app.use(express.json());

/* ==========================================================================
   ROTAS DE AUTENTICAÇÃO E LEITURA (/api/auth)
   ========================================================================== */

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Biblioteca Digital',
    timestamp: new Date().toISOString(),
  });
});

// Consulta de sessão do leitor
app.get('/api/auth/session', (req, res) => {
  // Se o acesso geral à biblioteca estiver temporariamente bloqueado
  if (securityConfig.isLibraryLocked) {
    res.json({
      authenticated: false,
      isLocked: true,
      reason: 'library_locked',
      message: securityConfig.lockReason || 'O acesso à biblioteca está temporariamente pausado pela administração.',
      features: securityConfig.features,
      contentAvailability: securityConfig.contentAvailability,
    });
    return;
  }

  const token = extractReaderToken(req);
  if (!token) {
    res.json({
      authenticated: false,
      features: securityConfig.features,
      contentAvailability: securityConfig.contentAvailability,
    });
    return;
  }

  const session = activeReaderSessions.get(token);
  if (!session) {
    res.json({
      authenticated: false,
      features: securityConfig.features,
      contentAvailability: securityConfig.contentAvailability,
    });
    return;
  }

  if (Date.now() > session.expiresAt || session.createdAt < securityConfig.sessionsRevokedBefore) {
    activeReaderSessions.delete(token);
    res.json({
      authenticated: false,
      reason: 'revoked_or_expired',
      features: securityConfig.features,
      contentAvailability: securityConfig.contentAvailability,
    });
    return;
  }

  res.json({
    authenticated: true,
    expiresAt: session.expiresAt,
    features: securityConfig.features,
    contentAvailability: securityConfig.contentAvailability,
  });
});

// Configurações públicas e de disponibilidade da biblioteca
app.get('/api/library/config', (_req, res) => {
  res.json({
    success: true,
    features: securityConfig.features,
    contentAvailability: securityConfig.contentAvailability,
    isLibraryLocked: securityConfig.isLibraryLocked,
    lockReason: securityConfig.lockReason,
  });
});

// Verificação de permissão de acesso a livro/capítulo
app.get('/api/library/check-access/:bookId/:chapterId', (req, res) => {
  if (securityConfig.isLibraryLocked) {
    res.status(403).json({
      allowed: false,
      error: securityConfig.lockReason || 'O acesso à biblioteca está temporariamente pausado pela administração.',
    });
    return;
  }

  if (!securityConfig.features.literaryReader) {
    res.status(403).json({
      allowed: false,
      error: 'O leitor literário está temporariamente desativado pela administração.',
    });
    return;
  }

  const { bookId, chapterId } = req.params;
  const bookConfig = securityConfig.contentAvailability.books[bookId];
  if (bookConfig && bookConfig.enabled === false) {
    res.status(403).json({
      allowed: false,
      error: 'Este livro está temporariamente indisponível para leitura.',
    });
    return;
  }

  if (bookConfig && bookConfig.chapters && bookConfig.chapters[chapterId] === false) {
    res.status(403).json({
      allowed: false,
      error: 'Este capítulo está temporariamente indisponível para leitura.',
    });
    return;
  }

  res.json({ allowed: true });
});


// Validação do PIN do leitor
app.post('/api/auth/verify-pin', (req, res) => {
  // Se a biblioteca estiver bloqueada pelo painel administrativo
  if (securityConfig.isLibraryLocked) {
    res.status(403).json({
      success: false,
      isLocked: true,
      error: securityConfig.lockReason || 'O acesso à biblioteca está temporariamente bloqueado pela administração.',
    });
    return;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const entry = readerRateLimitStore.get(ip) || { attempts: 0, lockedUntil: 0, lastAttempt: now };

  if (entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    res.status(429).json({
      success: false,
      error: `Muitas tentativas incorretas. Aguarde ${remainingSeconds} segundo${
        remainingSeconds > 1 ? 's' : ''
      } para tentar novamente.`,
      retryAfter: remainingSeconds,
    });
    return;
  }

  const { pin } = req.body || {};

  if (!pin || typeof pin !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Por favor, informe o PIN de acesso.',
    });
    return;
  }

  const cleanPin = pin.trim();

  // 1. Procura nas credenciais dos acessos cadastrados (acessos individuais)
  let matchedAccess: ReaderAccessRecord | null = null;
  const accesses = securityConfig.readerAccesses || [];

  for (const acc of accesses) {
    if (verifyPinHash(cleanPin, acc.pinHash, acc.pinSalt)) {
      matchedAccess = acc;
      break;
    }
  }

  // 2. Se não achou nos acessos individuais mas confere com o PIN legado geral
  if (!matchedAccess && verifyPinHash(cleanPin, securityConfig.pinHash, securityConfig.pinSalt)) {
    matchedAccess = {
      id: 'access-general',
      name: 'Acesso Geral',
      pinHash: securityConfig.pinHash,
      pinSalt: securityConfig.pinSalt,
      status: 'active',
      createdAt: securityConfig.lastPinChangedAt,
      expiresAt: null,
      lastUsedAt: null,
    };
  }

  // Se nenhum PIN conferiu: conta falha no rate limiter
  if (!matchedAccess) {
    entry.attempts += 1;
    entry.lastAttempt = now;

    if (entry.attempts >= MAX_READER_ATTEMPTS) {
      entry.lockedUntil = now + READER_LOCKOUT_MS;
      readerRateLimitStore.set(ip, entry);
      const remainingSeconds = Math.ceil(READER_LOCKOUT_MS / 1000);
      res.status(429).json({
        success: false,
        error: `Limite de tentativas excedido. Aguarde ${remainingSeconds} segundos antes de tentar novamente.`,
        retryAfter: remainingSeconds,
      });
      return;
    }

    readerRateLimitStore.set(ip, entry);
    const attemptsLeft = MAX_READER_ATTEMPTS - entry.attempts;

    res.status(401).json({
      success: false,
      error: 'PIN incorreto. Verifique os dígitos e tente novamente.',
      remainingAttempts: attemptsLeft,
    });
    return;
  }

  // Se o PIN confere, mas o acesso está BLOQUEADO
  if (matchedAccess.status === 'blocked') {
    res.status(403).json({
      success: false,
      isAccessBlocked: true,
      error: 'Este acesso foi temporariamente bloqueado pela administração.',
    });
    return;
  }

  // Se o PIN confere, mas o acesso foi REVOGADO
  if (matchedAccess.status === 'revoked') {
    res.status(403).json({
      success: false,
      isAccessRevoked: true,
      error: 'Este código de acesso foi revogado pela administração e não é mais válido.',
    });
    return;
  }

  // Se o PIN confere, mas o acesso possui data de expiração que já passou
  if (matchedAccess.expiresAt) {
    const expiryTime = new Date(matchedAccess.expiresAt).getTime();
    if (!isNaN(expiryTime) && now > expiryTime) {
      res.status(403).json({
        success: false,
        isAccessExpired: true,
        error: 'Este acesso expirou. Solicite um novo PIN ao administrador.',
      });
      return;
    }
  }

  // PIN válido e acesso ativo: reseta rate limit
  readerRateLimitStore.delete(ip);

  // Atualiza lastUsedAt do acesso e persiste
  if (matchedAccess.id && matchedAccess.id !== 'access-general') {
    const accInList = securityConfig.readerAccesses.find((a) => a.id === matchedAccess!.id);
    if (accInList) {
      accInList.lastUsedAt = new Date().toISOString();
      saveSecurityConfig(securityConfig);
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = now + READER_SESSION_LIFETIME_MS;

  activeReaderSessions.set(token, {
    token,
    accessId: matchedAccess.id,
    readerName: matchedAccess.name,
    createdAt: now,
    expiresAt,
    ip,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `bib_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(READER_SESSION_LIFETIME_MS / 1000)}`,
  ];
  if (isProduction) {
    cookieOptions.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieOptions.join('; '));

  res.json({
    success: true,
    token,
    expiresAt,
    readerName: matchedAccess.name,
  });
});

// Logout do leitor
app.post('/api/auth/logout', (req, res) => {
  const token = extractReaderToken(req);
  if (token) {
    activeReaderSessions.delete(token);
  }

  res.setHeader(
    'Set-Cookie',
    'bib_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );

  res.json({ success: true });
});

/* ==========================================================================
   ROTAS ADMINISTRATIVAS (/api/admin/*)
   ========================================================================== */

// 1. Verificação de sessão do administrador
app.get('/api/admin/session', (req, res) => {
  const token = extractAdminToken(req);
  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  const session = activeAdminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) activeAdminSessions.delete(token);
    res.json({ authenticated: false });
    return;
  }

  res.json({
    authenticated: true,
    username: session.username,
    expiresAt: session.expiresAt,
  });
});

// 2. Login administrativo
app.post('/api/admin/login', (req, res) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = adminRateLimitStore.get(ip) || { attempts: 0, lockedUntil: 0, lastAttempt: now };

  if (entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    res.status(429).json({
      success: false,
      error: `Acesso administrativo bloqueado por excesso de tentativas. Aguarde ${remainingSeconds} segundos.`,
      retryAfter: remainingSeconds,
    });
    return;
  }

  const { username, password } = req.body || {};

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Informe usuário e senha para login administrativo.',
    });
    return;
  }

  const cleanUser = username.trim();
  const targetUser = securityConfig.adminUsername || ENV_ADMIN_USERNAME;

  // Comparação de usuário
  const userMatches = cleanUser === targetUser;

  // Comparação de senha com tempo constante
  const passwordMatches =
    userMatches &&
    (verifyAdminPassword(password, securityConfig.adminPasswordHash, securityConfig.adminPasswordSalt) ||
      (password === ENV_ADMIN_PASSWORD && ENV_ADMIN_PASSWORD.length > 0));

  if (!userMatches || !passwordMatches) {
    entry.attempts += 1;
    entry.lastAttempt = now;

    if (entry.attempts >= MAX_ADMIN_ATTEMPTS) {
      entry.lockedUntil = now + ADMIN_LOCKOUT_MS;
      adminRateLimitStore.set(ip, entry);
      const remainingSeconds = Math.ceil(ADMIN_LOCKOUT_MS / 1000);
      res.status(429).json({
        success: false,
        error: `Muitas tentativas incorretas. Acesso bloqueado por ${Math.ceil(ADMIN_LOCKOUT_MS / 60000)} minutos.`,
        retryAfter: remainingSeconds,
      });
      return;
    }

    adminRateLimitStore.set(ip, entry);
    res.status(401).json({
      success: false,
      error: 'Credenciais administrativas incorretas.',
      remainingAttempts: MAX_ADMIN_ATTEMPTS - entry.attempts,
    });
    return;
  }

  // Sucesso
  adminRateLimitStore.delete(ip);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = now + ADMIN_SESSION_LIFETIME_MS;

  activeAdminSessions.set(token, {
    token,
    username: targetUser,
    createdAt: now,
    expiresAt,
    ip,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `bib_admin_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(ADMIN_SESSION_LIFETIME_MS / 1000)}`,
  ];
  if (isProduction) {
    cookieOptions.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieOptions.join('; '));

  res.json({
    success: true,
    token,
    username: targetUser,
    expiresAt,
  });
});

// 3. Logout administrativo
app.post('/api/admin/logout', (req, res) => {
  const token = extractAdminToken(req);
  if (token) {
    activeAdminSessions.delete(token);
  }

  res.setHeader(
    'Set-Cookie',
    'bib_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );

  res.json({ success: true });
});

// 4. Status administrativo do sistema (requer autenticação)
app.get('/api/admin/status', requireAdminAuth, (_req, res) => {
  res.json({
    success: true,
    isLibraryLocked: securityConfig.isLibraryLocked,
    lockReason: securityConfig.lockReason || '',
    activeReaderSessionsCount: activeReaderSessions.size,
    totalReadersCount: (securityConfig.readerAccesses || []).length,
    lastPinChangedAt: securityConfig.lastPinChangedAt,
    lastRevokedAt: securityConfig.lastRevokedAt,
    adminUsername: securityConfig.adminUsername,
    storageType: 'persistent_file',
    features: securityConfig.features,
    contentAvailability: securityConfig.contentAvailability,
  });
});

// 5. Alteração do PIN compartilhado dos leitores (requer autenticação)
app.post('/api/admin/update-pin', requireAdminAuth, (req, res) => {
  const { newPin, confirmPin, revokeExistingSessions = true } = req.body || {};

  if (!newPin || typeof newPin !== 'string' || newPin.trim().length < 4) {
    res.status(400).json({
      success: false,
      error: 'O novo PIN deve conter no mínimo 4 caracteres ou dígitos.',
    });
    return;
  }

  if (newPin.trim() !== String(confirmPin || '').trim()) {
    res.status(400).json({
      success: false,
      error: 'A confirmação do PIN não confere com o novo PIN digitado.',
    });
    return;
  }

  const cleanPin = newPin.trim();
  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPin(cleanPin, newSalt);

  securityConfig.pinHash = newHash;
  securityConfig.pinSalt = newSalt;
  securityConfig.lastPinChangedAt = new Date().toISOString();

  // Se solicitado (padrão ativo), revoga todas as sessões anteriores para exigir o novo PIN
  if (revokeExistingSessions) {
    activeReaderSessions.clear();
    securityConfig.sessionsRevokedBefore = Date.now();
    securityConfig.lastRevokedAt = new Date().toISOString();
  }

  saveSecurityConfig(securityConfig);

  res.json({
    success: true,
    message: 'PIN de acesso dos leitores atualizado com sucesso e salvo com persistência.',
    lastPinChangedAt: securityConfig.lastPinChangedAt,
    sessionsRevoked: Boolean(revokeExistingSessions),
  });
});

// 6. Bloqueio / Liberação temporária de novos acessos à biblioteca (requer autenticação)
app.post('/api/admin/toggle-lock', requireAdminAuth, (req, res) => {
  const { locked, reason } = req.body || {};

  securityConfig.isLibraryLocked = Boolean(locked);
  securityConfig.lockReason = typeof reason === 'string' ? reason.trim() : '';

  saveSecurityConfig(securityConfig);

  res.json({
    success: true,
    isLibraryLocked: securityConfig.isLibraryLocked,
    lockReason: securityConfig.lockReason,
    message: securityConfig.isLibraryLocked
      ? 'Acesso dos leitores à biblioteca foi temporariamente bloqueado.'
      : 'Acesso dos leitores à biblioteca foi liberado com sucesso.',
  });
});

// 7. Revogação de todas as sessões ativas dos leitores (requer autenticação)
app.post('/api/admin/revoke-sessions', requireAdminAuth, (_req, res) => {
  const count = activeReaderSessions.size;
  activeReaderSessions.clear();
  securityConfig.sessionsRevokedBefore = Date.now();
  securityConfig.lastRevokedAt = new Date().toISOString();

  saveSecurityConfig(securityConfig);

  res.json({
    success: true,
    count,
    message: `Todas as sessões de leitores (${count}) foram revogadas com sucesso. Novo PIN ou reautenticação será exigida de todos.`,
    lastRevokedAt: securityConfig.lastRevokedAt,
  });
});

// 8. Consulta e Alteração de Funcionalidades da Biblioteca (requer autenticação)
app.get('/api/admin/features', requireAdminAuth, (_req, res) => {
  res.json({
    success: true,
    features: securityConfig.features,
  });
});

app.post('/api/admin/features', requireAdminAuth, (req, res) => {
  const { features } = req.body || {};

  if (!features || typeof features !== 'object') {
    res.status(400).json({
      success: false,
      error: 'Parâmetro de funcionalidades inválido.',
    });
    return;
  }

  // Validação e mesclagem segura
  const allowedKeys: (keyof LibraryFeaturesConfig)[] = [
    'literaryReader',
    'integratedBible',
    'reflectionQuestions',
    'readingProgress',
    'bookmarks',
    'search',
    'audioReading',
    'themeToggle',
  ];

  for (const key of allowedKeys) {
    if (key in features && typeof features[key] === 'boolean') {
      securityConfig.features[key] = features[key];
    }
  }

  saveSecurityConfig(securityConfig);

  res.json({
    success: true,
    features: securityConfig.features,
    message: 'Funcionalidades da biblioteca atualizadas com sucesso.',
  });
});

// 9. Consulta e Alteração de Disponibilidade de Livros e Capítulos (requer autenticação)
app.get('/api/admin/content-availability', requireAdminAuth, (_req, res) => {
  res.json({
    success: true,
    contentAvailability: securityConfig.contentAvailability,
  });
});

app.post('/api/admin/content-availability', requireAdminAuth, (req, res) => {
  const { contentAvailability } = req.body || {};

  if (!contentAvailability || !contentAvailability.books || typeof contentAvailability.books !== 'object') {
    res.status(400).json({
      success: false,
      error: 'Estrutura de disponibilidade de conteúdo inválida.',
    });
    return;
  }

  // Atualização segura dos livros e capítulos
  for (const [bookId, bookData] of Object.entries(contentAvailability.books)) {
    if (typeof bookData === 'object' && bookData !== null) {
      const currentBook = securityConfig.contentAvailability.books[bookId] || {
        enabled: true,
        chapters: {},
      };

      if (typeof (bookData as any).enabled === 'boolean') {
        currentBook.enabled = (bookData as any).enabled;
      }

      if ((bookData as any).chapters && typeof (bookData as any).chapters === 'object') {
        currentBook.chapters = {
          ...currentBook.chapters,
          ...(bookData as any).chapters,
        };
      }

      securityConfig.contentAvailability.books[bookId] = currentBook;
    }
  }

  saveSecurityConfig(securityConfig);

  res.json({
    success: true,
    contentAvailability: securityConfig.contentAvailability,
    message: 'Disponibilidade de livros e capítulos atualizada com sucesso.',
  });
});

/* ==========================================================================
   10. GESTÃO DE ACESSOS E PINS DOS LEITORES (/api/admin/readers/*)
   ========================================================================== */

// Helper para sanitizar o registro de acesso (NUNCA expor hashes ou salts)
function sanitizeReaderAccess(acc: ReaderAccessRecord) {
  return {
    id: acc.id,
    name: acc.name,
    status: acc.status,
    createdAt: acc.createdAt,
    expiresAt: acc.expiresAt,
    lastUsedAt: acc.lastUsedAt,
    notes: acc.notes || '',
  };
}

// 10.1 Listar todos os acessos cadastrados
app.get('/api/admin/readers', requireAdminAuth, (_req, res) => {
  const list = (securityConfig.readerAccesses || []).map(sanitizeReaderAccess);
  res.json({
    success: true,
    readers: list,
  });
});

// 10.2 Criar novo PIN de leitor (individual, gerado ou manual)
app.post('/api/admin/readers', requireAdminAuth, (req, res) => {
  const { name, pinMode = 'auto', customPin, expiresAt = null, notes } = req.body || {};

  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (!cleanName || cleanName.length < 2) {
    res.status(400).json({
      success: false,
      error: 'Informe um nome ou identificador válido para o leitor (mínimo 2 caracteres).',
    });
    return;
  }

  let pinToAssign = '';

  if (pinMode === 'manual') {
    const rawPin = typeof customPin === 'string' ? customPin.trim() : '';
    if (!rawPin || rawPin.length < 4 || rawPin.length > 12) {
      res.status(400).json({
        success: false,
        error: 'O PIN manual deve conter entre 4 e 12 dígitos ou caracteres.',
      });
      return;
    }
    pinToAssign = rawPin;
  } else {
    // Modo automático: gera PIN numérico de 6 dígitos aleatório criptograficamente seguro
    const randomNum = crypto.randomInt(100000, 999999);
    pinToAssign = String(randomNum);
  }

  // Verifica se o PIN já está em uso por algum acesso existente ou se é duplicado
  const existingAccesses = securityConfig.readerAccesses || [];
  for (const existing of existingAccesses) {
    if (verifyPinHash(pinToAssign, existing.pinHash, existing.pinSalt)) {
      res.status(409).json({
        success: false,
        error: 'Este PIN já está em uso por outro leitor cadastrado. Escolha outro código ou gere automaticamente.',
      });
      return;
    }
  }

  // Também verifica contra o PIN mestre legado se ativo
  if (verifyPinHash(pinToAssign, securityConfig.pinHash, securityConfig.pinSalt)) {
    res.status(409).json({
      success: false,
      error: 'Este código coincide com o PIN mestre do sistema. Escolha um código diferente.',
    });
    return;
  }

  // Validação da data de expiração, se fornecida
  let cleanExpiresAt: string | null = null;
  if (expiresAt) {
    const parsedDate = new Date(expiresAt);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Data de expiração inválida.',
      });
      return;
    }
    if (parsedDate.getTime() <= Date.now()) {
      res.status(400).json({
        success: false,
        error: 'A data de expiração deve ser posterior ao momento atual.',
      });
      return;
    }
    cleanExpiresAt = parsedDate.toISOString();
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPin(pinToAssign, salt);
  const id = `reader-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const newRecord: ReaderAccessRecord = {
    id,
    name: cleanName,
    pinHash: hash,
    pinSalt: salt,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: cleanExpiresAt,
    lastUsedAt: null,
    notes: typeof notes === 'string' ? notes.trim() : '',
  };

  if (!securityConfig.readerAccesses) {
    securityConfig.readerAccesses = [];
  }
  securityConfig.readerAccesses.unshift(newRecord);
  saveSecurityConfig(securityConfig);

  // Retorna o PIN em texto puro APENAS NESTA RESPOSTA de criação (para exibição única)
  res.status(201).json({
    success: true,
    access: sanitizeReaderAccess(newRecord),
    pin: pinToAssign,
    message: 'Acesso do leitor criado com sucesso.',
  });
});

// 10.3 Alterar estado de um acesso (bloquear / reativar / revogar)
app.patch('/api/admin/readers/:id/status', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { status: targetStatus } = req.body || {};

  const allowedStatuses: ReaderAccessStatus[] = ['active', 'blocked', 'revoked'];
  if (!targetStatus || !allowedStatuses.includes(targetStatus)) {
    res.status(400).json({
      success: false,
      error: 'Status inválido. Escolha entre: active, blocked ou revoked.',
    });
    return;
  }

  const target = (securityConfig.readerAccesses || []).find((a) => a.id === id);
  if (!target) {
    res.status(404).json({
      success: false,
      error: 'Acesso de leitor não encontrado.',
    });
    return;
  }

  target.status = targetStatus;

  // Se bloqueado ou revogado, derruba sessões ativas deste leitor imediatamente
  if (targetStatus === 'blocked' || targetStatus === 'revoked') {
    for (const [token, sess] of activeReaderSessions.entries()) {
      if (sess.accessId === id) {
        activeReaderSessions.delete(token);
      }
    }
  }

  saveSecurityConfig(securityConfig);

  res.json({
    success: true,
    access: sanitizeReaderAccess(target),
    message: `Status do acesso de "${target.name}" atualizado para: ${targetStatus}.`,
  });
});

// 10.4 Excluir acesso de leitor definitivamente
app.delete('/api/admin/readers/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;

  const index = (securityConfig.readerAccesses || []).findIndex((a) => a.id === id);
  if (index === -1) {
    res.status(404).json({
      success: false,
      error: 'Acesso não encontrado.',
    });
    return;
  }

  const removed = securityConfig.readerAccesses.splice(index, 1)[0];

  // Encerra qualquer sessão deste leitor
  for (const [token, sess] of activeReaderSessions.entries()) {
    if (sess.accessId === id) {
      activeReaderSessions.delete(token);
    }
  }

  saveSecurityConfig(securityConfig);

  res.json({
    success: true,
    message: `Acesso de "${removed.name}" excluído com sucesso.`,
  });
});


/* ==========================================================================
   INTEGRAÇÃO COM O VITE (Dev com vite.middlewares / Produção estática)
   ========================================================================== */

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Biblioteca Digital Cristã] Servidor ativo em http://0.0.0.0:${PORT}`);
    console.log(`[Segurança] Área Administrativa (/admin) e Validação de PIN ativas com persistência.`);
  });
}

startServer().catch((err) => {
  console.error('[Biblioteca Digital] Erro ao iniciar servidor:', err);
  process.exit(1);
});
