import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './UI';

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
        <div className="bg-white rounded-ruby border border-charcoal-50 shadow-ruby p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-charcoal-900">Nova Entrada Manual</h3>
                <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-charcoal-700 mb-2">SKU</label>
                    <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="w-full px-3 py-2 border border-charcoal-50 rounded-ruby focus:outline-none focus:ring-2 focus:ring-ruby-700 text-sm"
                        placeholder="SKU123"
                        required
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-charcoal-700 mb-2">Descrição</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-charcoal-50 rounded-ruby focus:outline-none focus:ring-2 focus:ring-ruby-700 text-sm"
                        placeholder="Nome do produto"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-charcoal-700 mb-2">Quantidade</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-3 py-2 border border-charcoal-50 rounded-ruby focus:outline-none focus:ring-2 focus:ring-ruby-700 text-sm"
                        placeholder="10"
                        min="1"
                        required
                    />
                </div>

                <div className="md:col-span-4">
                    <Button type="submit" className="w-full">Adicionar à Tabela</Button>
                </div>
            </form>
        </div>
    );
}
