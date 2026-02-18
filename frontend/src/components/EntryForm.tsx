import { useState } from 'react';
import { Check, Info, ArrowUpCircle, ArrowDownCircle, DollarSign, Calendar, Hash } from 'lucide-react';
import { Button, Card, Input, Label, Badge } from './UI';
import ProductSearch from './ProductSearch';
import { type Product } from '../hooks/useQueries';

interface EntryFormProps {
    onAdd: (item: {
        sku: string;
        description: string;
        quantity: number;
        type: 'ENTRADA' | 'SAIDA';
        unit_cost?: number;
        batch_number?: string;
        expiration_date?: string;
    }) => void;
    defaultType?: 'ENTRADA' | 'SAIDA';
}

export default function EntryForm({ onAdd, defaultType = 'ENTRADA' }: EntryFormProps) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [type, setType] = useState<'ENTRADA' | 'SAIDA'>(defaultType);
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedProduct && quantity) {
            onAdd({
                sku: selectedProduct.code,
                description: selectedProduct.name,
                quantity: Number(quantity),
                type,
                unit_cost: unitCost ? Number(unitCost) : undefined,
                batch_number: batchNumber || undefined,
                expiration_date: expirationDate || undefined
            });

            // Reset parcial para facilitar múltiplas entradas do mesmo tipo
            setQuantity('');
            // Manter custo e lote se o usuário estiver lançando o mesmo lote
        }
    };

    return (
        <Card className="p-6 border-2 border-dashed border-navy-200/50 bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-navy-500/5 blur-3xl -mr-32 -mt-32 group-hover:bg-navy-500/10 transition-all" />

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                {/* Cabeçalho do Form e Toggle de Tipo */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-navy-100 pb-4 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-navy-950 rounded-lg flex items-center justify-center">
                            <Info className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-navy-950 uppercase tracking-widest">Nova Movimentação</h4>
                            <p className="text-[9px] text-navy-400 font-bold uppercase tracking-tighter">Preencha os dados técnicos abaixo</p>
                        </div>
                    </div>

                    <div className="flex bg-navy-50 p-1 rounded-xl border border-navy-100 items-center">
                        <button
                            type="button"
                            onClick={() => setType('ENTRADA')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${type === 'ENTRADA'
                                ? 'bg-white text-emerald-600 shadow-sm border border-navy-100'
                                : 'text-navy-400 hover:text-navy-900'
                                }`}
                        >
                            <ArrowUpCircle className={`w-4 h-4 ${type === 'ENTRADA' ? 'text-emerald-500' : 'text-navy-300'}`} />
                            Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('SAIDA')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${type === 'SAIDA'
                                ? 'bg-white text-ruby-600 shadow-sm border border-navy-100'
                                : 'text-navy-400 hover:text-navy-900'
                                }`}
                        >
                            <ArrowDownCircle className={`w-4 h-4 ${type === 'SAIDA' ? 'text-ruby-500' : 'text-navy-300'}`} />
                            Saída
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Busca de Produto */}
                    <div className="md:col-span-8 space-y-2">
                        <Label className="text-[9px] font-black uppercase text-navy-400">Seleção de Produto (Nome ou SKU)</Label>
                        <ProductSearch onSelect={setSelectedProduct} />
                        {selectedProduct && (
                            <div className="flex items-center gap-2 pt-1 animate-in slide-in-from-top-1 duration-200">
                                <Badge variant="default" className="bg-navy-900! text-white! rounded-md py-0 text-[8px]">SKU: {selectedProduct.code}</Badge>
                                <span className="text-[10px] font-bold text-navy-900 opacity-60 uppercase">{selectedProduct.name}</span>
                                <Badge variant="purple" className="rounded-md py-0 text-[8px] italic">Estoque: {selectedProduct.quantity} {selectedProduct.unit}</Badge>
                            </div>
                        )}
                    </div>

                    {/* Quantidade */}
                    <div className="md:col-span-4 space-y-2">
                        <Label className="text-[9px] font-black uppercase text-navy-400">Quantidade</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0.00"
                                min="0.0001"
                                step="0.0001"
                                required
                                className="h-12 text-lg font-black bg-white focus:ring-navy-900/5 text-center"
                            />
                            {selectedProduct && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-navy-300 uppercase italic">{selectedProduct.unit}</span>}
                        </div>
                    </div>
                </div>

                {/* Campos Avançados / Financeiro e Rastreabilidade */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-navy-50">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-navy-400">Preço de Custo (Unid.)</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                value={unitCost}
                                onChange={(e) => setUnitCost(e.target.value)}
                                placeholder="0,00"
                                step="0.01"
                                disabled={type === 'SAIDA'}
                                className={`h-11 pl-10 font-bold bg-white focus:ring-navy-900/5 ${type === 'SAIDA' ? 'opacity-30' : ''}`}
                            />
                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-navy-400">Lote / Rastreabilidade</Label>
                        <div className="relative">
                            <Input
                                type="text"
                                value={batchNumber}
                                onChange={(e) => setBatchNumber(e.target.value)}
                                placeholder="S/ LOTE"
                                className="h-11 pl-10 font-bold bg-white focus:ring-navy-900/5 uppercase"
                            />
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-navy-400">Data de Validade</Label>
                        <div className="relative">
                            <Input
                                type="date"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                                className="h-11 pl-10 font-bold bg-white focus:ring-navy-900/5 uppercase"
                            />
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
                        </div>
                    </div>
                </div>

                {/* Botão de Adição */}
                <div className="flex justify-end pt-4 border-t border-navy-50">
                    <Button
                        type="submit"
                        disabled={!selectedProduct || !quantity}
                        className={`min-w-[200px] h-14 rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center gap-3 px-8 ${type === 'ENTRADA'
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                            : 'bg-ruby-600 hover:bg-ruby-700 shadow-ruby-500/20'
                            }`}
                    >
                        <Check className="w-5 h-5 text-white" />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em]">Adicionar à Mesa</span>
                    </Button>
                </div>
            </form>
        </Card>
    );
}
