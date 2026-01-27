import { RefreshCw } from 'lucide-react';

interface HeaderProps {
    title: string;
    onSync?: () => void;
    loading?: boolean;
}

export default function Header({ title, onSync, loading }: HeaderProps) {
    return (
        <header className="h-16 bg-white border-b border-charcoal-50 flex items-center justify-between px-8">
            <h1 className="text-2xl font-bold text-charcoal-900">{title}</h1>
            {onSync && (
                <button
                    onClick={onSync}
                    disabled={loading}
                    className="px-4 py-2 bg-white border border-charcoal-50 text-charcoal-700 rounded-ruby hover:bg-charcoal-50 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium">Sincronizar</span>
                </button>
            )}
        </header>
    );
}
