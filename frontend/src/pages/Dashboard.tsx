import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bell, ChevronRight, TrendingUp, Package, FileText, AlertTriangle } from 'lucide-react';
import { Card, KPICard, Button } from '../components/UI';
import { useDashboardStatsQuery, useDashboardEvolutionQuery, useStockQuery } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { type StockItem } from '../contexts/DataContext';
import { notificationService } from '../services/NotificationService';
import PullToRefresh from '../components/PullToRefresh';

export default function Dashboard() {
    const queryClient = useQueryClient();
    const [showNotificationBanner, setShowNotificationBanner] = useState(notificationService.getPermissionStatus() === 'default');

    // Queries com polling automático (atualiza a cada 30 segundos)
    const { data: stats, isLoading: isLoadingStats } = useDashboardStatsQuery();
    const { data: evolution, isLoading: isLoadingEvolution } = useDashboardEvolutionQuery();
    const { data: stockData, isLoading: isLoadingStock } = useStockQuery();

    // Calcular top products a partir do stockData
    const topProducts = Array.isArray(stockData)
        ? [...stockData].sort((a: StockItem, b: StockItem) => b.quantity - a.quantity).slice(0, 5)
        : [];

    const isLoading = isLoadingStats || isLoadingEvolution || isLoadingStock;

    const handleRefresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard-evolution'] }),
            queryClient.invalidateQueries({ queryKey: ['stock'] })
        ]);
    };

    const handleEnableNotifications = async () => {
        const granted = await notificationService.requestPermission();
        if (granted) {
            notificationService.connect();
        }
        setShowNotificationBanner(false);
    };

    // Polling automático para atualizar dashboard
    useEffect(() => {
        const interval = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-evolution'] });
        }, 30000); // 30 segundos

        return () => clearInterval(interval);
    }, [queryClient]);

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-8 p-4 md:p-0">
                {/* Banner de Notificações PWA */}
                {showNotificationBanner && (
                    <div className="bg-navy-950 rounded-3xl p-6 relative overflow-hidden group border border-white/5 shadow-premium animate-in slide-in-from-top duration-700">
                        <div className="absolute inset-0 bg-ruby-600/10 translate-x-full group-hover:translate-x-0 transition-transform duration-1000" />
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-ruby-600 rounded-xl flex items-center justify-center shadow-ruby">
                                    <Bell className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-black uppercase tracking-tighter text-lg leading-none">Alertas em Tempo Real</h4>
                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-2">Deseja ser notificado quando uma nova NF-e chegar?</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowNotificationBanner(false)}
                                    className="text-white/40 hover:text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                    Agora não
                                </button>
                                <Button
                                    onClick={handleEnableNotifications}
                                    className="bg-white hover:bg-ruby-50 text-ruby-600 border-none shadow-premium text-[10px] font-black uppercase tracking-widest py-3 px-8 h-auto"
                                >
                                    Ativar Notificações
                                </Button>
                            </div>
                        </div>
                    </div>
                )}


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
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <LineChart data={evolution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="month"
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
                                            dataKey="items"
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

            </div>
        </PullToRefresh>
    );
}