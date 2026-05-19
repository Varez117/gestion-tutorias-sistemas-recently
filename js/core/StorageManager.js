export class StorageManager {
  static DB_NAME = "SIT_Storage";
  static STORE_NAME = "pdfs";

  static async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject("Error al abrir IndexedDB");
    });
  }

  static async save(id, file) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, "readwrite");
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(file, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error al guardar archivo");
    });
  }

  static async get(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, "readonly");
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject("Error al recuperar archivo");
    });
  }
}