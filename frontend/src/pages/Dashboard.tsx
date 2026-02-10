import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Upload, ChevronRight, TrendingUp, Package, FileText, AlertTriangle } from 'lucide-react';
import { Card, KPICard, Button } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardStatsQuery, useDashboardEvolutionQuery, useStockQuery } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { type StockItem } from '../contexts/DataContext';

export default function Dashboard() {
    const { apiFetch } = useAuth();
    const queryClient = useQueryClient();
    
    // Queries com polling automático (atualiza a cada 30 segundos)
    const { data: stats, isLoading: isLoadingStats } = useDashboardStatsQuery();
    const { data: evolution, isLoading: isLoadingEvolution } = useDashboardEvolutionQuery();
    const { data: stockData, isLoading: isLoadingStock } = useStockQuery();

    // Polling automático para atualizar dashboard
    useEffect(() => {
        const interval = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-evolution'] });
        }, 30000); // 30 segundos

        return () => clearInterval(interval);
    }, [queryClient]);

    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    // Calcular top products a partir do stockData
    const topProducts = (stockData || [])
        .sort((a: StockItem, b: StockItem) => b.quantity - a.quantity)
        .slice(0, 5);

    const isLoading = isLoadingStats || isLoadingEvolution || isLoadingStock;

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiFetch('/api/nfe/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.status === 409) throw new Error('NF-e já processada');
            if (!response.ok) throw new Error('Erro ao processar XML');

            setSuccess('NF-e processada com sucesso');
            setFile(null);
            
            // Invalidar queries para atualizar dados
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-evolution'] });
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

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
                    value={isLoading ? "..." : stats?.total_items.toFixed(0) || "0"}
                    subtitle="Volume total estocado"
                    icon={<Package className="w-5 h-5" />}
                />
                <KPICard
                    title="SKUs Ativos"
                    value={isLoading ? "..." : stats?.total_skus || 0}
                    subtitle="Produtos cadastrados"
                    icon={<FileText className="w-5 h-5" />}
                />
                <KPICard
                    title="Entradas no Mês"
                    value={isLoading ? "..." : stats?.entries_this_month || 0}
                    subtitle="Documentos fiscais"
                    icon={<TrendingUp className="w-5 h-5" />}
                />
                <KPICard
                    title="Alertas de Estoque"
                    value={isLoading ? "..." : stats?.low_stock_count || 0}
                    subtitle="Reposição necessária"
                    icon={<AlertTriangle className={`w-5 h-5 ${stats && stats.low_stock_count > 0 ? 'text-ruby-500' : 'text-charcoal-300'}`} />}
                />
            </div>

            {/* Gráficos e Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-ruby-500/5 blur-[100px] -mr-32 -mt-32" />
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-ruby-600 rounded-xl flex items-center justify-center shadow-ruby border border-ruby-500/20">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-navy-900 tracking-tighter leading-none uppercase">Fluxo de Estoque</h3>
                                <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em] mt-2 opacity-60">Evolução mensal • Insights</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-charcoal-50 px-4 py-2 rounded-full border border-charcoal-200">
                            <div className="w-2.5 h-2.5 bg-ruby-600 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.4)]" />
                            <span className="text-[10px] font-black text-charcoal-600 uppercase tracking-widest leading-none">Total Itens</span>
                        </div>
                    </div>

                    <div className="h-[320px] w-full relative z-10 min-h-[320px]">
                        {evolution && evolution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={evolution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                                        dy={10}
                                    />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                            padding: '12px'
                                        }}
                                        itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}
                                        labelStyle={{ color: '#64748b', fontSize: '9px', marginBottom: '4px', fontWeight: '800' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="quantity"
                                        stroke="#e11d48"
                                        strokeWidth={4}
                                        dot={{ fill: '#e11d48', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#e11d48' }}
                                        animationDuration={1500}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-charcoal-50/50 rounded-2xl border border-dashed border-charcoal-100">
                                <span className="text-[10px] font-black text-charcoal-300 uppercase tracking-widest">Aguardando dados de movimentação...</span>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-ruby-50 rounded-xl flex items-center justify-center border border-ruby-100 shadow-ruby-sm">
                            <Package className="w-6 h-6 text-ruby-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-navy-900 tracking-tighter leading-none uppercase">Principais SKUs</h3>
                            <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em] mt-2 opacity-60">Maiores volumes</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {topProducts.map((item, index) => (
                            <div key={item.code} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-charcoal-50 flex items-center justify-center text-[11px] font-black text-charcoal-400 border border-charcoal-200 uppercase transition-all group-hover:bg-ruby-600 group-hover:text-white group-hover:border-ruby-700">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-navy-900 leading-none group-hover:text-ruby-600 transition-colors uppercase tracking-tight">{item.name}</p>
                                        <p className="text-[10px] font-mono font-bold text-charcoal-400 mt-2 uppercase tracking-widest opacity-60">SKU: {item.code}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black text-navy-900 leading-none group-hover:text-ruby-600 transition-colors">{item.quantity.toFixed(0)}</p>
                                    <p className="text-[9px] font-black text-charcoal-400 uppercase tracking-widest mt-1.5 opacity-60">UNID</p>
                                </div>
                            </div>
                        ))}
                        {topProducts.length === 0 && (
                            <div className="h-40 flex items-center justify-center text-[10px] font-black text-charcoal-400 uppercase tracking-[0.3em] opacity-30">
                                Nenhum registro
                            </div>
                        )}
                    </div>

                    <Button variant="outline" className="w-full mt-10 border-dashed border-charcoal-300">
                        Painel de Estoque Completo
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </Card>
            </div>

            {/* Importação NF-e */}
            <Card className="p-10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-navy-950 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-700" />
                <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="w-16 h-16 bg-navy-950 rounded-2xl flex items-center justify-center shadow-premium mb-6 mx-auto md:mx-0 relative overflow-hidden group/icon">
                            <div className="absolute inset-0 bg-ruby-600 translate-y-full group-hover/icon:translate-y-0 transition-transform duration-500" />
                            <Upload className="w-6 h-6 text-white relative z-10" />
                        </div>
                        <h3 className="text-2xl font-black text-navy-900 tracking-tighter uppercase">Digitalização de NF-e</h3>
                        <p className="text-charcoal-500 text-sm font-medium max-w-md leading-relaxed">Importe seus documentos fiscais XML para processamento inteligente e atualização automatizada do inventário.</p>
                    </div>

                    <div className="w-full md:w-[400px] space-y-5">
                        <div
                            className={`
                                relative h-40 border-2 border-dashed rounded-3xl transition-all duration-500 flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden
                                ${file ? 'border-ruby-500 bg-ruby-50/20' : 'border-charcoal-300 bg-charcoal-50/50 hover:border-ruby-500/30 hover:bg-ruby-50/5'}
                            `}
                        >
                            <input
                                type="file"
                                accept=".xml"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${file ? 'bg-ruby-600 text-white shadow-ruby' : 'bg-white text-charcoal-400 border border-charcoal-100'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="text-center px-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-navy-900">
                                    {file ? file.name : "Arraste ou selecione o XML"}
                                </p>
                                {!file && <p className="text-[9px] font-bold text-charcoal-400 uppercase tracking-widest mt-1.5 opacity-60">Suporta apenas arquivos .xml</p>}
                            </div>
                        </div>

                        <Button onClick={handleUpload} loading={uploading} disabled={!file} className="w-full h-14 bg-ruby-600 hover:bg-ruby-700 text-white border-none shadow-ruby text-sm font-black uppercase tracking-[0.15em]">
                            Processar Documento
                            <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}