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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Filtros */}
            <Card className="p-4 bg-white/80 backdrop-blur-md border border-charcoal-100/50 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 group-focus-within:text-ruby-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-charcoal-50/50 border border-charcoal-100 rounded-xl text-sm font-black tracking-tight focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white outline-none transition-all placeholder:text-charcoal-300 placeholder:font-bold"
                    />
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative group min-w-[200px] w-full md:w-auto">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 group-focus-within:text-ruby-600 pointer-events-none transition-colors" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full pl-12 pr-10 py-3 bg-charcoal-50/50 border border-charcoal-100 rounded-xl text-sm font-black tracking-tight appearance-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white outline-none cursor-pointer text-charcoal-700 hover:bg-charcoal-100/50 transition-all uppercase"
                        >
                            <option value="">Todas Categorias</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tabela */}
            <Card className="border-none shadow-ruby p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-charcoal-950 text-white/40 uppercase">
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">Produto & Identificação</th>
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">Sessão</th>
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em] text-center">Saldo Atual</th>
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em] text-right">Valor Venda</th>
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">Disponibilidade</th>
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em] w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-100/50 bg-white">
                            {loading && stock.length === 0 ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-6"><div className="h-5 bg-charcoal-50 rounded-lg w-56" /></td>
                                        <td className="px-8 py-6"><div className="h-5 bg-charcoal-50 rounded-lg w-28" /></td>
                                        <td className="px-8 py-6"><div className="h-5 bg-charcoal-50 rounded-lg w-16 mx-auto" /></td>
                                        <td className="px-8 py-6"><div className="h-5 bg-charcoal-50 rounded-lg w-24 ml-auto" /></td>
                                        <td className="px-8 py-6"><div className="h-7 bg-charcoal-50 rounded-full w-32" /></td>
                                        <td className="px-8 py-6"></td>
                                    </tr>
                                ))
                            ) : stock.length > 0 ? (
                                stock.map((item) => (
                                    <tr key={item.code}
                                        onClick={() => setEditingProduct(item)}
                                        className="hover:bg-ruby-50/20 transition-all group cursor-pointer"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-charcoal-900 group-hover:text-ruby-700 transition-colors uppercase tracking-tight">{item.name}</span>
                                                <span className="text-[10px] font-black text-charcoal-400 mt-1 uppercase tracking-widest opacity-50">SKU: {item.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <span className="text-[10px] font-black text-charcoal-600 bg-charcoal-100 px-2.5 py-1 rounded-md uppercase tracking-widest border border-charcoal-200/50">
                                                {item.category_name}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-base font-black tracking-tighter ${item.quantity < item.min_stock ? 'text-ruby-600' : 'text-charcoal-900'}`}>
                                                    {item.quantity}
                                                </span>
                                                <span className="text-[10px] font-black text-charcoal-300 uppercase tracking-widest opacity-60 leading-none">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className="text-sm font-black text-charcoal-900 tracking-tight">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.sale_price)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {getStatusBadge(item)}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="w-8 h-8 rounded-full bg-charcoal-50 flex items-center justify-center text-charcoal-300 group-hover:bg-ruby-100 group-hover:text-ruby-700 transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="w-20 h-20 bg-charcoal-50 rounded-3xl flex items-center justify-center">
                                                <Package className="w-10 h-10 text-charcoal-200" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-charcoal-950 text-lg font-black tracking-tighter">Nenhum registro encontrado</p>
                                                <p className="text-charcoal-400 text-xs font-bold uppercase tracking-widest">Tente realizar uma nova busca ou filtro</p>
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
            <div className="bg-charcoal-950 p-6 flex flex-col md:flex-row justify-between items-center text-[10px] font-black text-white/40 uppercase tracking-[0.25em] rounded-3xl shadow-xl">
                <span>Total de Itens Monitorados: {stock.length}</span>
                <div className="flex gap-10 mt-4 md:mt-0">
                    <span className="flex items-center gap-2.5">
                        <div className="w-2 h-2 bg-ruby-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                        {stock.filter(i => i.quantity <= 0).length} Esgotados
                    </span>
                    <span className="flex items-center gap-2.5">
                        <div className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                        {stock.filter(i => i.quantity > 0 && i.quantity < i.min_stock).length} Baixo Estoque
                    </span>
                    <span className="flex items-center gap-2.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        {stock.filter(i => i.quantity >= i.min_stock).length} Saudáveis
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
