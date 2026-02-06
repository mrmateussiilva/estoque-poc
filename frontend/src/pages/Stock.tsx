import { useState, useEffect } from 'react';
import { Search, Package, ChevronRight } from 'lucide-react';
import { Card, TableContainer, THead, TBody, Tr, Th, Td, Badge } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import EditProductModal from '../components/EditProductModal';
import { useData, type StockItem } from '../contexts/DataContext';

export default function Stock() {
    const { apiFetch } = useAuth();
    const {
        stock, setStock,
        categories, setCategories
    } = useData();
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [editingProduct, setEditingProduct] = useState<StockItem | null>(null);
    const [activeTab, setActiveTab] = useState<string>('');

    const fetchCategories = async () => {
        if (categories.length > 0) return;
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
            // Removido filtro de categoria da API pois faremos agrupamento local

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
    }, [search]); // Removido selectedCategory como dependência

    // Agrupamento de itens por categoria
    const groupedStock = stock.reduce((acc, item) => {
        const cat = item.category_name || 'Sem Categoria';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, StockItem[]>);

    const availableTabs = Object.keys(groupedStock).sort();

    // Sincronizar activeTab se ela for perdida ou vazia
    useEffect(() => {
        if (availableTabs.length > 0 && (!activeTab || !availableTabs.includes(activeTab))) {
            setActiveTab(availableTabs[0]);
        }
    }, [availableTabs, activeTab]);

    const itemsInActiveTab = activeTab ? groupedStock[activeTab] || [] : [];

    const getStatusBadge = (item: StockItem) => {
        if (item.quantity <= 0) return <Badge variant="error">Esgotado</Badge>;
        if (item.quantity < item.min_stock) return <Badge variant="warning">Baixo Estoque</Badge>;
        return <Badge variant="success">Em Estoque</Badge>;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Filtros */}
            <Card className="p-4 bg-white border border-charcoal-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 group-focus-within:text-ruby-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-charcoal-50 border border-charcoal-100 rounded-lg text-sm font-semibold tracking-tight focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white outline-none transition-all placeholder:text-charcoal-300"
                    />
                </div>

                <div className="flex items-center gap-3 px-4 py-2 bg-ruby-50/50 rounded-lg border border-ruby-100/50">
                    <Package className="w-4 h-4 text-ruby-600" />
                    <span className="text-xs font-bold text-ruby-950 uppercase tracking-widest">
                        {stock.length} Produtos
                    </span>
                </div>
            </Card>

            {/* Abas de Categorias */}
            <div className="flex overflow-x-auto pb-4 gap-2 scrollbar-none no-scrollbar">
                {availableTabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
                            whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all
                            ${activeTab === tab
                                ? 'bg-charcoal-900 text-white shadow-lg shadow-charcoal-900/20 scale-105'
                                : 'bg-white text-charcoal-400 border border-charcoal-200 hover:border-charcoal-300 hover:bg-charcoal-100'}
                        `}
                    >
                        {tab} ({groupedStock[tab].length})
                    </button>
                ))}
            </div>

            {/* Tabela */}
            <div className="space-y-4">
                <TableContainer className="border-none">
                    <THead>
                        <Tr>
                            <Th>Produto & Identificação</Th>
                            <Th className="text-center">Saldo Atual</Th>
                            <Th className="text-right">Valor Venda</Th>
                            <Th>Disponibilidade</Th>
                            <Th className="w-10">{null}</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {loading && stock.length === 0 ? (
                            [...Array(6)].map((_, i) => (
                                <Tr key={i} className="animate-pulse">
                                    <Td><div className="h-5 bg-charcoal-50 rounded w-56" /></Td>
                                    <Td><div className="h-5 bg-charcoal-50 rounded w-16 mx-auto" /></Td>
                                    <Td><div className="h-5 bg-charcoal-50 rounded w-24 ml-auto" /></Td>
                                    <Td><div className="h-7 bg-charcoal-50 rounded-full w-32" /></Td>
                                    <Td>{null}</Td>
                                </Tr>
                            ))
                        ) : itemsInActiveTab.length > 0 ? (
                            itemsInActiveTab.map((item) => (
                                <Tr key={item.code} onClick={() => setEditingProduct(item)}>
                                    <Td>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-charcoal-950 group-hover:text-ruby-600 transition-colors uppercase tracking-tight">{item.name}</span>
                                            <span className="text-[10px] font-bold text-charcoal-400 mt-1 uppercase tracking-widest">SKU: {item.code}</span>
                                        </div>
                                    </Td>
                                    <Td className="text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-base font-bold tracking-tight ${item.quantity < item.min_stock ? 'text-ruby-600' : 'text-charcoal-900'}`}>
                                                {item.quantity}
                                            </span>
                                            <span className="text-[10px] font-bold text-charcoal-300 uppercase tracking-widest leading-none">{item.unit}</span>
                                        </div>
                                    </Td>
                                    <Td className="text-right">
                                        <span className="text-sm font-semibold text-charcoal-950 tracking-tight">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.sale_price)}
                                        </span>
                                    </Td>
                                    <Td>
                                        {getStatusBadge(item)}
                                    </Td>
                                    <Td className="text-right">
                                        <div className="w-8 h-8 rounded-full bg-charcoal-50 flex items-center justify-center text-charcoal-300 group-hover:bg-charcoal-100 group-hover:text-charcoal-600 transition-all">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </Td>
                                </Tr>
                            ))
                        ) : (
                            <Tr>
                                <Td colSpan={5} className="px-8 py-24 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-charcoal-50 rounded-xl flex items-center justify-center">
                                            <Package className="w-8 h-8 text-charcoal-200" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-charcoal-950 font-bold">Nenhum registro encontrado</p>
                                            <p className="text-charcoal-400 text-xs font-medium uppercase tracking-widest">Tente buscar por outro termo ou categoria</p>
                                        </div>
                                    </div>
                                </Td>
                            </Tr>
                        )}
                    </TBody>
                </TableContainer>
            </div>

            {/* Resumo Rodapé (Baseado nos itens da ABA ATIVA para maior clareza) */}
            <div className="bg-charcoal-900 p-6 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-widest rounded-xl shadow-lg border border-charcoal-800">
                <span>Itens em {activeTab}: {itemsInActiveTab.length}</span>
                <div className="flex gap-10 mt-4 md:mt-0">
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-ruby-600 rounded-full" />
                        {itemsInActiveTab.filter(i => i.quantity <= 0).length} Esgotados
                    </span>
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        {itemsInActiveTab.filter(i => i.quantity > 0 && i.quantity < i.min_stock).length} Baixo Estoque
                    </span>
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        {itemsInActiveTab.filter(i => i.quantity >= i.min_stock).length} Saudáveis
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
