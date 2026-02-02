import { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, Package, ChevronRight } from 'lucide-react';
import { Card } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import EditProductModal from '../components/EditProductModal';

interface StockItem {
    code: string;
    name: string;
    quantity: number;
    unit: string;
    min_stock: number;
    sale_price: number;
    category_name: string;
    description?: string;
    category_id?: number;
    barcode?: string;
    cost_price?: number;
    max_stock?: number;
    location?: string;
}

interface Category {
    id: number;
    name: string;
}

export default function Stock() {
    const { apiFetch } = useAuth();
    const [stock, setStock] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [editingProduct, setEditingProduct] = useState<StockItem | null>(null);

    const fetchCategories = async () => {
        try {
            const response = await apiFetch('/api/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data || []);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchStock = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (search) query.append('search', search);
            if (selectedCategory) query.append('category_id', selectedCategory);

            const response = await apiFetch(`/stock?${query.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setStock(data || []);
            }
        } catch (err) {
            console.error('Error fetching stock:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProduct = async (updatedProduct: any) => {
        const response = await apiFetch(`/api/products/${updatedProduct.code}`, {
            method: 'PUT',
            body: JSON.stringify(updatedProduct)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao salvar produto');
        }

        fetchStock();
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStock();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, selectedCategory]);

    const getStatusBadge = (item: StockItem) => {
        if (item.quantity <= 0) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ruby-50 text-ruby-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <AlertCircle className="w-3 h-3" />
                    Esgotado
                </span>
            );
        }
        if (item.quantity < item.min_stock) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <Package className="w-3 h-3" />
                    Baixo Estoque
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Em Estoque
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header / Filtros */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-charcoal-100 rounded-ruby text-sm focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 outline-none transition-all placeholder:text-charcoal-300"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full md:w-48 pl-10 pr-8 py-2 bg-white border border-charcoal-100 rounded-ruby text-sm appearance-none focus:ring-2 focus:ring-ruby-700/20 focus:border-ruby-700 outline-none cursor-pointer text-charcoal-700"
                        >
                            <option value="">Todas Categorias</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <Card className="overflow-hidden border-none shadow-ruby">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-charcoal-900 text-white">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Produto</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Categoria</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-center">Quantidade</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-right">Preço Venda</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-50 bg-white">
                            {loading && stock.length === 0 ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-5"><div className="h-4 bg-charcoal-50 rounded w-48" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-charcoal-50 rounded w-24" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-charcoal-50 rounded w-16 mx-auto" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-charcoal-50 rounded w-20 ml-auto" /></td>
                                        <td className="px-6 py-5"><div className="h-6 bg-charcoal-50 rounded-full w-24" /></td>
                                        <td className="px-6 py-5"></td>
                                    </tr>
                                ))
                            ) : stock.length > 0 ? (
                                stock.map((item) => (
                                    <tr key={item.code}
                                        onClick={() => setEditingProduct(item)}
                                        className="hover:bg-charcoal-50/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-charcoal-900 group-hover:text-ruby-700 transition-colors">{item.name}</span>
                                                <span className="text-[10px] font-mono text-charcoal-400 mt-0.5 tracking-tighter">SKU: {item.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-xs font-semibold text-charcoal-600 bg-charcoal-50 px-2 py-1 rounded">
                                                {item.category_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-sm font-black ${item.quantity < item.min_stock ? 'text-amber-600' : 'text-charcoal-900'}`}>
                                                    {item.quantity}
                                                </span>
                                                <span className="text-[9px] font-bold text-charcoal-300 uppercase">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-sm font-bold text-charcoal-900">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.sale_price)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {getStatusBadge(item)}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button className="p-1.5 text-charcoal-200 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Package className="w-12 h-12 text-charcoal-100" />
                                            <div className="space-y-1">
                                                <p className="text-charcoal-400 text-sm font-medium">Nenhum produto encontrado</p>
                                                <p className="text-charcoal-300 text-xs">Tente ajustar sua busca ou filtros</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Resumo Rodapé */}
            <div className="bg-white border-t border-charcoal-100 p-4 flex justify-between items-center text-[10px] font-bold text-charcoal-400 uppercase tracking-widest rounded-ruby shadow-sm">
                <span>Total de Registros: {stock.length}</span>
                <div className="flex gap-6">
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-ruby-500 rounded-full" />
                        {stock.filter(i => i.quantity <= 0).length} Esgotados
                    </span>
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        {stock.filter(i => i.quantity > 0 && i.quantity < i.min_stock).length} Baixos
                    </span>
                </div>
            </div>

            {/* Modal de Edição */}
            {editingProduct && (
                <EditProductModal
                    product={editingProduct as any}
                    categories={categories}
                    onClose={() => setEditingProduct(null)}
                    onSave={handleSaveProduct}
                />
            )}
        </div>
    );
}
