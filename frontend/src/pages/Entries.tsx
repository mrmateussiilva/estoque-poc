import { useState } from 'react';
import { CheckCircle2, Trash2, Zap } from 'lucide-react';
import { Button, Card, Badge } from '../components/UI';
import EntryForm from '../components/EntryForm';
import EntryTable from '../components/EntryTable';
import { useData } from '../contexts/DataContext';
import { useMovementMutation } from '../hooks/useQueries';

export default function Entries() {
    const { entryItems: items, setEntryItems: setItems, clearEntryItems } = useData();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const movementMutation = useMovementMutation();
    const isConfirming = movementMutation.isPending;

    const handleAddManual = (item: { sku: string; description: string; quantity: number }) => {
        setItems([...items, { ...item, id: crypto.randomUUID(), origin: 'Manual' }]);
    };

    const handleConfirm = async () => {
        setError(null);
        setSuccess(null);

        try {
            await movementMutation.mutateAsync(items);
            setSuccess(`${items.length} movimentações registradas com sucesso!`);
            await new Promise(r => setTimeout(r, 1500));
            clearEntryItems();
            setSuccess(null);
        } catch (err: any) {
            setError(err.message || 'Erro ao confirmar entradas');
        }
    };

    const totalUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-40 antialiased animate-in fade-in duration-500">
            {/* Notificações Topo */}
            <div className="fixed top-24 right-8 z-[60] flex flex-col gap-3 max-w-md">
                {error && (
                    <div className="bg-white border-2 border-ruby-100 shadow-xl p-4 flex items-center gap-4 rounded-2xl animate-in slide-in-from-right duration-300">
                        <div className="w-10 h-10 bg-ruby-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Trash2 className="text-ruby-600 w-5 h-5" />
                        </div>
                        <span className="text-xs font-black text-navy-900 uppercase tracking-tight">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="bg-white border-2 border-emerald-100 shadow-xl p-4 flex items-center gap-4 rounded-2xl animate-in slide-in-from-right duration-300">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        </div>
                        <span className="text-xs font-black text-navy-900 uppercase tracking-tight">{success}</span>
                    </div>
                )}
            </div>

            {/* Header Operacional - Compacto & Estiloso */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-navy-950 p-6 rounded-3xl border border-white/10 shadow-premium">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-ruby-600 rounded-2xl flex items-center justify-center shadow-ruby-lg border border-ruby-400/20 rotate-3">
                        <Zap className="text-white w-7 h-7 fill-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none italic">Mesa de Operação</h2>
                            <Badge variant="purple" className="bg-purple-500/20! border-purple-500/30! text-purple-200! rounded-full">Fluxo Ágil</Badge>
                        </div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.25em] mt-2">Lançamento de entradas manuais e via NF-e</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 divide-x divide-white/10">
                    <div className="text-right px-6">
                        <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1">Total SKUs</p>
                        <p className="text-white text-xl font-black font-mono leading-none">{items.length}</p>
                    </div>
                    <div className="text-right px-6">
                        <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1">Qtd. Total</p>
                        <p className="text-ruby-500 text-xl font-black font-mono leading-none">{totalUnits}</p>
                    </div>
                </div>
            </div>

            {/* Desk Inputs */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="p-1.5 bg-charcoal-100/50 border-charcoal-200 rounded-3xl overflow-hidden ring-1 ring-charcoal-100">
                    <EntryForm onAdd={handleAddManual} />
                </Card>
            </div>

            {/* Workplace Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-navy-950 rounded-full" />
                        <h3 className="text-[10px] font-black text-navy-900 uppercase tracking-[0.2em] opacity-40">Itens em Processamento</h3>
                    </div>
                    {items.length > 0 && (
                        <button
                            onClick={() => {
                                if (window.confirm('Esvaziar mesa de operação? Todo progresso não efetivado será perdido.')) {
                                    setItems([]);
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-[9px] font-black text-ruby-600 hover:bg-ruby-50 rounded-xl transition-all uppercase tracking-widest border-2 border-ruby-100"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Esvaziar Mesa
                        </button>
                    )}
                </div>

                <div className="bg-white p-4 rounded-3xl border border-charcoal-100 shadow-premium min-h-[400px]">
                    <EntryTable
                        items={items}
                        onUpdateQuantity={(id, q) => setItems(items.map(i => i.id === id ? { ...i, quantity: q } : i))}
                        onRemove={(id) => setItems(items.filter(i => i.id !== id))}
                    />
                </div>
            </div>

            {/* Sticky Floating CTA */}
            {items.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-navy-950 p-4 rounded-full flex items-center gap-8 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.6)] border border-white/10 ring-1 ring-white/10 backdrop-blur-lg">
                        <div className="pl-6 flex items-center gap-8 hidden sm:flex">
                            <div className="text-left">
                                <p className="text-white/30 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Lote Atual</p>
                                <p className="text-white text-sm font-black italic">{items.length} Modelos</p>
                            </div>
                            <div className="text-left">
                                <p className="text-white/30 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Volume</p>
                                <p className="text-ruby-500 text-sm font-black italic">{totalUnits} Unid.</p>
                            </div>
                        </div>

                        <Button
                            onClick={handleConfirm}
                            loading={isConfirming}
                            className="h-16 px-12 bg-white hover:bg-ruby-50 text-ruby-600 border-none rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">Efetivar Operação</span>
                                <CheckCircle2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            </div>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}