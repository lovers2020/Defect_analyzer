type SavedUpload = { name: string; buffer: ArrayBuffer };

function accessUpload<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("defect-analyzer", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("uploads");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction("uploads", mode);
      const request = operation(transaction.objectStore("uploads"));
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  });
}

export const readUpload = () => accessUpload<SavedUpload | undefined>("readonly", (store) => store.get("latest"));
export const saveUpload = (upload: SavedUpload) => accessUpload("readwrite", (store) => store.put(upload, "latest"));
