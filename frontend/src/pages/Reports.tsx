import { useState } from 'react';
import { Card, Button, Input, Label, TableContainer, THead, TBody, Tr, Th, Td, Badge } from '../components/UI';
import { Download, Calendar, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useReportsQuery } from '../hooks/useQueries';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
    // Default dates: current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);

    const { data: report, isLoading } = useReportsQuery(startDate, endDate);

    const handleExportCSV = () => {
        if (!report?.detailed_movements) return;

        const headers = ['ID', 'Data', 'Tipo', 'SKU', 'Produto', 'Qtd', 'Origem', 'Notas'];
        const rows = report.detailed_movements.map(m => [
            m.id,
            new Date(m.created_at).toLocaleString('pt-BR'),
            m.type,
            m.product_code,
            m.product?.name || 'N/A',
            m.quantity,
            m.origin || '-',
            m.notes || '-'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_movimentacoes_${startDate}_${endDate}.csv`;
        link.click();
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4 border-b border-charcoal-100 pb-6">
                <div className="w-12 h-12 bg-charcoal-900 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-5 h-5 text-ruby-500" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-ruby-600 tracking-widest leading-none">Business Intelligence</p>
                    <h2 className="text-2xl font-bold text-charcoal-950 tracking-tight uppercase">Relatórios de Movimentação</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Painel de Controle */}
                <Card className="lg:col-span-4 p-8 space-y-8 bg-white h-fit sticky top-24">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-charcoal-950 uppercase tracking-widest">Parâmetros de Análise</h3>
                        <p className="text-charcoal-500 text-xs font-medium">Selecione o período para gerar os indicadores.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-1.5">
                            <Label>Início do Período</Label>
                            <Input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Fim do Período</Label>
                            <Input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-charcoal-100">
                        <Button 
                            onClick={handleExportCSV} 
                            disabled={isLoading || !report?.detailed_movements?.length}
                            className="w-full h-12 rounded-lg bg-charcoal-900 hover:bg-black text-sm font-bold uppercase tracking-widest active:scale-95 transition-all"
                        >
                            <Download className="w-4 h-4 mr-2 text-ruby-500" />
                            <span>Exportar CSV</span>
                        </Button>
                    </div>
                </Card>

                {/* Visualização de Dados */}
                <div className="lg:col-span-8 space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-6 bg-emerald-50 border-emerald-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Entradas</span>
                            </div>
                            <p className="text-2xl font-black text-emerald-900">
                                {isLoading ? '...' : report?.summary.total_entries_quantity.toFixed(0) || 0}
                            </p>
                            <p className="text-xs font-medium text-emerald-600/80 mt-1">
                                {isLoading ? '...' : formatCurrency(report?.summary.total_entries_value || 0)}
                            </p>
                        </Card>

                        <Card className="p-6 bg-ruby-50 border-ruby-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-ruby-100 rounded-lg">
                                    <TrendingDown className="w-4 h-4 text-ruby-600" />
                                </div>
                                <span className="text-[10px] font-bold text-ruby-800 uppercase tracking-widest">Saídas</span>
                            </div>
                            <p className="text-2xl font-black text-ruby-900">
                                {isLoading ? '...' : report?.summary.total_exits_quantity.toFixed(0) || 0}
                            </p>
                            <p className="text-xs font-medium text-ruby-600/80 mt-1">
                                {isLoading ? '...' : formatCurrency(report?.summary.total_exits_value || 0)}
                            </p>
                        </Card>

                        <Card className="p-6 bg-charcoal-50 border-charcoal-200">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-charcoal-200 rounded-lg">
                                    <Activity className="w-4 h-4 text-charcoal-600" />
                                </div>
                                <span className="text-[10px] font-bold text-charcoal-600 uppercase tracking-widest">Saldo Líquido</span>
                            </div>
                            <p className="text-2xl font-black text-charcoal-900">
                                {isLoading ? '...' : report?.summary.net_quantity.toFixed(0) || 0}
                            </p>
                            <p className="text-xs font-medium text-charcoal-500 mt-1">
                                {isLoading ? '...' : formatCurrency(report?.summary.net_value || 0)}
                            </p>
                        </Card>
                    </div>

                    {/* Gráfico de Evolução */}
                    <Card className="p-6 h-[350px]">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-widest">Evolução Diária</h4>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Entradas
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-ruby-500" /> Saídas
                                </div>
                            </div>
                        </div>
                        {report?.timeline && report.timeline.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={report.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="date" 
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis 
                                        hide 
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString('pt-BR')}
                                    />
                                    <Area type="monotone" dataKey="entries_quantity" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntries)" name="Entradas" />
                                    <Area type="monotone" dataKey="exits_quantity" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExits)" name="Saídas" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-charcoal-300 text-xs uppercase tracking-widest font-bold">
                                Sem dados para o período
                            </div>
                        )}
                    </Card>

                    {/* Tabela de Movimentações */}
                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-charcoal-100">
                            <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-widest">Detalhamento das Operações</h4>
                        </div>
                        <TableContainer className="border-none max-h-[400px] overflow-y-auto">
                            <THead>
                                <Tr>
                                    <Th>Data</Th>
                                    <Th>SKU</Th>
                                    <Th>Produto</Th>
                                    <Th>Tipo</Th>
                                    <Th className="text-right">Qtd</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {report?.detailed_movements?.map((m) => (
                                    <Tr key={m.id}>
                                        <Td className="text-xs text-charcoal-500 font-bold">
                                            {new Date(m.created_at).toLocaleString('pt-BR')}
                                        </Td>
                                        <Td className="text-xs font-mono font-bold text-charcoal-400">{m.product_code}</Td>
                                        <Td className="font-bold text-charcoal-900 uppercase text-xs">{m.product?.name || 'Produto Removido'}</Td>
                                        <Td>
                                            <Badge variant={m.type === 'ENTRADA' ? 'success' : 'error'}>
                                                {m.type}
                                            </Badge>
                                        </Td>
                                        <Td className="text-right font-bold text-charcoal-900">{m.quantity}</Td>
                                    </Tr>
                                ))}
                                {(!report?.detailed_movements || report.detailed_movements.length === 0) && (
                                    <Tr>
                                        <Td colSpan={5} className="text-center py-8 text-charcoal-400 text-xs uppercase tracking-widest font-bold">
                                            Nenhuma movimentação encontrada
                                        </Td>
                                    </Tr>
                                )}
                            </TBody>
                        </TableContainer>
                    </Card>
                </div>
            </div>
        </div>
    );
}