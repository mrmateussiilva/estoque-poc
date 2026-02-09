import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button, Input, Label, Select } from './UI';

interface Category {
    id: number;
    name: string;
}

interface Product {
    code: string;
    name: string;
    description?: string;
    category_id?: number;
    unit: string;
    barcode?: string;
    cost_price: number;
    sale_price: number;
    min_stock: number;
    max_stock?: number;
    location?: string;
    supplier_id?: number;
}

interface EditProductModalProps {
    product: Product;
    categories: Category[];
    onClose: () => void;
    onSave: (updatedProduct: Product) => Promise<void>;
}

export default function EditProductModal({ product, categories, onClose, onSave }: EditProductModalProps) {
    const [formData, setFormData] = useState<Product>({ ...product });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Lista de campos que devem ser numéricos no backend
        const numericFields = ['category_id', 'supplier_id', 'cost_price', 'sale_price', 'min_stock', 'max_stock'];

        setFormData(prev => ({
            ...prev,
            [name]: numericFields.includes(name) ? (value === '' ? undefined : Number(value)) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar produto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/40 animate-in fade-in duration-300 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-charcoal-200 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-charcoal-100 bg-charcoal-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-charcoal-900 rounded-lg flex items-center justify-center shadow-lg">
                            <Save className="w-5 h-5 text-ruby-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-charcoal-950 tracking-tight uppercase">Editar Produto</h3>
                            <p className="text-[10px] font-bold text-charcoal-400 mt-0.5 uppercase tracking-widest">Ativo Logístico: {product.code}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-charcoal-400 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[75vh] custom-scrollbar space-y-8">
                    {error && (
                        <div className="p-4 bg-ruby-50 border border-ruby-100 rounded-lg flex items-center gap-3 text-ruby-700 text-sm font-semibold">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-8">
                        {/* Seção Identidade */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3 bg-ruby-600 rounded-full" />
                                <h4 className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">Informações Básicas</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Nome do Produto</Label>
                                    <Input
                                        type="text"
                                        name="name"
                                        value={formData.name || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ex: Teclado Mecânico RGB"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Descrição</Label>
                                    <textarea
                                        name="description"
                                        value={formData.description || ''}
                                        onChange={handleChange}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white text-sm font-semibold tracking-tight transition-all resize-none placeholder:text-charcoal-400"
                                        placeholder="Detalhes do produto..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção Classificação */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <Label>Categoria</Label>
                                <Select
                                    name="category_id"
                                    value={formData.category_id ?? ''}
                                    onChange={handleChange}
                                >
                                    <option value="">Não Definida</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Unidade</Label>
                                <Input
                                    type="text"
                                    name="unit"
                                    value={formData.unit || ''}
                                    onChange={handleChange}
                                    className="uppercase"
                                    placeholder="Ex: UN, KG"
                                />
                            </div>
                        </div>

                        {/* Seção Precificação e Estoque */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-charcoal-50 border border-charcoal-200 rounded-xl space-y-4">
                                <h4 className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-ruby-600 rounded-full" />
                                    Financeiro
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label>Preço de Custo</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 text-xs font-bold">R$</span>
                                            <Input
                                                type="number"
                                                name="cost_price"
                                                value={formData.cost_price ?? 0}
                                                onChange={handleChange}
                                                step="0.01"
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Preço de Venda</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ruby-600 text-xs font-bold">R$</span>
                                            <Input
                                                type="number"
                                                name="sale_price"
                                                value={formData.sale_price ?? 0}
                                                onChange={handleChange}
                                                step="0.01"
                                                className="pl-10 text-ruby-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-charcoal-900 border border-charcoal-800 rounded-xl space-y-4">
                                <h4 className="text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                                    Níveis de Estoque
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-white/60">Estoque Mínimo</Label>
                                        <input
                                            type="number"
                                            name="min_stock"
                                            value={formData.min_stock ?? 0}
                                            onChange={handleChange}
                                            className="w-full h-11 px-4 bg-white/5 border border-white/20 rounded-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-white/60">Estoque Máximo</Label>
                                        <input
                                            type="number"
                                            name="max_stock"
                                            value={formData.max_stock || ''}
                                            onChange={handleChange}
                                            className="w-full h-11 px-4 bg-white/5 border border-white/20 rounded-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extras */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <Label>Código de Barras</Label>
                                <Input
                                    type="text"
                                    name="barcode"
                                    value={formData.barcode || ''}
                                    onChange={handleChange}
                                    className="font-mono"
                                    placeholder="0000000000000"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Localização</Label>
                                <Input
                                    type="text"
                                    name="location"
                                    value={formData.location || ''}
                                    onChange={handleChange}
                                    className="uppercase"
                                    placeholder="Ex: SETOR A - PRAT. 3"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="pt-4 flex gap-3 justify-end border-t border-charcoal-100">
                        <Button variant="outline" onClick={onClose} disabled={loading} className="px-6 h-11 uppercase text-[10px] font-bold tracking-widest">
                            Descartar
                        </Button>
                        <Button type="submit" loading={loading} className="px-8 h-11 bg-charcoal-900 hover:bg-black uppercase text-[10px] font-bold tracking-widest">
                            Salvar Alterações
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
