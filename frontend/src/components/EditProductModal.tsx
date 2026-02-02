import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from './UI';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-ruby shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-50 bg-charcoal-50/20">
                    <div>
                        <h3 className="text-lg font-black text-charcoal-900">Editar Produto</h3>
                        <p className="text-xs text-charcoal-400 font-mono">SKU: {product.code}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-charcoal-300 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
                    {error && (
                        <div className="mb-6 p-4 bg-ruby-50 border border-ruby-100 rounded-ruby flex items-center gap-3 text-ruby-700 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Informações Básicas */}
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400 mb-1.5 ml-1">Nome do Produto</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-charcoal-50/50 border border-charcoal-100 rounded-ruby text-sm focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400 mb-1.5 ml-1">Descrição</label>
                                <textarea
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-charcoal-50/50 border border-charcoal-100 rounded-ruby text-sm focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Classificação */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400 mb-1.5 ml-1">Categoria</label>
                            <select
                                name="category_id"
                                value={formData.category_id ?? ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-charcoal-50/50 border border-charcoal-100 rounded-ruby text-sm focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Sem Categoria</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400 mb-1.5 ml-1">Unidade</label>
                            <input
                                type="text"
                                name="unit"
                                value={formData.unit || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-charcoal-50/50 border border-charcoal-100 rounded-ruby text-sm focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 outline-none transition-all"
                            />
                        </div>

                        {/* Preços */}
                        <div className="p-4 bg-emerald-50/30 border border-emerald-100/50 rounded-ruby space-y-4">
                            <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                Financeiro
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-charcoal-400 mb-1.5">Preço Custo</label>
                                    <input
                                        type="number"
                                        name="cost_price"
                                        value={formData.cost_price ?? 0}
                                        onChange={handleChange}
                                        step="0.01"
                                        className="w-full px-3 py-2 bg-white border border-charcoal-100 rounded-ruby text-sm font-bold text-charcoal-700 focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-charcoal-400 mb-1.5">Preço Venda</label>
                                    <input
                                        type="number"
                                        name="sale_price"
                                        value={formData.sale_price ?? 0}
                                        onChange={handleChange}
                                        step="0.01"
                                        className="w-full px-3 py-2 bg-white border border-charcoal-100 rounded-ruby text-sm font-bold text-ruby-700 focus:border-ruby-700 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Estoque */}
                        <div className="p-4 bg-amber-50/30 border border-amber-100/50 rounded-ruby space-y-4">
                            <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                Gestão de Estoque
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-charcoal-400 mb-1.5">Mínimo</label>
                                    <input
                                        type="number"
                                        name="min_stock"
                                        value={formData.min_stock ?? 0}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-white border border-charcoal-100 rounded-ruby text-sm font-bold text-charcoal-700 focus:border-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-charcoal-400 mb-1.5">Máximo</label>
                                    <input
                                        type="number"
                                        name="max_stock"
                                        value={formData.max_stock || ''}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-white border border-charcoal-100 rounded-ruby text-sm font-bold text-charcoal-700 focus:border-amber-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Extras */}
                        <div className="md:col-span-2 grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400 mb-1.5 ml-1">Código de Barras</label>
                                <input
                                    type="text"
                                    name="barcode"
                                    value={formData.barcode || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-charcoal-50/50 border border-charcoal-100 rounded-ruby text-sm font-mono focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400 mb-1.5 ml-1">Localização</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location || ''}
                                    onChange={handleChange}
                                    placeholder="Ex: Corredor A, Prateleira 3"
                                    className="w-full px-4 py-2.5 bg-charcoal-50/50 border border-charcoal-100 rounded-ruby text-sm focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="mt-10 flex gap-3 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={loading} className="px-10">
                            <Save className="w-4 h-4" />
                            Salvar Alterações
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
