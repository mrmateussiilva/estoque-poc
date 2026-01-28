import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/UI';
import EntryActionCards from '../components/EntryActionCards';
import EntryForm from '../components/EntryForm';
import EntryTable from '../components/EntryTable';
import EntryFooter from '../components/EntryFooter';

interface EntryItem {
    id: string;
    sku: string;
    description: string;
    quantity: number;
    origin: 'Manual' | 'XML';
}

export default function Entries() {
    const [items, setItems] = useState<EntryItem[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

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
        setIsConfirming(true);
        await new Promise(r => setTimeout(r, 1200));
        setItems([]);
        setIsConfirming(false);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 relative antialiased">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-ruby-700 tracking-[0.2em] leading-none">Mesa de Operação</p>
                    <h2 className="text-sm font-bold text-charcoal-400">
                        Etapa {currentStep} de 3 — <span className="text-charcoal-900">{stepLabels[currentStep - 1]}</span>
                    </h2>
                </div>
            </div>

            <EntryActionCards
                onManualClick={() => setShowForm(!showForm)}
                onImportClick={handleImportXML}
            />

            {showForm && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <EntryForm onAdd={handleAddManual} onClose={() => setShowForm(false)} />
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-charcoal-900 uppercase tracking-widest italic">Itens da Operação</h3>
                    {items.length > 0 && (
                        <button
                            onClick={() => window.confirm('Limpar todos os itens?') && setItems([])}
                            className="text-[10px] font-bold text-charcoal-400 hover:text-ruby-700 transition-colors uppercase tracking-widest"
                        >
                            Limpar Tudo
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

            <div className="fixed bottom-8 right-8 z-40">
                <Button
                    onClick={handleConfirm}
                    disabled={items.length === 0}
                    loading={isConfirming}
                    className="h-14 px-8 shadow-2xl shadow-ruby-900/40 rounded-2xl flex items-center gap-3"
                >
                    <span className="font-black text-sm uppercase tracking-widest">Confirmar Entrada no Estoque</span>
                    {!isConfirming && <CheckCircle2 className="w-5 h-5" />}
                </Button>
            </div>
        </div>
    );
}
