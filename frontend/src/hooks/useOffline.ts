import { useState, useEffect } from 'react';
import { isOnline, onOnlineStatusChange, storeOfflineData, getOfflineData } from '../utils/offline';

/**
 * Hook para gerenciar estado offline/online
 */
export function useOffline() {
    const [online, setOnline] = useState(isOnline());
    const [offlineData, setOfflineData] = useState<any>(null);

    useEffect(() => {
        const cleanup = onOnlineStatusChange((isOnline) => {
            setOnline(isOnline);
        });

        return cleanup;
    }, []);

    const saveOffline = async (storeName: string, data: any) => {
        try {
            await storeOfflineData(storeName, data);
            setOfflineData(data);
        } catch (error) {
            console.error('Erro ao salvar dados offline:', error);
        }
    };

    const loadOffline = async (storeName: string) => {
        try {
            const data = await getOfflineData(storeName);
            setOfflineData(data);
            return data;
        } catch (error) {
            console.error('Erro ao carregar dados offline:', error);
            return null;
        }
    };

    return {
        online,
        offline: !online,
        offlineData,
        saveOffline,
        loadOffline,
    };
}
