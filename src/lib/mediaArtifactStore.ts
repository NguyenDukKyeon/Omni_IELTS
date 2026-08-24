const MEDIA_ARTIFACT_DB = 'omni_ielts_media_artifacts_v1';
const MEDIA_ARTIFACT_STORE = 'audio';
const MEDIA_ARTIFACT_PREFIX = 'idb-media://';

function openMediaArtifactDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_ARTIFACT_DB, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(MEDIA_ARTIFACT_STORE)) {
        database.createObjectStore(MEDIA_ARTIFACT_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được kho audio riêng tư.'));
  });
}

function runMediaArtifactRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openMediaArtifactDb().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(MEDIA_ARTIFACT_STORE, mode);
    const request = operation(transaction.objectStore(MEDIA_ARTIFACT_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không truy cập được audio đã lưu.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Không lưu được audio riêng tư.'));
    };
  }));
}

export function isMediaArtifactReference(value: string) {
  return value.startsWith(MEDIA_ARTIFACT_PREFIX);
}

export async function putMediaAudioArtifact(id: string, dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:audio/')) throw new Error('Audio upload không hợp lệ.');
  const blob = await fetch(dataUrl).then((response) => response.blob());
  await runMediaArtifactRequest('readwrite', (store) => store.put({
    id,
    blob,
    createdAt: new Date().toISOString(),
  }));
  return `${MEDIA_ARTIFACT_PREFIX}${encodeURIComponent(id)}`;
}

export async function resolveMediaAudioUrl(reference: string): Promise<string | null> {
  if (!isMediaArtifactReference(reference)) return reference || null;
  const id = decodeURIComponent(reference.slice(MEDIA_ARTIFACT_PREFIX.length));
  const artifact = await runMediaArtifactRequest<any>('readonly', (store) => store.get(id));
  return artifact?.blob instanceof Blob ? URL.createObjectURL(artifact.blob) : null;
}

export async function deleteMediaAudioArtifact(reference: string): Promise<void> {
  if (!isMediaArtifactReference(reference)) return;
  const id = decodeURIComponent(reference.slice(MEDIA_ARTIFACT_PREFIX.length));
  await runMediaArtifactRequest('readwrite', (store) => store.delete(id));
}
