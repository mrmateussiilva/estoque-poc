import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button, Card, Input, Label } from './UI';

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
        <Card className="p-8 border border-charcoal-200 bg-white relative">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-charcoal-400 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all z-10"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
                <h3 className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-ruby-600 rounded-full" />
                    Novo Lançamento Individual
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-3 space-y-1.5">
                    <Label>Código SKU</Label>
                    <Input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Ex: SKU-001"
                        required
                        autoFocus
                    />
                </div>

                <div className="md:col-span-6 space-y-1.5">
                    <Label>Descrição do Produto</Label>
                    <Input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Nome completo ou detalhes"
                        required
                    />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                    <Label>Quantidade</Label>
                    <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        min="1"
                        required
                    />
                </div>

                <div className="md:col-span-1">
                    <Button type="submit" className="w-full h-12 bg-charcoal-900 hover:bg-black">
                        <Check className="w-5 h-5 text-ruby-500" />
                    </Button>
                </div>
            </form>
        </Card>
    );
}
