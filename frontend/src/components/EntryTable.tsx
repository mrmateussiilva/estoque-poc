import { Trash2, PackageSearch } from 'lucide-react';
import { Card, TableContainer, THead, TBody, Tr, Th, Td, Badge } from './UI';

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
            <Card className="py-24 text-center border-dashed border-2 border-charcoal-300 bg-charcoal-50/10">
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
        <TableContainer className="border-none">
            <THead>
                <Tr>
                    <Th>Cód. Identificador</Th>
                    <Th>Descrição do Item</Th>
                    <Th className="text-center">Unidades</Th>
                    <Th className="text-center">Procedência</Th>
                    <Th className="text-right">Controles</Th>
                </Tr>
            </THead>
            <TBody>
                {items.map((item) => (
                    <Tr key={item.id}>
                        <Td className="text-[10px] font-black text-ruby-600/70 tracking-widest">{item.sku}</Td>
                        <Td className="text-sm font-black text-charcoal-950 uppercase tracking-tight">{item.description}</Td>
                        <Td className="text-center">
                            <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-2 text-center text-sm font-black border-2 border-charcoal-200 hover:border-charcoal-100 focus:border-ruby-600/50 bg-charcoal-50/50 rounded-xl transition-all outline-none"
                            />
                        </Td>
                        <Td className="text-center">
                            <Badge variant={item.origin === 'Manual' ? 'warning' : 'default'}>
                                {item.origin === 'Manual' ? 'Lançamento Local' : 'Importação XML'}
                            </Badge>
                        </Td>
                        <Td className="text-right">
                            <button
                                onClick={() => onRemove(item.id)}
                                className="w-10 h-10 flex items-center justify-center text-charcoal-300 hover:text-ruby-700 hover:bg-ruby-50 rounded-xl transition-all ml-auto"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </Td>
                    </Tr>
                ))}
            </TBody>
        </TableContainer>
    );
}
