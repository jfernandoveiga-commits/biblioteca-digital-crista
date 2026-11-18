import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  collection,
  getDocFromServer,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let clientApp: FirebaseApp | null = null;
let clientDb: Firestore | null = null;
let connectionTested = false;

function getClientFirestoreDb(): Firestore | null {
  if (typeof window === 'undefined') return null;
  if (clientDb) return clientDb;

  try {
    const apps = getApps();
    clientApp = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    clientDb =
      firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
        ? getFirestore(clientApp, firebaseConfig.firestoreDatabaseId)
        : getFirestore(clientApp);

    if (!connectionTested) {
      connectionTested = true;
      void testConnection(clientDb);
    }

    return clientDb;
  } catch (err) {
    console.warn('[RealtimeSync] Firestore SDK indisponível no navegador:', err);
    return null;
  }
}

async function testConnection(db: Firestore) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

/**
 * Inscreve listeners em tempo real (Cloud Firestore onSnapshot + Server-Sent Events)
 * para atualizar imediatamente os dispositivos dos leitores quando o administrador
 * libera ou bloqueia livros, capítulos, imagens ou acessos.
 */
export function subscribeToLibraryUpdates(
  accessId: string | null | undefined,
  onUpdate: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanups: Array<() => void> = [];
  let debounceTimer: number | null = null;

  const scheduleUpdate = () => {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      onUpdate();
    }, 150);
  };

  // 1. Escuta em tempo real no Cloud Firestore (propaga entre ais-dev, ais-pre e dispositivos PWA)
  const db = getClientFirestoreDb();
  if (db) {
    try {
      let firstSystemSnap = true;
      const systemPath = 'system_config';
      const unsubSystem = onSnapshot(
        collection(db, systemPath),
        (snapshot) => {
          if (firstSystemSnap) {
            firstSystemSnap = false;
            return;
          }
          if (snapshot.docChanges().length > 0) {
            scheduleUpdate();
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, systemPath);
        }
      );
      cleanups.push(unsubSystem);

      if (accessId && accessId !== 'access-general') {
        let firstReaderSnap = true;
        const readerPath = `reader_accesses/${accessId}`;
        const unsubReader = onSnapshot(
          doc(db, 'reader_accesses', accessId),
          () => {
            if (firstReaderSnap) {
              firstReaderSnap = false;
              return;
            }
            scheduleUpdate();
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, readerPath);
          }
        );
        cleanups.push(unsubReader);
      }
    } catch (err) {
      console.warn('[RealtimeSync] Falha ao iniciar onSnapshot do Firestore:', err);
    }
  }

  // 2. Canal secundário via SSE do servidor (/api/library/events) para redundância imediata
  if (typeof EventSource !== 'undefined') {
    try {
      const eventSource = new EventSource('/api/library/events');
      eventSource.addEventListener('sync', () => {
        scheduleUpdate();
      });
      eventSource.onerror = () => {
        // O próprio EventSource reconecta automaticamente quando a rede retornar
      };
      cleanups.push(() => {
        try {
          eventSource.close();
        } catch {
          // ignora
        }
      });
    } catch {
      // ignora
    }
  }

  return () => {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch {
        // ignora
      }
    }
  };
}
