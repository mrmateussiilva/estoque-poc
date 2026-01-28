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
        <Card className="p-8 border-ruby-700/20 shadow-xl shadow-ruby-900/5 bg-white relative">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-charcoal-300 hover:text-charcoal-900 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
                <h3 className="text-sm font-black text-charcoal-900 uppercase tracking-widest italic flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-ruby-700 rounded-full" />
                    Nova Entrada Manual
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest ml-1">SKU</label>
                    <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="w-full h-11 px-4 bg-charcoal-50 border border-charcoal-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 text-sm font-bold transition-all"
                        placeholder="Ex: SKU-001"
                        required
                        autoFocus
                    />
                </div>

                <div className="md:col-span-6 space-y-2">
                    <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest ml-1">Produto / Descrição</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-11 px-4 bg-charcoal-50 border border-charcoal-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 text-sm font-bold transition-all"
                        placeholder="Descrição detalhada do item"
                        required
                    />
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest ml-1">Qtd</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full h-11 px-4 bg-charcoal-50 border border-charcoal-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 text-sm font-black transition-all"
                        placeholder="0"
                        min="1"
                        required
                    />
                </div>

                <div className="md:col-span-1">
                    <Button type="submit" className="w-full h-11 flex items-center justify-center p-0 rounded-xl">
                        <Check className="w-5 h-5" />
                    </Button>
                </div>
            </form>
        </Card>
    );
}
