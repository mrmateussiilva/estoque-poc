import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Upload, ChevronRight, TrendingUp, Package, FileText, AlertTriangle } from 'lucide-react';
import { Card, KPICard, Button } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
    total_items: number;
    total_skus: number;
    entries_this_month: number;
    low_stock_count: number;
}

interface StockEvolution {
    month: string;
    items: number;
}

interface StockItem {
    code: string;
    name: string;
    quantity: number;
}

export default function Dashboard() {
    const { apiFetch } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [evolution, setEvolution] = useState<StockEvolution[]>([]);
    const [topProducts, setTopProducts] = useState<StockItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Buscar estatísticas
            const statsRes = await apiFetch('/api/dashboard/stats');
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            // Buscar evolução
            const evolutionRes = await apiFetch('/api/dashboard/evolution');
            if (evolutionRes.ok) {
                const evolutionData = await evolutionRes.json();
                setEvolution(evolutionData || []);
            }

            // Buscar top produtos
            const stockRes = await apiFetch('/stock');
            if (stockRes.ok) {
                const stockData = await stockRes.json();
                const sorted = (stockData || [])
                    .sort((a: StockItem, b: StockItem) => b.quantity - a.quantity)
                    .slice(0, 5);
                setTopProducts(sorted);
            }
        } catch (err: any) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiFetch('/nfe/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.status === 409) throw new Error('NF-e já processada');
            if (!response.ok) throw new Error('Erro ao processar XML');

            setSuccess('NF-e processada com sucesso');
            setFile(null);
            await fetchDashboardData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    return (
        <div className="space-y-8">
            {/* Notificações Topo */}
            <div className="fixed top-24 right-8 z-50 flex flex-col gap-2 max-w-md">
                {error && (
                    <div className="bg-white border border-ruby-200 shadow-sm p-4 flex items-center gap-3 rounded-xl animate-in fade-in duration-300">
                        <AlertTriangle className="w-4 h-4 text-ruby-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-charcoal-900">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="bg-white border border-emerald-200 shadow-sm p-4 flex items-center gap-3 rounded-xl animate-in fade-in duration-300">
                        <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-charcoal-900">{success}</span>
                    </div>
                )}
            </div>

            {/* Cabeçalho Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Itens em Estoque"
                    value={loading ? "..." : stats?.total_items.toFixed(0) || "0"}
                    subtitle="Volume total estocado"
                    icon={<Package className="w-5 h-5" />}
                />
                <KPICard
                    title="SKUs Ativos"
                    value={loading ? "..." : stats?.total_skus || 0}
                    subtitle="Produtos cadastrados"
                    icon={<FileText className="w-5 h-5" />}
                />
                <KPICard
                    title="Entradas no Mês"
                    value={loading ? "..." : stats?.entries_this_month || 0}
                    subtitle="Documentos fiscais"
                    icon={<TrendingUp className="w-5 h-5" />}
                />
                <KPICard
                    title="Alertas de Estoque"
                    value={loading ? "..." : stats?.low_stock_count || 0}
                    subtitle="Reposição necessária"
                    icon={<AlertTriangle className={`w-5 h-5 ${stats && stats.low_stock_count > 0 ? 'text-ruby-500' : 'text-charcoal-300'}`} />}
                />
            </div>

            {/* Gráficos e Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-charcoal-50 rounded-lg flex items-center justify-center border border-charcoal-100">
                                <TrendingUp className="w-5 h-5 text-charcoal-900" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-charcoal-950 tracking-tight leading-none">Fluxo de Estoque</h3>
                                <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest mt-1">Evolução mensal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-ruby-600 rounded-full" />
                            <span className="text-[10px] font-bold text-charcoal-600 uppercase tracking-widest">Total Itens</span>
                        </div>
                    </div>

                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontWeight: 700 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="items"
                                    stroke="#e11d48"
                                    strokeWidth={3}
                                    dot={{ stroke: '#e11d48', strokeWidth: 2, fill: '#fff', r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-charcoal-50 rounded-lg flex items-center justify-center border border-charcoal-100">
                            <Package className="w-5 h-5 text-charcoal-900" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-charcoal-950 tracking-tight leading-none">Principais SKUs</h3>
                            <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest mt-1">Maiores volumes</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {topProducts.map((item, index) => (
                            <div key={item.code} className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-7 h-7 rounded bg-charcoal-50 flex items-center justify-center text-[10px] font-bold text-charcoal-400 border border-charcoal-100 uppercase">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-charcoal-900 leading-none group-hover:text-ruby-600 transition-colors uppercase tracking-tight">{item.name}</p>
                                        <p className="text-[10px] font-mono text-charcoal-400 mt-1 uppercase tracking-widest">SKU: {item.code}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-charcoal-900 leading-none">{item.quantity.toFixed(0)}</p>
                                    <p className="text-[9px] font-bold text-charcoal-400 uppercase tracking-widest mt-1">UNID</p>
                                </div>
                            </div>
                        ))}
                        {topProducts.length === 0 && (
                            <div className="h-40 flex items-center justify-center text-xs font-bold text-charcoal-400 uppercase tracking-widest opacity-40">
                                Sem dados
                            </div>
                        )}
                    </div>

                    <Button variant="outline" className="w-full mt-8 border-dashed flex md:hidden lg:flex">
                        Ver Estoque Completo
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </Card>
            </div>

            {/* Importação NF-e */}
            <Card className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1 space-y-3 text-center md:text-left">
                        <div className="w-12 h-12 bg-charcoal-950 rounded-xl flex items-center justify-center shadow-lg mb-4 mx-auto md:mx-0">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-charcoal-950 tracking-tight">Digitalização de NF-e</h3>
                        <p className="text-charcoal-500 text-sm font-medium max-w-md">Importe notas fiscais XML para atualização automática do inventário.</p>
                    </div>

                    <div className="w-full md:w-[360px] space-y-4">
                        <div
                            className={`
                                relative h-32 border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer
                                ${file ? 'border-ruby-500 bg-ruby-50/10' : 'border-charcoal-200 bg-charcoal-50/50 hover:border-ruby-600/20 hover:bg-ruby-50/5'}
                            `}
                        >
                            <input
                                type="file"
                                accept=".xml"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${file ? 'bg-ruby-500 text-white shadow-sm' : 'bg-white text-charcoal-400 border border-charcoal-100'}`}>
                                <FileText className="w-4 h-4" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-900">
                                {file ? file.name : "Selecionar XML"}
                            </p>
                        </div>

                        <Button onClick={handleUpload} loading={uploading} disabled={!file} className="w-full h-12 bg-ruby-600 hover:bg-ruby-700 text-white border-none shadow-sm">
                            Confirmar Importação
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
