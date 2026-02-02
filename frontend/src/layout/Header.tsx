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
        <header className="h-20 bg-white border-b border-charcoal-100 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40">
            <div className="flex items-center gap-4">
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 text-charcoal-400 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                )}
                <div className="flex flex-col">
                    <h1 className="text-xl md:text-2xl font-bold text-charcoal-950 tracking-tight truncate leading-none">{title}</h1>
                    <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest mt-1 opacity-70">Painel de Controle / {title}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {onSync && (
                    <button
                        onClick={onSync}
                        disabled={loading}
                        className="h-10 px-4 bg-white border border-charcoal-200 text-charcoal-700 rounded-lg hover:bg-charcoal-50 hover:border-charcoal-300 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizar</span>
                    </button>
                )}
                <div className="w-px h-5 bg-charcoal-100 mx-1 hidden md:block" />
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="h-10 px-4 bg-white border border-charcoal-200 text-ruby-600 rounded-lg hover:bg-ruby-50 hover:border-ruby-200 transition-all flex items-center gap-2 active:scale-[0.98]"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sair</span>
                    </button>
                )}
            </div>
        </header>
    );
}
