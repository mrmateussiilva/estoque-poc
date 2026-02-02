import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/UI';
import EntryActionCards from '../components/EntryActionCards';
import EntryForm from '../components/EntryForm';
import EntryTable from '../components/EntryTable';
import EntryFooter from '../components/EntryFooter';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('auth_token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            // Enviar cada item como uma movimentação
            for (const item of items) {
                const response = await fetch(`${API_BASE_URL}/api/movements`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        product_code: item.sku,
                        type: 'ENTRADA',
                        quantity: item.quantity,
                        origin: 'MANUAL',
                        notes: `Entrada manual: ${item.description}`
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                    throw new Error(errorData.error || `Erro ao processar ${item.sku}`);
                }
            }

            setSuccess(`${items.length} movimentações registradas com sucesso!`);
            await new Promise(r => setTimeout(r, 1500));
            setItems([]);
        } catch (err: any) {
            setError(err.message || 'Erro ao confirmar entradas');
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-32 relative antialiased">
            {(error || success) && (
                <div className="fixed top-20 right-4 left-4 md:left-auto md:top-24 md:right-8 z-50 md:max-w-md">
                    {error && (
                        <div className="bg-white border-l-4 border-ruby-700 shadow-xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 rounded-ruby animate-in slide-in-from-top-4 duration-300">
                            <span className="text-xs md:text-sm font-medium text-charcoal-700">{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="bg-white border-l-4 border-emerald-500 shadow-xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 rounded-ruby animate-in slide-in-from-top-4 duration-300">
                            <span className="text-xs md:text-sm font-medium text-charcoal-700">{success}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between border-b border-charcoal-100 pb-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-ruby-700 tracking-[0.2em] leading-none">Mesa de Operação</p>
                    <h2 className="text-xs font-bold text-charcoal-400">
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

            <div className="fixed bottom-6 right-4 left-4 md:left-auto md:bottom-8 md:right-8 z-40">
                <Button
                    onClick={handleConfirm}
                    disabled={items.length === 0}
                    loading={isConfirming}
                    className="w-full md:w-auto h-14 px-8 shadow-2xl shadow-ruby-900/40 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                    <span className="font-black text-sm uppercase tracking-widest">Confirmar Entrada</span>
                    {!isConfirming && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                </Button>
            </div>
        </div>
    );
}
