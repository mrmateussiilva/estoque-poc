import { useState, useEffect } from 'react';
import { Search, Package, ChevronRight, Download, ScanLine } from 'lucide-react';
import { Card, TableContainer, THead, TBody, Tr, Th, Td, Badge, Button } from '../components/UI';
import StockCard from '../components/StockCard';
import BarcodeScanner from '../components/BarcodeScanner';
import EditProductModal from '../components/EditProductModal';
import { type StockItem } from '../contexts/DataContext';
import { useStockQuery, useProductMutation, useCategoriesQuery } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/PullToRefresh';

export default function Stock() {
    const { apiFetch } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [editingProduct, setEditingProduct] = useState<StockItem | null>(null);
    const [activeTab, setActiveTab] = useState<string>('');
    const [exporting, setExporting] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['stock'] });
    };

    // Debounce para busca
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // React Query Hooks
    const { data: stock = [], isLoading: loading } = useStockQuery(debouncedSearch);
    const { data: categories = [] } = useCategoriesQuery();
    const productMutation = useProductMutation();

    const handleSaveProduct = async (updatedProduct: any) => {
        await productMutation.mutateAsync(updatedProduct);
        // Não precisa atualizar estado manual, o React Query invalida e refaz o fetch
    };

    const groupedStock = (stock || []).reduce((acc, item) => {
        const cat = item.category_name || 'Sem Categoria';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, StockItem[]>);

    const availableTabs = Object.keys(groupedStock).sort();

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

    const handleBarcodeScan = (code: string) => {
        // Buscar produto pelo código escaneado
        setSearch(code);
        setDebouncedSearch(code);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);

            const response = await apiFetch(`/api/export/stock?${params.toString()}`);

            if (!response.ok) throw new Error('Erro ao exportar');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `estoque_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            console.error('Erro ao exportar:', err);
            alert('Erro ao exportar dados. Tente novamente.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-8 animate-in fade-in duration-500 p-4 md:p-0">
                {/* Header / Filtros */}
                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                    <Card className="p-4 bg-white border border-charcoal-100 shadow-premium flex flex-col md:flex-row gap-4 items-center flex-1 w-full rounded-2xl">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 group-focus-within:text-ruby-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-charcoal-50 border border-charcoal-300 rounded-xl text-sm font-black tracking-tight focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white outline-none transition-all placeholder:text-charcoal-400 uppercase"
                            />
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-4 px-6 py-3 bg-navy-950 rounded-xl shadow-premium whitespace-nowrap border border-navy-800">
                                <Package className="w-4 h-4 text-ruby-500" />
                                <span className="text-xs font-black text-white uppercase tracking-[0.2em]">
                                    {stock.length} <span className="text-charcoal-500">Produtos</span>
                                </span>
                            </div>
                            <Button
                                onClick={() => setShowScanner(true)}
                                variant="primary"
                                className="whitespace-nowrap min-h-[48px]"
                            >
                                <ScanLine className="w-4 h-4" />
                                <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">Escanear</span>
                            </Button>
                            <Button
                                onClick={handleExport}
                                loading={exporting}
                                variant="outline"
                                className="whitespace-nowrap min-h-[48px]"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">Exportar CSV</span>
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Abas de Categorias */}
                <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-none no-scrollbar">
                    {availableTabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                whitespace-nowrap px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 relative overflow-hidden group/tab
                                ${activeTab === tab
                                    ? 'bg-navy-950 text-white shadow-premium scale-105 border border-navy-800'
                                    : 'bg-white text-charcoal-400 border border-charcoal-100 hover:border-ruby-200 hover:text-ruby-600 hover:bg-ruby-50/30'}
                            `}
                        >
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-ruby-600 rounded-t-full shadow-[0_0_10px_rgba(225,29,72,0.8)]" />
                            )}
                            {tab} <span className={`ml-2 px-2 py-0.5 rounded-md text-[9px] ${activeTab === tab ? 'bg-ruby-600 text-white' : 'bg-charcoal-50 text-charcoal-400'}`}>{groupedStock[tab].length}</span>
                        </button>
                    ))}
                </div>

                {/* Tabela (Desktop) / Cards (Mobile) */}
                <div className="space-y-4">
                    {/* Mobile: Cards View */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {loading && stock.length === 0 ? (
                            [...Array(6)].map((_, i) => (
                                <Card key={i} className="p-4 animate-pulse">
                                    <div className="h-6 bg-charcoal-50 rounded w-3/4 mb-3" />
                                    <div className="h-4 bg-charcoal-50 rounded w-1/2" />
                                </Card>
                            ))
                        ) : itemsInActiveTab.length > 0 ? (
                            itemsInActiveTab.map((item) => (
                                <StockCard
                                    key={item.code}
                                    item={item}
                                    onEdit={setEditingProduct}
                                />
                            ))
                        ) : (
                            <Card className="p-8 text-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-charcoal-50 rounded-xl flex items-center justify-center">
                                        <Package className="w-8 h-8 text-charcoal-200" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-charcoal-950 font-bold">Nenhum registro encontrado</p>
                                        <p className="text-charcoal-400 text-xs font-medium uppercase tracking-widest">Tente buscar por outro termo ou categoria</p>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Desktop: Table View */}
                    <div className="hidden md:block">
                        <TableContainer className="border-none shadow-premium rounded-3xl overflow-hidden">
                            <THead>
                                <Tr className="bg-navy-950 border-none">
                                    <Th className="text-white py-6">Produto & Identificação</Th>
                                    <Th className="text-center text-white">Saldo Atual</Th>
                                    <Th className="text-right text-white">Valor Venda</Th>
                                    <Th className="text-white">Disponibilidade</Th>
                                    <Th className="w-10 text-white">{null}</Th>
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
                </div>

                {/* Scanner de Código de Barras */}
                {showScanner && (
                    <BarcodeScanner
                        onScan={handleBarcodeScan}
                        onClose={() => setShowScanner(false)}
                        title="Escanear Código de Barras"
                    />
                )}

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
        </PullToRefresh>
    );
}