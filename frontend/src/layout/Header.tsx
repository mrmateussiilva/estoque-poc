import { RefreshCw } from 'lucide-react';

interface HeaderProps {
    title: string;
    onSync?: () => void;
    loading?: boolean;
}

export default function Header({ title, onSync, loading }: HeaderProps) {
    return (
        <header className="h-24 bg-white border-b border-charcoal-100/50 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 transition-all duration-300">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-1.5 h-10 bg-ruby-600 rounded-full shadow-[0_0_12px_rgba(225,29,72,0.3)]" />
                    <div className="flex flex-col">
                        <h1 className="text-2xl md:text-3xl font-black text-navy-900 tracking-tighter truncate leading-none uppercase">{title}</h1>
                        <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em] mt-2 opacity-60">SGE • {title}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {onSync && (
                    <button
                        onClick={onSync}
                        disabled={loading}
                        className="h-11 px-5 bg-white border border-charcoal-200 text-charcoal-700 rounded-xl hover:border-ruby-200 hover:text-ruby-600 transition-all flex items-center gap-2.5 disabled:opacity-50 active:scale-[0.98] shadow-sm font-bold text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${loading ? 'animate-spin' : ''}`} />
                        <span className="uppercase tracking-widest text-[10px]">Sincronizar</span>
                    </button>
                )}
            </div>
        </header>
    );
}
