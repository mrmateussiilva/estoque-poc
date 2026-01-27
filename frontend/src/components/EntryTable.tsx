import { Edit2, Trash2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Card } from './UI';

interface EntryItem {
    id: string;
    sku: string;
    description: string;
    quantity: number;
    origin: 'Manual' | 'XML';
}

interface EntryTableProps {
    items: EntryItem[];
    onUpdateQuantity: (id: string, quantity: number) => void;
    onRemove: (id: string) => void;
}

export default function EntryTable({ items, onUpdateQuantity, onRemove }: EntryTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const startEdit = (id: string, currentQuantity: number) => {
        setEditingId(id);
        setEditValue(String(currentQuantity));
    };

    const saveEdit = (id: string) => {
        const newQuantity = Number(editValue);
        if (newQuantity > 0) {
            onUpdateQuantity(id, newQuantity);
        }
        setEditingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <Card>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-charcoal-50">
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">SKU</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Produto</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em] text-right">Quantidade</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Origem</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em] text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-50/50">
                    {items.length > 0 ? (
                        items.map((item) => (
                            <tr key={item.id} className="hover:bg-charcoal-50/40 transition-colors">
                                <td className="px-8 py-5 text-sm font-mono text-ruby-700/70">{item.sku}</td>
                                <td className="px-8 py-5 text-sm font-bold text-charcoal-900">{item.description}</td>
                                <td className="px-8 py-5 text-sm text-right">
                                    {editingId === item.id ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="w-20 px-2 py-1 border border-charcoal-50 rounded text-sm text-right"
                                                min="1"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEdit(item.id)} className="text-emerald-600 hover:text-emerald-700">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={cancelEdit} className="text-ruby-700 hover:text-ruby-900">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="font-black text-charcoal-700">{item.quantity}</span>
                                    )}
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${item.origin === 'XML'
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'bg-purple-50 text-purple-700'
                                        }`}>
                                        {item.origin}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {editingId !== item.id && (
                                            <button
                                                onClick={() => startEdit(item.id, item.quantity)}
                                                className="text-charcoal-400 hover:text-charcoal-900"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onRemove(item.id)}
                                            className="text-charcoal-400 hover:text-ruby-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-8 py-20 text-center text-sm text-charcoal-400 italic">
                                Nenhum item adicionado. Use os botões acima para adicionar itens.
                            </td>
                        </tr>
                    )}
                </tbody>
                {items.length > 0 && (
                    <tfoot>
                        <tr className="border-t-2 border-charcoal-900">
                            <td colSpan={2} className="px-8 py-5 text-sm font-bold text-charcoal-900">Total</td>
                            <td className="px-8 py-5 text-sm font-black text-ruby-700 text-right">{totalItems}</td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </Card>
    );
}
