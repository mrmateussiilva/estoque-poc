import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/UI';
import EntryActionCards from '../components/EntryActionCards';
import EntryForm from '../components/EntryForm';
import EntryTable from '../components/EntryTable';
import EntryFooter from '../components/EntryFooter';
import { useData, type EntryItem } from '../contexts/DataContext';
import { useMovementMutation } from '../hooks/useQueries';

export default function Entries() {
    const { entryItems: items, setEntryItems: setItems, clearEntryItems } = useData();
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    const movementMutation = useMovementMutation();
    const isConfirming = movementMutation.isPending;

    const currentStep = items.length === 0 ? 1 : isConfirming ? 3 : 2;
    const stepLabels = ['Adicionando itens', 'Revisando itens', 'Confirmando entrada'];

    const handleAddManual = (item: { sku: string; description: string; quantity: number }) => {
        setItems([...items, { ...item, id: crypto.randomUUID(), origin: 'Manual' }]);
        setShowForm(false);
    };

    const handleImportXML = () => {
        const mockXML: EntryItem[] = [
            { id: crypto.randomUUID(), sku: 'XML001', description: 'Cabo HDMI 2.1 2m', quantity: 20, origin: 'XML' },
            { id: crypto.randomUUID(), sku: 'XML002', description: 'Mouse Pad Gaming XL', quantity: 15, origin: 'XML' }
        ];
        setItems([...items, ...mockXML]);
    };

    const handleConfirm = async () => {
        setError(null);
        setSuccess(null);

        try {
            await movementMutation.mutateAsync(items);

            setSuccess(`${items.length} movimentações registradas com sucesso!`);
            await new Promise(r => setTimeout(r, 1500));
            clearEntryItems();
        } catch (err: any) {
            setError(err.message || 'Erro ao confirmar entradas');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-40 relative antialiased animate-in fade-in duration-500">
            {/* Notificações Topo */}
            <div className="fixed top-24 right-8 z-50 flex flex-col gap-3 max-w-md">
                {error && (
                    <div className="bg-white border border-charcoal-200 shadow-sm p-4 flex items-center gap-4 rounded-xl animate-in fade-in duration-300">
                        <div className="w-8 h-8 bg-ruby-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-ruby-600 font-bold">!</span>
                        </div>
                        <span className="text-sm font-semibold text-charcoal-800">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="bg-white border border-emerald-100 shadow-sm p-4 flex items-center gap-4 rounded-xl animate-in fade-in duration-300">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-sm font-semibold text-charcoal-800">{success}</span>
                    </div>
                )}
            </div>

            {/* Header de Etapas */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-charcoal-100 pb-8">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-charcoal-900 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">{currentStep}</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-ruby-600 tracking-widest leading-none">Pipeline Operacional</p>
                        <h2 className="text-2xl font-bold text-charcoal-950 tracking-tight uppercase">{stepLabels[currentStep - 1]}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`h-1.5 rounded-full transition-all duration-300 ${step <= currentStep ? 'w-10 bg-ruby-600' : 'w-4 bg-charcoal-100'}`}
                        />
                    ))}
                </div>
            </div>

            <EntryActionCards
                onManualClick={() => setShowForm(!showForm)}
                onImportClick={handleImportXML}
            />

            {showForm && (
                <div className="animate-in fade-in duration-300">
                    <EntryForm onAdd={handleAddManual} onClose={() => setShowForm(false)} />
                </div>
            )}

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-ruby-600 rounded-full" />
                        <h3 className="text-sm font-bold text-charcoal-900 uppercase tracking-widest">Lista de Operações</h3>
                    </div>
                    {items.length > 0 && (
                        <button
                            onClick={() => {
                                if (window.confirm('Tem certeza que deseja limpar todos os itens? Esta ação não pode ser desfeita.')) {
                                    setItems([]);
                                }
                            }}
                            className="px-4 py-2 text-[10px] font-bold text-charcoal-400 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all uppercase tracking-widest border border-charcoal-100 hover:border-ruby-100"
                        >
                            Limpar Mesa
                        </button>
                    )}
                </div>

                <EntryTable
                    items={items}
                    onUpdateQuantity={(id, q) => setItems(items.map(i => i.id === id ? { ...i, quantity: q } : i))}
                    onRemove={(id) => setItems(items.filter(i => i.id !== id))}
                />
            </div>

            {items.length > 0 && (
                <EntryFooter
                    totalItems={items.reduce((acc, curr) => acc + curr.quantity, 0)}
                    totalSKUs={items.length}
                />
            )}

            <div className="fixed bottom-10 right-10 left-10 md:left-auto md:right-12 z-40">
                <Button
                    onClick={handleConfirm}
                    disabled={items.length === 0}
                    loading={isConfirming}
                    className="w-full md:w-[280px] h-14 bg-charcoal-900 hover:bg-black rounded-xl"
                >
                    <span className="font-bold text-sm uppercase tracking-widest">Efetivar Entrada</span>
                    {!isConfirming && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-ruby-500" />}
                </Button>
            </div>
        </div>
    );
}