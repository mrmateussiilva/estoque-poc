/**
 * Utilitários para suporte offline
 */

// Verificar se está online
export const isOnline = (): boolean => {
    return navigator.onLine;
};

// Listener para mudanças de status de conexão
export const onOnlineStatusChange = (callback: (online: boolean) => void): (() => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Retornar função de cleanup
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};

// Armazenar dados no IndexedDB para uso offline
export const storeOfflineData = async (storeName: string, data: any): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SGE_OFFLINE', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
                // Criar object store se não existir
                db.createObjectStore(storeName);
            }
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const putRequest = store.put(data, 'cache');

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
    });
};

// Recuperar dados do IndexedDB
export const getOfflineData = async (storeName: string): Promise<any | null> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SGE_OFFLINE', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
                resolve(null);
                return;
            }

            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const getRequest = store.get('cache');

            getRequest.onsuccess = () => resolve(getRequest.result || null);
            getRequest.onerror = () => reject(getRequest.error);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
    });
};

// Limpar dados offline
export const clearOfflineData = async (storeName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SGE_OFFLINE', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
                resolve();
                return;
            }

            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const clearRequest = store.clear();

            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        };
    });
};
