interface HeaderProps {
    title: string;
}

export default function Header({ title }: HeaderProps) {
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
                {/* Botão de sincronizar removido a pedido do usuário (redundante devido ao Pull-to-Refresh e React Query) */}
            </div>
        </header>
    );
}
