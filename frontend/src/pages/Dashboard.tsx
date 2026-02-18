import { useState, useEffect, useRef } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Bell, Clock, DollarSign, Package, TrendingUp, Upload } from 'lucide-react';
import { Card, KPICard, Button } from '../components/UI';
import { useDashboardStatsQuery, useDashboardEvolutionQuery, useStockQuery } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { type StockItem } from '../contexts/DataContext';
import { notificationService } from '../services/NotificationService';
import PullToRefresh from '../components/PullToRefresh';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
    const queryClient = useQueryClient();
    const { apiFetch } = useAuth();
    const [showNotificationBanner, setShowNotificationBanner] = useState(notificationService.getPermissionStatus() === 'default');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiFetch('/api/nfe/upload', {
                method: 'POST',
                body: formData,
                // Não setamos Content-Type para o browser gerar o boundary correto
            });

            if (response.ok) {
                alert('NF-e processada com sucesso!');
                handleRefresh();
            } else {
                const err = await response.json();
                alert(`Erro: ${err.error || 'Falha ao processar arquivo'}`);
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Erro na conexão com o servidor');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "---";
        return new Date(dateString).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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
            <div className="space-y-6">
                {/* CTA Principal - Importação NF-e */}
                <Card className="bg-navy-950 border-none p-6 relative overflow-hidden group shadow-premium ring-1 ring-white/10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-ruby-600/10 blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-ruby-600/20" />
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-ruby-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.4)] border border-ruby-400/20">
                                <Upload className="w-8 h-8 text-white animate-bounce" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Digitalização NF-e</h2>
                                <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mt-3">Importe arquivos XML para atualizar seu estoque automaticamente</p>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xml"
                            className="hidden"
                        />
                        <Button
                            onClick={handleUploadClick}
                            loading={uploading}
                            className="bg-white hover:bg-ruby-50 text-ruby-600 border-none px-12 h-14 rounded-2xl shadow-ruby group-hover:scale-105 transition-transform"
                        >
                            <span className="text-xs font-black uppercase tracking-widest">Selecionar XML</span>
                        </Button>
                    </div>
                </Card>

                {/* Banner de Notificações PWA (Compacto) */}
                {showNotificationBanner && (
                    <div className="bg-charcoal-50 rounded-2xl p-4 flex items-center justify-between border border-charcoal-200 animate-in slide-in-from-top duration-700">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-ruby-100 rounded-lg flex items-center justify-center">
                                <Bell className="w-4 h-4 text-ruby-600" />
                            </div>
                            <p className="text-[10px] font-bold text-charcoal-600 uppercase tracking-widest">Ativar avisos de novas notas?</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowNotificationBanner(false)} className="text-[10px] font-bold text-charcoal-400 uppercase">Agora não</button>
                            <button onClick={handleEnableNotifications} className="text-[10px] font-black text-ruby-600 uppercase border-b-2 border-ruby-600">Ativar</button>
                        </div>
                    </div>
                )}

                {/* Cards de Métricas de Decisão */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <KPICard
                        title="Risco de Ruptura"
                        value={isLoading ? "..." : stats?.low_stock_count || 0}
                        subtitle="Abaixo do mín."
                        icon={<AlertTriangle className={`w-5 h-5 ${stats && stats.low_stock_count > 0 ? 'text-white' : 'text-charcoal-300'}`} />}
                    />
                    <KPICard
                        title="Produtos Parados"
                        value={isLoading ? "..." : stats?.idle_stock_count || 0}
                        subtitle="Sem mov. > 30d"
                        icon={<Clock className="w-5 h-5" />}
                    />
                    <KPICard
                        title="Patrimônio Total"
                        value={isLoading ? "..." : formatCurrency(stats?.stock_wealth || 0)}
                        subtitle="Valor de custo"
                        icon={<DollarSign className="w-5 h-5" />}
                    />
                    <KPICard
                        title="Custo Médio"
                        value={isLoading ? "..." : formatCurrency(stats?.average_cost || 0)}
                        subtitle="Por SKU ativo"
                        icon={<TrendingUp className="w-5 h-5" />}
                    />
                    <Card className="p-4 relative group hover:bg-navy-950 transition-colors">
                        <div className="flex items-center justify-between mb-3 text-purple-600 group-hover:text-white transition-colors">
                            <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">Última Movimentação</p>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black text-navy-900 group-hover:text-white transition-colors uppercase tracking-tighter">
                                {isLoading ? "..." : formatDate(stats?.last_movement_at)}
                            </p>
                            <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">Sincronizado</p>
                        </div>
                    </Card>
                </div>

                {/* Gráficos e Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-navy-900 tracking-tighter leading-none uppercase">Fluxo de Operação</h3>
                                <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em] mt-2 opacity-60">Entradas vs Saídas • 30 dias</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-ruby-600 rounded-sm" />
                                    <span className="text-[10px] font-black text-charcoal-600 uppercase">Entradas</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                                    <span className="text-[10px] font-black text-charcoal-600 uppercase">Saídas</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[300px] w-full relative z-10">
                            {evolution && evolution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }}
                                            tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                                            dy={10}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', padding: '12px' }}
                                            itemStyle={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}
                                            labelStyle={{ color: '#64748b', fontSize: '9px', marginBottom: '4px' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="entries"
                                            stroke="#e11d48"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorEntries)"
                                            animationDuration={1500}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="exits"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorExits)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-charcoal-50/50 rounded-xl border border-dashed border-charcoal-200">
                                    <span className="text-[10px] font-black text-charcoal-300 uppercase tracking-widest">Sem movimentações recentes</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-navy-900 tracking-tighter leading-none uppercase">Ranking SKUs</h3>
                            <Package className="w-5 h-5 text-charcoal-300" />
                        </div>

                        <div className="space-y-4">
                            {topProducts.map((item, index) => (
                                <div key={item.code} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded bg-charcoal-50 flex items-center justify-center text-[10px] font-black text-charcoal-400 border border-charcoal-200 uppercase group-hover:bg-navy-950 group-hover:text-white transition-all">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-navy-900 truncate max-w-[120px] uppercase tracking-tight">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-mono text-charcoal-400">#{item.code}</span>
                                                {item.quantity < item.min_stock && (
                                                    <span className="text-[8px] font-black text-ruby-600 uppercase px-1.5 py-0.5 bg-ruby-50 rounded">Critico</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-navy-900">{item.quantity.toFixed(0)}</p>
                                        <p className="text-[9px] font-black text-charcoal-400 uppercase opacity-60">{item.unit}</p>
                                    </div>
                                </div>
                            ))}
                            {topProducts.length === 0 && (
                                <div className="h-40 flex items-center justify-center text-[10px] text-charcoal-300 uppercase font-black">Vazio</div>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            className="w-full mt-8 border-dashed border-charcoal-300 min-h-[44px] h-auto text-[10px] font-black uppercase tracking-widest"
                            onClick={() => window.location.hash = '#stock'}
                        >
                            Explorar Estoque
                        </Button>
                    </Card>
                </div>
            </div>
        </PullToRefresh>
    );
}