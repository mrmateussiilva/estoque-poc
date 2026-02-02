import { Card } from './UI';

interface EntryFooterProps {
    totalItems: number;
    totalSKUs: number;
}

export default function EntryFooter({ totalItems, totalSKUs }: EntryFooterProps) {
    return (
        <Card className="bg-charcoal-950 border-none p-8 px-10 shadow-2xl rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-ruby-600/10 blur-[100px] -mr-32 -mt-32 rounded-full" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex gap-16">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Volume de Itens</p>
                        <div className="flex items-center gap-3">
                            <p className="text-3xl font-black text-white tracking-tighter">{totalItems}</p>
                            <div className="w-2 h-2 bg-ruby-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,1)]" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Variedade SKU</p>
                        <p className="text-3xl font-black text-ruby-500 tracking-tighter italic">{totalSKUs}</p>
                    </div>
                </div>

                <div className="hidden md:block">
                    <div className="px-6 py-2 border border-white/10 rounded-full bg-white/5 backdrop-blur-md">
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Aguardando Confirmação Final</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}
