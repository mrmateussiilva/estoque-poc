import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button, Card } from './UI';

interface EntryFormProps {
    onAdd: (item: { sku: string; description: string; quantity: number }) => void;
    onClose: () => void;
}

export default function EntryForm({ onAdd, onClose }: EntryFormProps) {
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (sku && description && quantity) {
            onAdd({ sku, description, quantity: Number(quantity) });
            setSku('');
            setDescription('');
            setQuantity('');
        }
    };

    return (
        <Card className="p-10 border border-charcoal-100/50 shadow-premium bg-white relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-ruby-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />

            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-charcoal-300 hover:text-ruby-700 hover:bg-ruby-50 rounded-xl transition-all z-10"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="mb-8 relative z-10">
                <h3 className="text-sm font-black text-charcoal-900 uppercase tracking-[0.2em] italic flex items-center gap-3">
                    <div className="w-2 h-2 bg-ruby-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                    Novo Lançamento Individual
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end relative z-10">
                <div className="md:col-span-3 space-y-3">
                    <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.15em] ml-1">Código SKU</label>
                    <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="w-full h-14 px-5 bg-charcoal-50/50 border border-charcoal-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white text-sm font-black tracking-tight transition-all placeholder:text-charcoal-300"
                        placeholder="Ex: SKU-001"
                        required
                        autoFocus
                    />
                </div>

                <div className="md:col-span-6 space-y-3">
                    <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.15em] ml-1">Descrição do Produto</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-14 px-5 bg-charcoal-50/50 border border-charcoal-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white text-sm font-black tracking-tight transition-all placeholder:text-charcoal-300"
                        placeholder="Nome completo ou detalhes técnicos"
                        required
                    />
                </div>

                <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.15em] ml-1">Quantidade</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full h-14 px-5 bg-charcoal-50/50 border border-charcoal-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white text-sm font-black tracking-tight transition-all"
                        placeholder="0"
                        min="1"
                        required
                    />
                </div>

                <div className="md:col-span-1">
                    <Button type="submit" className="w-full h-14 flex items-center justify-center p-0 rounded-2xl bg-charcoal-950 hover:bg-black shadow-xl active:scale-95">
                        <Check className="w-6 h-6 text-ruby-500" />
                    </Button>
                </div>
            </form>
        </Card>
    );
}
