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
            <Card className="py-24 text-center border-dashed border-2 border-charcoal-100 bg-charcoal-50/10">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-charcoal-100 flex items-center justify-center">
                        <PackageSearch className="w-10 h-10 text-charcoal-200" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-charcoal-950 tracking-tighter uppercase italic">Mesa de Operação Vazia</h3>
                        <p className="text-sm font-bold text-charcoal-400 max-w-[300px] mx-auto leading-relaxed">
                            Adicione itens manualmente ou via XML para iniciar o processamento de estoque.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border-none shadow-ruby p-0">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
                    <thead>
                        <tr className="bg-charcoal-950 text-white/40 uppercase">
                            <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">Cód. Identificador</th>
                            <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">Descrição do Item</th>
                            <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em] text-center">Unidades</th>
                            <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em] text-center">Procedência</th>
                            <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em] text-right">Controles</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-100/50 bg-white">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-ruby-50/20 transition-all group">
                                <td className="px-8 py-6 text-[10px] font-black text-ruby-600/70 tracking-widest">{item.sku}</td>
                                <td className="px-8 py-6 text-sm font-black text-charcoal-950 uppercase tracking-tight">{item.description}</td>
                                <td className="px-8 py-6 text-center">
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                                        className="w-20 px-3 py-2 text-center text-sm font-black border-2 border-transparent hover:border-charcoal-100 focus:border-ruby-600/50 bg-charcoal-50/50 rounded-xl transition-all outline-none"
                                    />
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${item.origin === 'Manual'
                                        ? 'bg-amber-50 text-amber-600 border-amber-200/50'
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-200/50'
                                        }`}>
                                        {item.origin === 'Manual' ? 'Lançamento Local' : 'Importação XML'}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button
                                        onClick={() => onRemove(item.id)}
                                        className="w-10 h-10 flex items-center justify-center text-charcoal-300 hover:text-ruby-700 hover:bg-ruby-50 rounded-xl transition-all ml-auto"
                                    >
                                        <Trash2 className="w-5 h-5" />
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
