import { WifiOff } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';

export default function OfflineIndicator() {
    const { offline } = useOffline();

    if (!offline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 z-50 flex items-center justify-center gap-2 safe-area-inset-top">
            <WifiOff className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
                Modo Offline - Algumas funcionalidades podem estar limitadas
            </span>
        </div>
    );
}
