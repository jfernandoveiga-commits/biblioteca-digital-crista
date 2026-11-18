/**
 * Serviço de Integração com Firebase Cloud Firestore no Servidor (Node.js).
 *
 * Utiliza o Firebase Firestore para persistência real, segura e resiliente:
 * - Em ambiente AI Studio / Web: conecta com firebase-applet-config.json via Firebase SDK
 * - Em ambiente de produção / Render: suporta também Firebase Admin SDK caso FIREBASE_SERVICE_ACCOUNT_KEY esteja configurada
 * - Persiste os PINs com hash PBKDF2 (30.000 iterações + salt individual de 16 bytes), estados de acesso e cadastros completos dos leitores
 * - Mantém cópia de contingência/backup local e migração idempotente
 */

import { initializeApp as initClientApp, getApps as getClientApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  Firestore as ClientFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  writeBatch,
} from 'firebase/firestore';
import {
  initializeApp as initAdminApp,
  getApps as getAdminApps,
  cert,
  App as AdminApp,
} from 'firebase-admin/app';
import {
  getFirestore as getAdminFirestore,
  Firestore as AdminFirestore,
} from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ReaderAccessRecord,
  LibraryFeaturesConfig,
  ContentAvailabilityConfig,
} from '../types/book';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FirestoreSystemConfigDoc {
  isLibraryLocked: boolean;
  lockReason: string;
  lastPinChangedAt: string;
  lastRevokedAt: string | null;
  sessionsRevokedBefore: number;
  features: LibraryFeaturesConfig;
  contentAvailability: ContentAvailabilityConfig;
  chapterHeaderImages?: Record<string, string>;
  updatedAt: string;
  adminUsername?: string;
  adminPasswordHash?: string;
  adminPasswordSalt?: string;
}

export interface FirestoreStatusInfo {
  type: 'firestore' | 'local_file';
  isConnected: boolean;
  mode: 'client_sdk' | 'admin_sdk' | 'offline_fallback';
  projectId: string;
  databaseId: string;
  connectionError?: string;
  backupFileExists: boolean;
  totalReadersInFirestore?: number;
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  totalLocalCount: number;
  backupPath: string;
  message: string;
  error?: string;
}

class FirebaseServerStore {
  private clientApp: FirebaseApp | null = null;
  private clientDb: ClientFirestore | null = null;
  private adminApp: AdminApp | null = null;
  private adminDb: AdminFirestore | null = null;
  private activeMode: 'client_sdk' | 'admin_sdk' | 'offline_fallback' = 'offline_fallback';
  private isConnected: boolean = false;
  private connectionError: string | null = null;
  private projectId: string = '';
  private databaseId: string = '(default)';

  constructor() {
    this.init();
  }

  /**
   * Inicializa a conexão com o Firebase (Admin SDK ou Client SDK)
   */
  public init(): boolean {
    try {
      // 1. Carrega configuração do firebase-applet-config.json se disponível
      let appletConfig: any = {};
      const appletConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(appletConfigPath)) {
        try {
          appletConfig = JSON.parse(fs.readFileSync(appletConfigPath, 'utf-8'));
          this.projectId = appletConfig.projectId || '';
          this.databaseId = appletConfig.firestoreDatabaseId || '(default)';
        } catch {
          // Ignora falha de leitura
        }
      }

      // Sobrescreve com variáveis de ambiente caso definidas (Render / Cloud)
      const envProjectId =
        process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
      if (envProjectId) {
        this.projectId = envProjectId.trim();
      }

      const envDatabaseId = process.env.FIREBASE_DATABASE_ID;
      if (envDatabaseId) {
        this.databaseId = envDatabaseId.trim();
      }

      // 2. Tenta verificar se há credenciais de Service Account para Admin SDK
      let adminCredential = null;
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          const parsedKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          adminCredential = cert(parsedKey);
          if (parsedKey.project_id) this.projectId = parsedKey.project_id;
        } catch (err: any) {
          console.warn('[Firebase] Falha ao analisar FIREBASE_SERVICE_ACCOUNT_KEY JSON:', err.message);
        }
      }

      if (!adminCredential && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
          const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
          adminCredential = cert({
            projectId: this.projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(),
            privateKey,
          });
        } catch (err: any) {
          console.warn('[Firebase] Falha ao configurar chave privada:', err.message);
        }
      }

      if (adminCredential) {
        // Inicializa via Firebase Admin SDK
        const existingAdmin = getAdminApps();
        if (existingAdmin.length > 0) {
          this.adminApp = existingAdmin[0];
        } else {
          this.adminApp = initAdminApp(
            { credential: adminCredential, projectId: this.projectId },
            'biblioteca-digital-server-admin'
          );
        }
        this.adminDb =
          this.databaseId && this.databaseId !== '(default)'
            ? getAdminFirestore(this.adminApp, this.databaseId)
            : getAdminFirestore(this.adminApp);
        this.activeMode = 'admin_sdk';
        this.isConnected = true;
        this.connectionError = null;
        console.log(`[Firebase] Conectado via Firebase Admin SDK (Projeto: ${this.projectId}, Banco: ${this.databaseId})`);
        return true;
      }

      // 3. Caso não haja chave de service account, utiliza Firebase Web SDK com a configuração de applet
      if (appletConfig.projectId && appletConfig.apiKey) {
        const existingClient = getClientApps();
        if (existingClient.length > 0) {
          this.clientApp = existingClient[0];
        } else {
          this.clientApp = initClientApp(appletConfig);
        }
        this.clientDb =
          this.databaseId && this.databaseId !== '(default)'
            ? getClientFirestore(this.clientApp, this.databaseId)
            : getClientFirestore(this.clientApp);

        this.activeMode = 'client_sdk';
        this.isConnected = true;
        this.connectionError = null;
        console.log(`[Firebase] Conectado via Firebase Firestore SDK (Projeto: ${this.projectId}, Banco: ${this.databaseId})`);
        return true;
      }

      this.activeMode = 'offline_fallback';
      this.isConnected = false;
      this.connectionError = 'Configuração do Firebase não encontrada.';
      return false;
    } catch (err: any) {
      this.activeMode = 'offline_fallback';
      this.isConnected = false;
      this.connectionError = err.message || 'Erro ao inicializar conexão com Firestore.';
      console.warn('[Firebase] Inicialização do Firestore em modo fallback local:', this.connectionError);
      return false;
    }
  }

  public isReady(): boolean {
    return this.isConnected && (this.clientDb !== null || this.adminDb !== null);
  }

  public async getStatus(backupPath?: string): Promise<FirestoreStatusInfo> {
    let totalReaders: number | undefined = undefined;
    if (this.isReady()) {
      try {
        const readers = await this.loadAllReaderAccesses();
        totalReaders = readers.length;
      } catch {
        // Ignora erro no contador
      }
    }

    return {
      type: this.isReady() ? 'firestore' : 'local_file',
      isConnected: this.isReady(),
      mode: this.activeMode,
      projectId: this.projectId || 'Não configurado',
      databaseId: this.databaseId || '(default)',
      connectionError: this.connectionError || undefined,
      backupFileExists: Boolean(backupPath && fs.existsSync(backupPath)),
      totalReadersInFirestore: totalReaders,
    };
  }

  /**
   * Converte documento do Firestore para ReaderAccessRecord garantindo tipos estritos
   */
  private parseReaderDoc(id: string, data: any): ReaderAccessRecord {
    return {
      id: String(id || data.id),
      name: String(data.name || '').trim(),
      email: typeof data.email === 'string' ? data.email.trim() : (data.profile?.email || ''),
      pinHash: String(data.pinHash || ''),
      pinSalt: String(data.pinSalt || ''),
      status: (data.status as any) || 'active',
      isApproved: data.isApproved === false ? false : true,
      selfRegistered: Boolean(data.selfRegistered),
      approvedAt: data.approvedAt || null,
      createdAt: data.createdAt || new Date().toISOString(),
      expiresAt: data.expiresAt || null,
      lastUsedAt: data.lastUsedAt || null,
      notes: typeof data.notes === 'string' ? data.notes : '',
      hasProfile: Boolean(data.hasProfile),
      profile: data.profile ? JSON.parse(JSON.stringify(data.profile)) : null,
      contentPermissions: data.contentPermissions ? JSON.parse(JSON.stringify(data.contentPermissions)) : undefined,
      updatedAt: data.updatedAt || undefined,
    };
  }

  /**
   * Carrega todos os acessos dos leitores do Firestore
   */
  public async loadAllReaderAccesses(): Promise<ReaderAccessRecord[]> {
    if (!this.isReady()) {
      throw new Error('Firestore não está conectado.');
    }

    const readers: ReaderAccessRecord[] = [];

    if (this.clientDb) {
      const snap = await getDocs(collection(this.clientDb, 'reader_accesses'));
      snap.forEach((d) => {
        readers.push(this.parseReaderDoc(d.id, d.data()));
      });
    } else if (this.adminDb) {
      const snap = await this.adminDb.collection('reader_accesses').get();
      snap.forEach((d) => {
        readers.push(this.parseReaderDoc(d.id, d.data()));
      });
    }

    readers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return readers;
  }

  /**
   * Consulta um leitor específico diretamente pelo ID no Firestore
   */
  public async getReaderAccessById(readerId: string): Promise<ReaderAccessRecord | null> {
    if (!this.isReady() || !readerId) return null;

    try {
      if (this.clientDb) {
        const snap = await getDoc(doc(this.clientDb, 'reader_accesses', readerId));
        if (snap.exists()) {
          return this.parseReaderDoc(snap.id, snap.data());
        }
      } else if (this.adminDb) {
        const snap = await this.adminDb.collection('reader_accesses').doc(readerId).get();
        if (snap.exists) {
          return this.parseReaderDoc(snap.id, snap.data());
        }
      }
    } catch (err: any) {
      console.warn(`[Firebase] Erro ao consultar leitor ${readerId}:`, err?.message || err);
    }
    return null;
  }

  /**
   * Salva ou atualiza um acesso de leitor no Firestore de forma segura e resiliente
   */
  public async saveReaderAccess(reader: ReaderAccessRecord): Promise<void> {
    if (!this.isReady()) return;

    // Higienização profunda para evitar qualquer valor `undefined` que quebre o Firestore SDK
    const payload: Record<string, any> = {
      id: String(reader.id),
      name: String(reader.name || '').trim(),
      email: typeof reader.email === 'string' ? reader.email.trim() : (reader.profile?.email || ''),
      pinHash: String(reader.pinHash || ''),
      pinSalt: String(reader.pinSalt || ''),
      status: reader.status || 'active',
      isApproved: reader.isApproved === false ? false : true,
      selfRegistered: Boolean(reader.selfRegistered),
      approvedAt: reader.approvedAt || null,
      createdAt: reader.createdAt || new Date().toISOString(),
      expiresAt: reader.expiresAt || null,
      lastUsedAt: reader.lastUsedAt || null,
      notes: typeof reader.notes === 'string' ? reader.notes.trim() : '',
      hasProfile: Boolean(reader.hasProfile),
      profile: reader.profile ? JSON.parse(JSON.stringify(reader.profile)) : null,
      updatedAt: new Date().toISOString(),
    };

    if (reader.contentPermissions) {
      payload.contentPermissions = JSON.parse(JSON.stringify(reader.contentPermissions));
    }

    if (this.clientDb) {
      await setDoc(doc(this.clientDb, 'reader_accesses', reader.id), payload, { merge: true });
    } else if (this.adminDb) {
      await this.adminDb.collection('reader_accesses').doc(reader.id).set(payload, { merge: true });
    }
  }

  /**
   * Remove um acesso de leitor do Firestore
   */
  public async deleteReaderAccess(readerId: string): Promise<void> {
    if (!this.isReady()) return;

    if (this.clientDb) {
      await deleteDoc(doc(this.clientDb, 'reader_accesses', readerId));
    } else if (this.adminDb) {
      await this.adminDb.collection('reader_accesses').doc(readerId).delete();
    }
  }

  /**
   * Remove todos os acessos de leitores do Firestore
   */
  public async clearAllReaderAccesses(): Promise<number> {
    if (!this.isReady()) return 0;

    let deleted = 0;
    try {
      if (this.clientDb) {
        const snap = await getDocs(collection(this.clientDb, 'reader_accesses'));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
          deleted++;
        }
      } else if (this.adminDb) {
        const snap = await this.adminDb.collection('reader_accesses').get();
        for (const d of snap.docs) {
          await d.ref.delete();
          deleted++;
        }
      }
    } catch (err: any) {
      console.warn('[Firebase] Erro ao limpar leitores do Firestore:', err.message);
    }
    return deleted;
  }

  /**
   * Carrega a configuração de segurança do sistema do Firestore
   */
  public async loadSystemConfig(): Promise<FirestoreSystemConfigDoc | null> {
    if (!this.isReady()) return null;

    try {
      if (this.clientDb) {
        const snap = await getDoc(doc(this.clientDb, 'system_config', 'security'));
        if (snap.exists()) {
          return snap.data() as FirestoreSystemConfigDoc;
        }
      } else if (this.adminDb) {
        const snap = await this.adminDb.collection('system_config').doc('security').get();
        if (snap.exists) {
          return snap.data() as FirestoreSystemConfigDoc;
        }
      }
    } catch (err: any) {
      console.warn('[Firebase] Falha ao ler system_config do Firestore:', err.message);
    }
    return null;
  }

  /**
   * Salva a configuração de segurança do sistema no Firestore
   */
  public async saveSystemConfig(configDoc: FirestoreSystemConfigDoc): Promise<void> {
    if (!this.isReady()) return;

    try {
      // Preserva chapterHeaderImages leves no documento principal apenas para URLs externas;
      // Data URLs grandes ficam isoladas em documentos dedicados chapter_img__*
      const safeHeaderImages: Record<string, string> = {};
      if (configDoc.chapterHeaderImages) {
        for (const [k, v] of Object.entries(configDoc.chapterHeaderImages)) {
          if (typeof v === 'string' && v.trim() && !v.startsWith('data:')) {
            safeHeaderImages[k] = v.trim();
          }
        }
      }

      const payload: FirestoreSystemConfigDoc = {
        ...configDoc,
        chapterHeaderImages: safeHeaderImages,
      };

      if (this.clientDb) {
        await setDoc(doc(this.clientDb, 'system_config', 'security'), payload, { merge: true });
      } else if (this.adminDb) {
        await this.adminDb.collection('system_config').doc('security').set(payload, { merge: true });
      }
    } catch (err: any) {
      console.warn('[Firebase] Falha ao salvar system_config no Firestore:', err.message);
      throw err;
    }
  }

  /**
   * Carrega todas as imagens personalizadas de capítulos salvas em documentos dedicados no Firestore
   */
  public async loadAllChapterImages(): Promise<Record<string, string>> {
    if (!this.isReady()) return {};

    const images: Record<string, string> = {};
    const clearedKeys = new Set<string>();
    let legacySecurityImages: Record<string, any> | null = null;

    const processDoc = (id: string, data: any) => {
      if (id.startsWith('chapter_img__') || data?.docType === 'chapter_image') {
        const key = data?.bookId && data?.chapterId ? `${data.bookId}:${data.chapterId}` : '';
        if (!key) return;
        if (typeof data.headerImage === 'string' && data.headerImage.trim()) {
          images[key] = data.headerImage.trim();
        } else {
          clearedKeys.add(key);
        }
      } else if (id === 'security' && data?.chapterHeaderImages) {
        legacySecurityImages = data.chapterHeaderImages;
      }
    };

    try {
      if (this.clientDb) {
        const snap = await getDocs(collection(this.clientDb, 'system_config'));
        snap.forEach((d) => processDoc(d.id, d.data()));
      } else if (this.adminDb) {
        const snap = await this.adminDb.collection('system_config').get();
        snap.forEach((d) => processDoc(d.id, d.data()));
      }

      if (legacySecurityImages) {
        for (const [k, v] of Object.entries(legacySecurityImages)) {
          if (typeof v === 'string' && v.trim() && !(k in images) && !clearedKeys.has(k)) {
            images[k] = v.trim();
          }
        }
      }
    } catch (err: any) {
      console.warn('[Firebase] Falha ao carregar imagens de capítulos do Firestore:', err.message);
    }
    return images;
  }

  /**
   * Salva ou limpa a imagem de cabeçalho de um capítulo em documento dedicado no Firestore
   * (respeita o limite de 1MB por documento e as regras de escrita em system_config)
   */
  public async saveChapterImage(
    bookId: string,
    chapterId: string,
    headerImage: string | null
  ): Promise<void> {
    if (!this.isReady()) return;

    const safeBook = String(bookId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeChapter = String(chapterId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docId = `chapter_img__${safeBook}__${safeChapter}`;
    const payload = {
      isLibraryLocked: false,
      docType: 'chapter_image',
      bookId,
      chapterId,
      headerImage: typeof headerImage === 'string' ? headerImage.trim() : '',
      updatedAt: new Date().toISOString(),
    };

    if (this.clientDb) {
      await setDoc(doc(this.clientDb, 'system_config', docId), payload);
    } else if (this.adminDb) {
      await this.adminDb.collection('system_config').doc(docId).set(payload);
    }
  }

  /**
   * Realiza a migração segura dos dados locais (JSON) para o Cloud Firestore
   */
  public async migrateLocalToFirestore(
    localConfigFilePath: string,
    readers: ReaderAccessRecord[],
    systemConfigDoc: FirestoreSystemConfigDoc
  ): Promise<MigrationResult> {
    const backupPath = localConfigFilePath.replace('.json', '.backup.json');

    // 1. Cria cópia de segurança preventiva do arquivo local
    try {
      if (fs.existsSync(localConfigFilePath)) {
        fs.copyFileSync(localConfigFilePath, backupPath);
        console.log(`[Migração] Backup preventivo salvo em: ${backupPath}`);
      }
    } catch (err: any) {
      console.warn('[Migração] Aviso ao criar backup preventivo:', err.message);
    }

    if (!this.isReady()) {
      return {
        success: false,
        migratedCount: 0,
        totalLocalCount: readers.length,
        backupPath,
        message: 'O Firestore não está conectado. Os dados foram preservados no backup local.',
        error: this.connectionError || 'Conexão inativa',
      };
    }

    let migrated = 0;
    try {
      // 2. Salva documento de configuração do sistema
      await this.saveSystemConfig(systemConfigDoc);

      // 3. Importa cada leitor
      for (const reader of readers) {
        await this.saveReaderAccess({
          ...reader,
          notes: reader.notes || '',
        });
        migrated++;
      }

      console.log(`[Migração] Sucesso! ${migrated} registros sincronizados no Cloud Firestore.`);
      return {
        success: true,
        migratedCount: migrated,
        totalLocalCount: readers.length,
        backupPath,
        message: `Sincronização concluída com sucesso! ${migrated} de ${readers.length} acessos persistidos no Firestore.`,
      };
    } catch (err: any) {
      console.error('[Migração] Erro ao gravar dados no Firestore:', err);
      return {
        success: false,
        migratedCount: migrated,
        totalLocalCount: readers.length,
        backupPath,
        message: 'Ocorreu um erro durante a gravação dos dados no Firestore.',
        error: err.message,
      };
    }
  }
}

export const firebaseServerStore = new FirebaseServerStore();
