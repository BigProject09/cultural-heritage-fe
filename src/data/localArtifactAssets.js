const DATABASE_NAME = "voraArtifactStorage";
const DATABASE_VERSION = 1;
const ASSET_STORE = "artifactAssets";
const ARTIFACT_INDEX = "artifactId";

const objectUrlCache = new Map();
let persistenceRequest;

async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  if (!persistenceRequest) {
    persistenceRequest = navigator.storage.persist().catch(() => false);
  }
  return persistenceRequest;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(
        new Error(
          "이 브라우저는 임시 이미지 저장소를 지원하지 않습니다. 최신 브라우저에서 다시 시도해주세요.",
        ),
      );
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () =>
      reject(
        new Error("브라우저 임시 이미지 저장소를 열지 못했습니다.", {
          cause: request.error,
        }),
      );

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(ASSET_STORE)
        ? request.transaction.objectStore(ASSET_STORE)
        : database.createObjectStore(ASSET_STORE, { keyPath: "key" });

      if (!store.indexNames.contains(ARTIFACT_INDEX)) {
        store.createIndex(ARTIFACT_INDEX, ARTIFACT_INDEX, { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

async function runTransaction(mode, operation) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(ASSET_STORE, mode);
    const store = transaction.objectStore(ASSET_STORE);
    let result;

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(
        new Error("브라우저 임시 이미지 저장에 실패했습니다.", {
          cause: transaction.error,
        }),
      );
    };
    transaction.onabort = transaction.onerror;

    try {
      result = operation(store);
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createArtifactImageKey(artifactId) {
  const randomPart =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${artifactId}:representative:${randomPart}`;
}

export async function saveArtifactImage({
  key,
  artifactId,
  blob,
  fileName = "artifact-image.jpg",
}) {
  if (!(blob instanceof Blob)) {
    throw new Error("저장할 대표 이미지가 올바르지 않습니다.");
  }

  try {
    await requestPersistentStorage();
    await runTransaction("readwrite", (store) => {
      store.put({
        key,
        artifactId: String(artifactId),
        blob,
        fileName,
        contentType: blob.type || "image/jpeg",
        size: blob.size,
        updatedAt: new Date().toISOString(),
      });
    });
  } catch (error) {
    if (
      error?.cause?.name === "QuotaExceededError" ||
      error?.name === "QuotaExceededError"
    ) {
      throw new Error(
        "브라우저의 임시 이미지 저장 공간이 부족합니다. 사용하지 않는 프로젝트를 삭제한 뒤 다시 시도해주세요.",
        { cause: error },
      );
    }
    throw error;
  }
}

export async function getArtifactImageUrl(key) {
  if (!key) return "";

  const cached = objectUrlCache.get(key);
  if (cached) return cached;

  const blob = await getArtifactImageBlob(key);
  if (!blob) return "";

  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(key, objectUrl);
  return objectUrl;
}

export async function getArtifactImageBlob(key) {
  if (!key) return null;

  const record = await runTransaction("readonly", (store) =>
    requestResult(store.get(key)),
  );
  return record?.blob || null;
}

export async function getArtifactImageDataUrl(key) {
  const blob = await getArtifactImageBlob(key);
  if (!blob) return "";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("대표 이미지를 AI 요청 형식으로 변환하지 못했습니다."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

export async function deleteArtifactAsset(key) {
  if (!key) return;

  const objectUrl = objectUrlCache.get(key);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrlCache.delete(key);
  }

  await runTransaction("readwrite", (store) => {
    store.delete(key);
  });
}

export async function deleteArtifactAssets(artifactId) {
  const targetId = String(artifactId);
  const keys = await runTransaction("readonly", (store) =>
    requestResult(store.index(ARTIFACT_INDEX).getAllKeys(targetId)),
  );

  keys.forEach((key) => {
    const objectUrl = objectUrlCache.get(key);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrlCache.delete(key);
    }
  });

  await runTransaction("readwrite", (store) => {
    const index = store.index(ARTIFACT_INDEX);
    const cursorRequest = index.openKeyCursor(IDBKeyRange.only(targetId));

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      store.delete(cursor.primaryKey);
      cursor.continue();
    };
  });
}
