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
        <div className="max-w-6xl mx-auto space-y-10 pb-40 relative antialiased animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Notificações Topo */}
            <div className="fixed top-24 right-8 z-50 flex flex-col gap-3 max-w-md">
                {error && (
                    <div className="bg-white/90 backdrop-blur-md border-l-4 border-ruby-600 shadow-premium p-4 flex items-center gap-4 rounded-2xl animate-in slide-in-from-right-8 duration-500">
                        <div className="w-8 h-8 bg-ruby-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-ruby-600 font-black">!</span>
                        </div>
                        <span className="text-sm font-bold text-charcoal-800">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="bg-white/90 backdrop-blur-md border-l-4 border-emerald-500 shadow-premium p-4 flex items-center gap-4 rounded-2xl animate-in slide-in-from-right-8 duration-500">
                        <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-sm font-bold text-charcoal-800">{success}</span>
                    </div>
                )}
            </div>

            {/* Header de Etapas */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-charcoal-100/50 pb-8">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-charcoal-950 rounded-2xl flex items-center justify-center shadow-xl">
                        <span className="text-white font-black text-xl italic">{currentStep}</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-ruby-600 tracking-[0.3em] leading-none opacity-80">Workspace Operacional</p>
                        <h2 className="text-2xl font-black text-charcoal-950 tracking-tighter italic uppercase">{stepLabels[currentStep - 1]}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`h-1.5 rounded-full transition-all duration-500 ${step <= currentStep ? 'w-12 bg-ruby-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'w-4 bg-charcoal-100'}`}
                        />
                    ))}
                </div>
            </div>

            <EntryActionCards
                onManualClick={() => setShowForm(!showForm)}
                onImportClick={handleImportXML}
            />

            {showForm && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <EntryForm onAdd={handleAddManual} onClose={() => setShowForm(false)} />
                </div>
            )}

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-ruby-600 rounded-full" />
                        <h3 className="text-sm font-black text-charcoal-900 uppercase tracking-[0.2em] italic">Lista de Movimentação</h3>
                    </div>
                    {items.length > 0 && (
                        <button
                            onClick={() => window.confirm('Limpar todos os itens?') && setItems([])}
                            className="px-4 py-2 text-[10px] font-black text-charcoal-400 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all uppercase tracking-widest border border-transparent hover:border-ruby-100"
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
                    className="w-full md:w-[320px] h-16 shadow-premium rounded-3xl flex items-center justify-center gap-4 bg-charcoal-950 hover:bg-black text-white hover:scale-[1.02] transition-all"
                >
                    <span className="font-black text-sm uppercase tracking-[0.15em]">Efetivar Lançamentos</span>
                    {!isConfirming && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-ruby-500" />}
                </Button>
            </div>
        </div>
    );
}
