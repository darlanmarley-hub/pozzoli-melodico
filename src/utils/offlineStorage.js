/**
 * Gerenciador de Armazenamento Offline de Vídeos (IndexedDB)
 * Permite baixar os vídeos (.mp4) dos exercícios para a memória interna do aparelho
 * e reproduzi-los 100% offline (sem internet) com controle de BPM.
 */

const DB_NAME = 'pozzoli_offline_videos_db';
const DB_VERSION = 1;
const STORE_NAME = 'videos';
const OFFLINE_LIST_KEY = 'pozzoli_offline_saved_ids';

const openOfflineDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getOfflineSavedIds = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const markOfflineSavedId = (id, saved) => {
  try {
    const current = new Set(getOfflineSavedIds());
    if (saved) {
      current.add(id);
    } else {
      current.delete(id);
    }
    localStorage.setItem(OFFLINE_LIST_KEY, JSON.stringify([...current]));
  } catch {
    // ignore
  }
};

export const isVideoSavedOffline = async (exerciseId) => {
  if (!exerciseId) return false;
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getKey(exerciseId);
      req.onsuccess = () => {
        const exists = Boolean(req.result);
        markOfflineSavedId(exerciseId, exists);
        resolve(exists);
      };
      req.onerror = () => resolve(false);
    });
  } catch {
    return getOfflineSavedIds().includes(exerciseId);
  }
};

export const getOfflineVideoBlob = async (exerciseId) => {
  if (!exerciseId) return null;
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(exerciseId);
      req.onsuccess = () => {
        resolve(req.result?.blob || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const saveVideoOffline = async (exerciseId, videoUrl, onProgress = null) => {
  if (!exerciseId || !videoUrl) {
    throw new Error('Exercício ou URL de vídeo inválidos');
  }

  const response = await fetch(videoUrl, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Falha no download (${response.status})`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  let blob;

  if (response.body && contentLength > 0 && onProgress) {
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      onProgress(Math.min(99, Math.round((receivedLength / contentLength) * 100)));
    }

    blob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
  } else {
    if (onProgress) onProgress(35);
    const rawBlob = await response.blob();
    blob = new Blob([rawBlob], { type: rawBlob.type || 'video/mp4' });
  }

  const db = await openOfflineDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({
      id: exerciseId,
      url: videoUrl,
      blob,
      savedAt: new Date().toISOString(),
      size: blob.size
    });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });

  markOfflineSavedId(exerciseId, true);
  if (onProgress) onProgress(100);
  return true;
};

export const removeVideoOffline = async (exerciseId) => {
  if (!exerciseId) return false;
  try {
    const db = await openOfflineDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(exerciseId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
    markOfflineSavedId(exerciseId, false);
    return true;
  } catch {
    return false;
  }
};
