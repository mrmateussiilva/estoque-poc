import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
        <div className="space-y-6 md:space-y-8">
            <div className="fixed top-20 right-4 left-4 md:left-auto md:top-24 md:right-8 z-50 flex flex-col gap-3 md:max-w-md">
                {error && (
                    <div className="bg-white border-l-4 border-ruby-700 shadow-xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 rounded-ruby animate-in slide-in-from-top-4 duration-300">
                        <span className="text-xs md:text-sm font-medium text-charcoal-700">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="bg-white border-l-4 border-emerald-500 shadow-xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 rounded-ruby animate-in slide-in-from-top-4 duration-300">
                        <span className="text-xs md:text-sm font-medium text-charcoal-700">{success}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KPICard
                    title="Itens em Estoque"
                    value={loading ? "..." : stats?.total_items.toFixed(0) || "0"}
                    subtitle="Total de unidades"
                />
                <KPICard
                    title="SKUs Ativos"
                    value={loading ? "..." : stats?.total_skus || 0}
                    subtitle="Produtos cadastrados"
                />
                <KPICard
                    title="Entradas no Mês"
                    value={loading ? "..." : stats?.entries_this_month || 0}
                    subtitle="NF-es processadas"
                />
                <KPICard
                    title="Alertas"
                    value={loading ? "..." : stats?.low_stock_count || 0}
                    subtitle="Estoque baixo"
                    icon={stats && stats.low_stock_count > 0 ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : undefined}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {evolution.length > 0 && (
                    <Card className="p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5 text-ruby-700" />
                            <h3 className="text-base md:text-lg font-bold text-charcoal-900">Evolução de Estoque</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={evolution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="items" stroke="#9b111e" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                )}

                <Card className="p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Package className="w-5 h-5 text-ruby-700" />
                        <h3 className="text-base md:text-lg font-bold text-charcoal-900">Top 5 Produtos</h3>
                    </div>
                    {topProducts.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={topProducts}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="code" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                                <Tooltip />
                                <Bar dataKey="quantity" fill="#9b111e" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-sm text-charcoal-400">
                            Nenhum produto em estoque
                        </div>
                    )}
                </Card>
            </div>

            <Card className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-ruby-700" />
                    <h3 className="text-lg md:text-xl font-bold text-charcoal-900">Importar NF-e</h3>
                </div>

                <div className="relative group overflow-hidden rounded-ruby bg-charcoal-50 border border-transparent transition-all border-dashed hover:border-ruby-700/30 p-6 md:p-10 text-center cursor-pointer mb-6">
                    <input
                        type="file"
                        accept=".xml"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="space-y-4">
                        <div className="inline-flex w-14 h-14 bg-white rounded-full items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-ruby-700" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-charcoal-900">{file ? file.name : "Solte o arquivo XML aqui"}</p>
                            <p className="text-xs text-charcoal-400">Formato SEFAZ (.xml)</p>
                        </div>
                    </div>
                </div>

                <Button onClick={handleUpload} loading={uploading} disabled={!file} className="w-full h-12">
                    Processar NF-e
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </Card>
        </div>
    );
}
