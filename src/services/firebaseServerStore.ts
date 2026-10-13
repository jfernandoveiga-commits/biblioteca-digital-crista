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
  updatedAt: string;
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
        const data = d.data() as ReaderAccessRecord;
        readers.push({ ...data, id: d.id });
      });
    } else if (this.adminDb) {
      const snap = await this.adminDb.collection('reader_accesses').get();
      snap.forEach((d) => {
        const data = d.data() as ReaderAccessRecord;
        readers.push({ ...data, id: d.id });
      });
    }

    readers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return readers;
  }

  /**
   * Salva ou atualiza um acesso de leitor no Firestore
   */
  public async saveReaderAccess(reader: ReaderAccessRecord): Promise<void> {
    if (!this.isReady()) return;

    const payload = {
      id: reader.id,
      name: reader.name,
      pinHash: reader.pinHash || '',
      pinSalt: reader.pinSalt || '',
      status: reader.status,
      createdAt: reader.createdAt,
      expiresAt: reader.expiresAt || null,
      lastUsedAt: reader.lastUsedAt || null,
      notes: reader.notes || '',
      hasProfile: Boolean(reader.hasProfile),
      profile: reader.profile || null,
      updatedAt: new Date().toISOString(),
    };

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
      if (this.clientDb) {
        await setDoc(doc(this.clientDb, 'system_config', 'security'), configDoc, { merge: true });
      } else if (this.adminDb) {
        await this.adminDb.collection('system_config').doc('security').set(configDoc, { merge: true });
      }
    } catch (err: any) {
      console.warn('[Firebase] Falha ao salvar system_config no Firestore:', err.message);
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
