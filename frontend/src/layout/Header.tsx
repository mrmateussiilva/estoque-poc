import { RefreshCw, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
    title: string;
    onSync?: () => void;
    onLogout?: () => void;
    onMenuClick?: () => void;
    loading?: boolean;
}

export default function Header({ title, onSync, onLogout, onMenuClick, loading }: HeaderProps) {
    return (
        <header className="h-16 bg-white border-b border-charcoal-50 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-50 rounded-lg transition-all"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                )}
                <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
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
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="px-4 py-2 bg-white border border-charcoal-50 text-charcoal-700 rounded-ruby hover:bg-ruby-50 hover:text-ruby-700 hover:border-ruby-700 transition-all flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Sair</span>
                    </button>
                )}
            </div>
        </header>
    );
}
