import { Trash2, PackageSearch } from 'lucide-react';
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
    if (items.length === 0) {
        return (
            <Card className="py-16 text-center border-dashed border-2">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-charcoal-50 rounded-full flex items-center justify-center">
                        <PackageSearch className="w-6 h-6 text-charcoal-300" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-charcoal-900">Nenhum item adicionado</h3>
                        <p className="text-xs text-charcoal-400 max-w-[200px] mx-auto">
                            Adicione itens manualmente ou importe um XML para continuar
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border-charcoal-200/50">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
                    <thead>
                        <tr className="bg-charcoal-50/50 border-b border-charcoal-100">
                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-charcoal-500 uppercase tracking-widest">SKU</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-charcoal-500 uppercase tracking-widest">Produto</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-charcoal-500 uppercase tracking-widest text-center">Quantidade</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-charcoal-500 uppercase tracking-widest text-center">Origem</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-charcoal-500 uppercase tracking-widest text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-50">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-charcoal-50/30 transition-colors group">
                                <td className="px-4 md:px-6 py-4 text-xs font-mono text-ruby-700/70">{item.sku}</td>
                                <td className="px-4 md:px-6 py-4 text-sm font-bold text-charcoal-900">{item.description}</td>
                                <td className="px-4 md:px-6 py-4 text-center">
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                                        className="w-16 px-2 py-1 text-center text-sm font-black border border-transparent hover:border-charcoal-200 focus:border-ruby-700 rounded transition-all outline-none"
                                    />
                                </td>
                                <td className="px-4 md:px-6 py-4 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.origin === 'Manual'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        }`}>
                                        {item.origin}
                                    </span>
                                </td>
                                <td className="px-4 md:px-6 py-4 text-right">
                                    <button
                                        onClick={() => onRemove(item.id)}
                                        className="p-2 text-charcoal-300 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
