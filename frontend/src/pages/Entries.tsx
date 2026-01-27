import { useState } from 'react';
import { Plus, Upload, ChevronRight } from 'lucide-react';
import { Button } from '../components/UI';
import EntryForm from '../components/EntryForm';
import EntryTable from '../components/EntryTable';

interface EntryItem {
    id: string;
    sku: string;
    description: string;
    quantity: number;
    origin: 'Manual' | 'XML';
}

export default function Entries() {
    const [showForm, setShowForm] = useState(false);
    const [items, setItems] = useState<EntryItem[]>([]);
    const [confirming, setConfirming] = useState(false);

    const handleAddManual = (item: { sku: string; description: string; quantity: number }) => {
        const newItem: EntryItem = {
            id: Date.now().toString(),
            ...item,
            origin: 'Manual',
        };
        setItems([...items, newItem]);
    };

    const handleImportXML = () => {
        const mockXMLItems: EntryItem[] = [
            { id: Date.now().toString(), sku: 'XML001', description: 'Produto Importado A', quantity: 15, origin: 'XML' },
            { id: (Date.now() + 1).toString(), sku: 'XML002', description: 'Produto Importado B', quantity: 8, origin: 'XML' },
            { id: (Date.now() + 2).toString(), sku: 'XML003', description: 'Produto Importado C', quantity: 22, origin: 'XML' },
        ];
        setItems([...items, ...mockXMLItems]);
    };

    const handleUpdateQuantity = (id: string, quantity: number) => {
        setItems(items.map(item => item.id === id ? { ...item, quantity } : item));
    };

    const handleRemove = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleConfirm = async () => {
        setConfirming(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert(`${items.length} itens confirmados no estoque!`);
        setItems([]);
        setConfirming(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={() => setShowForm(!showForm)} variant="outline">
                    <Plus className="w-4 h-4" />
                    Nova Entrada Manual
                </Button>
                <Button onClick={handleImportXML} variant="outline">
                    <Upload className="w-4 h-4" />
                    Importar XML
                </Button>
            </div>

            {showForm && (
                <EntryForm onAdd={handleAddManual} onClose={() => setShowForm(false)} />
            )}

            <EntryTable
                items={items}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
            />

            {items.length > 0 && (
                <div className="flex justify-end">
                    <Button onClick={handleConfirm} loading={confirming} className="h-12 px-8">
                        Confirmar Entrada no Estoque
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
