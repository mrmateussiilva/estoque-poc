import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Card, Input, Label } from './UI';

interface EntryFormProps {
    onAdd: (item: { sku: string; description: string; quantity: number }) => void;
}

export default function EntryForm({ onAdd }: EntryFormProps) {
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
        <Card className="p-4 border-2 border-dashed border-ruby-200 bg-ruby-50/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-ruby-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-ruby-500/10 transition-all" />

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end relative z-10">
                <div className="md:col-span-3 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-ruby-600">Código / Barcode</Label>
                    <Input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="LER SKU..."
                        required
                        autoFocus
                        className="h-12 border-ruby-200 focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 bg-white font-black text-base placeholder:text-ruby-200"
                    />
                </div>

                <div className="md:col-span-6 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-navy-900 opacity-60">Identificação do Produto</Label>
                    <Input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="DESCRIÇÃO AUTOMÁTICA OU MANUAL..."
                        required
                        className="h-12 border-charcoal-200 focus:bg-white bg-white/50 text-sm font-bold uppercase"
                    />
                </div>

                <div className="md:col-span-2 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-navy-900 opacity-60">Qtd</Label>
                    <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        min="1"
                        required
                        className="h-12 text-center text-lg font-black bg-white"
                    />
                </div>

                <div className="md:col-span-1">
                    <Button type="submit" className="w-full h-12 bg-ruby-600 hover:bg-ruby-700 shadow-ruby">
                        <Check className="w-6 h-6 text-white" />
                    </Button>
                </div>
            </form>
        </Card>
    );
}
