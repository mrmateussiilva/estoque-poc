import { useMemo, useState } from 'react';
import { Card, Button, Input, Label, Select, TableContainer, THead, TBody, Tr, Th, Td, Badge } from '../components/UI';
import { Download, Calendar, TrendingUp, TrendingDown, Activity, FileText, X } from 'lucide-react';
import { useReportsQuery } from '../hooks/useQueries';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
    // Default dates: current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'ENTRADA' | 'SAIDA'>('ALL');
    const [originFilter, setOriginFilter] = useState('ALL');

    const { data: report, isLoading } = useReportsQuery(startDate, endDate);

    const movements = report?.detailed_movements ?? [];
    const sortedMovements = useMemo(() => {
        return [...movements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [movements]);

    const entriesCount = useMemo(() => movements.filter((m) => m.type === 'ENTRADA').length, [movements]);
    const exitsCount = useMemo(() => movements.filter((m) => m.type === 'SAIDA').length, [movements]);
    const totalMovements = movements.length;
    const uniqueProducts = report?.summary?.unique_products ?? 0;

    const topProducts = useMemo(() => {
        const map = new Map<string, { code: string; name: string; total: number }>();
        for (const m of movements) {
            const key = m.product_code;
            const current = map.get(key) || { code: key, name: m.product?.name || 'Produto Removido', total: 0 };
            current.total += Math.abs(m.quantity);
            map.set(key, current);
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [movements]);

    const originSummary = useMemo(() => {
        const map = new Map<string, number>();
        for (const m of movements) {
            const key = m.origin || 'N/A';
            map.set(key, (map.get(key) || 0) + 1);
        }
        const items = Array.from(map.entries()).map(([origin, count]) => ({ origin, count }));
        return items.sort((a, b) => b.count - a.count).slice(0, 5);
    }, [movements]);

    const originOptions = useMemo(() => {
        const set = new Set<string>();
        movements.forEach((m) => {
            if (m.origin) set.add(m.origin);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [movements]);

    const filteredMovements = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sortedMovements.filter((m) => {
            if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
            if (originFilter !== 'ALL' && (m.origin || 'N/A') !== originFilter) return false;
            if (!q) return true;
            const name = m.product?.name || '';
            return (
                m.product_code.toLowerCase().includes(q) ||
                name.toLowerCase().includes(q) ||
                (m.origin || '').toLowerCase().includes(q) ||
                (m.notes || '').toLowerCase().includes(q)
            );
        });
    }, [sortedMovements, search, typeFilter, originFilter]);

    const handleExportCSV = () => {
        if (!report?.detailed_movements) return;

        const headers = ['ID', 'Data', 'Tipo', 'SKU', 'Produto', 'Qtd', 'Origem', 'Notas'];
        const rows = filteredMovements.map(m => [
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
    const formatDateTime = (val: string) => new Date(val).toLocaleString('pt-BR');
    const formatDate = (val: string) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
    const presetStarts = useMemo(() => {
        const toISO = (days: number) => {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - days + 1);
            return start.toISOString().split('T')[0];
        };
        return {
            d7: toISO(7),
            d30: toISO(30),
            d90: toISO(90)
        };
    }, []);

    const setPresetRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days + 1);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('ALL');
        setOriginFilter('ALL');
    };

    const handleExportPDF = () => {
        if (!report?.detailed_movements) return;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const title = 'Relatório de Movimentações';
        const period = `${formatDate(startDate)} — ${formatDate(endDate)}`;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, 40, 40);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Período: ${period}`, 40, 58);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Entradas: ${report.summary.total_entries_quantity.toFixed(0)} (${formatCurrency(report.summary.total_entries_value)})`, 40, 85);
        doc.text(`Saídas: ${report.summary.total_exits_quantity.toFixed(0)} (${formatCurrency(report.summary.total_exits_value)})`, 260, 85);
        doc.text(`Saldo: ${report.summary.net_quantity.toFixed(0)} (${formatCurrency(report.summary.net_value)})`, 470, 85);

        const rows = filteredMovements.map((m) => [
            formatDateTime(m.created_at),
            m.product_code,
            m.product?.name || 'Produto Removido',
            m.origin || '-',
            m.type,
            m.quantity.toString()
        ]);

        autoTable(doc, {
            startY: 110,
            head: [['Data', 'SKU', 'Produto', 'Origem', 'Tipo', 'Qtd']],
            body: rows,
            styles: { fontSize: 9, cellPadding: 5 },
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 40, right: 40 }
        });

        doc.save(`relatorio_movimentacoes_${startDate}_${endDate}.pdf`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6 border-b border-charcoal-100 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-charcoal-900 rounded-xl flex items-center justify-center shadow-lg">
                        <Calendar className="w-5 h-5 text-ruby-500" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-ruby-600 tracking-widest leading-none">Business Intelligence</p>
                        <h2 className="text-2xl font-bold text-charcoal-950 tracking-tight uppercase">Relatórios de Movimentação</h2>
                        <p className="text-xs text-charcoal-500 font-medium">
                            Análise do período {formatDate(startDate)} a {formatDate(endDate)}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                        onClick={handleExportPDF}
                        disabled={isLoading || !movements.length}
                        variant="outline"
                        className="h-11 rounded-lg text-xs font-bold uppercase tracking-widest w-full sm:w-auto"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        <span>Exportar PDF</span>
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        disabled={isLoading || !movements.length}
                        className="h-11 rounded-lg bg-charcoal-900 hover:bg-black text-xs font-bold uppercase tracking-widest w-full sm:w-auto"
                    >
                        <Download className="w-4 h-4 mr-2 text-ruby-500" />
                        <span>Exportar CSV</span>
                    </Button>
                </div>
            </div>

            <Card className="p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <Button
                        variant={endDate === todayISO && startDate === presetStarts.d7 ? 'secondary' : 'outline'}
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => setPresetRange(7)}
                    >
                        Últimos 7 dias
                    </Button>
                    <Button
                        variant={endDate === todayISO && startDate === presetStarts.d30 ? 'secondary' : 'outline'}
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => setPresetRange(30)}
                    >
                        Últimos 30 dias
                    </Button>
                    <Button
                        variant={endDate === todayISO && startDate === presetStarts.d90 ? 'secondary' : 'outline'}
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => setPresetRange(90)}
                    >
                        Últimos 90 dias
                    </Button>
                    {(search || typeFilter !== 'ALL' || originFilter !== 'ALL') && (
                        <Button
                            variant="outline"
                            className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-ruby-600 border-ruby-200 hover:border-ruby-300"
                            onClick={clearFilters}
                        >
                            Limpar filtros
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                    <div className="lg:col-span-4 space-y-1">
                        <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-widest">Parâmetros do Período</h3>
                        <p className="text-charcoal-500 text-xs font-medium">Ajuste o intervalo para recalcular os indicadores.</p>
                    </div>
                    <div className="lg:col-span-3 space-y-1.5">
                        <Label>Início</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="lg:col-span-3 space-y-1.5">
                        <Label>Fim</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="lg:col-span-2 space-y-1.5">
                        <Label>Buscar</Label>
                        <Input
                            type="text"
                            placeholder="SKU, produto, origem"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="lg:col-span-2 space-y-1.5">
                        <Label>Tipo</Label>
                        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'ENTRADA' | 'SAIDA')}>
                            <option value="ALL">Todos</option>
                            <option value="ENTRADA">Entradas</option>
                            <option value="SAIDA">Saídas</option>
                        </Select>
                    </div>
                    <div className="lg:col-span-2 space-y-1.5">
                        <Label>Origem</Label>
                        <Select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)}>
                            <option value="ALL">Todas</option>
                            <option value="N/A">Sem origem</option>
                            {originOptions.map((origin) => (
                                <option key={origin} value={origin}>{origin}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="lg:col-span-2 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-charcoal-400">Movimentações</div>
                        <div className="text-2xl font-black text-charcoal-900">{isLoading ? '...' : totalMovements}</div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-charcoal-500">
                            <span className="text-emerald-600">{entriesCount} entradas</span>
                            <span className="text-ruby-600">{exitsCount} saídas</span>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">
                            {uniqueProducts} produtos únicos
                        </div>
                    </div>
                </div>
                {(search || typeFilter !== 'ALL' || originFilter !== 'ALL') && (
                    <div className="pt-4 mt-6 border-t border-charcoal-100 flex flex-wrap gap-2">
                        {search && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ruby-50 text-ruby-700 border border-ruby-200 text-[10px] font-black uppercase tracking-widest">
                                Busca: {search}
                                <button
                                    type="button"
                                    className="w-5 h-5 rounded-full bg-white text-ruby-700 flex items-center justify-center border border-ruby-200 hover:bg-ruby-100"
                                    onClick={() => setSearch('')}
                                    aria-label="Limpar busca"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                        {typeFilter !== 'ALL' && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-charcoal-50 text-charcoal-700 border border-charcoal-200 text-[10px] font-black uppercase tracking-widest">
                                Tipo: {typeFilter}
                                <button
                                    type="button"
                                    className="w-5 h-5 rounded-full bg-white text-charcoal-700 flex items-center justify-center border border-charcoal-200 hover:bg-charcoal-100"
                                    onClick={() => setTypeFilter('ALL')}
                                    aria-label="Limpar tipo"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                        {originFilter !== 'ALL' && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-charcoal-50 text-charcoal-700 border border-charcoal-200 text-[10px] font-black uppercase tracking-widest">
                                Origem: {originFilter}
                                <button
                                    type="button"
                                    className="w-5 h-5 rounded-full bg-white text-charcoal-700 flex items-center justify-center border border-charcoal-200 hover:bg-charcoal-100"
                                    onClick={() => setOriginFilter('ALL')}
                                    aria-label="Limpar origem"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                        {(search || typeFilter !== 'ALL' || originFilter !== 'ALL') && (
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-charcoal-500 border border-charcoal-200 text-[10px] font-black uppercase tracking-widest hover:border-ruby-300 hover:text-ruby-600"
                                onClick={clearFilters}
                            >
                                Limpar todos
                            </button>
                        )}
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 sm:p-6 bg-emerald-50 border-emerald-100">
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

                <Card className="p-4 sm:p-6 bg-ruby-50 border-ruby-100">
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

                <Card className="p-4 sm:p-6 bg-charcoal-50 border-charcoal-200">
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

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-8 p-4 sm:p-6 h-[260px] sm:h-[320px] xl:h-[350px]">
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
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => formatDate(val)}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis hide domain={['auto', 'auto']} />
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

                <Card className="xl:col-span-4 p-4 sm:p-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-widest">Resumo do Período</h4>
                            <p className="text-xs text-charcoal-500 font-medium">Indicadores consolidados.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-charcoal-100 bg-charcoal-50">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Entradas</p>
                                <p className="text-lg font-black text-emerald-700">{entriesCount}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-charcoal-100 bg-charcoal-50">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Saídas</p>
                                <p className="text-lg font-black text-ruby-700">{exitsCount}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-charcoal-100 bg-charcoal-50">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Movimentações</p>
                                <p className="text-lg font-black text-charcoal-900">{isLoading ? '...' : totalMovements}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-charcoal-100 bg-charcoal-50">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Saldo</p>
                                <p className="text-lg font-black text-charcoal-900">
                                    {isLoading ? '...' : report?.summary.net_quantity.toFixed(0) || 0}
                                </p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-charcoal-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Período selecionado</p>
                            <p className="text-sm font-bold text-charcoal-900">{formatDate(startDate)} — {formatDate(endDate)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-6 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-widest">Produtos Mais Movimentados</h4>
                            <p className="text-xs text-charcoal-500 font-medium">Top 5 por volume.</p>
                        </div>
                        <Badge variant="default">Top 5</Badge>
                    </div>
                    <div className="space-y-3">
                        {topProducts.map((item, index) => (
                            <div key={item.code} className="flex items-center gap-4">
                                <div className="w-7 h-7 rounded-full bg-charcoal-900 text-white text-[10px] font-black flex items-center justify-center">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-charcoal-900 uppercase">{item.name}</p>
                                    <p className="text-[10px] text-charcoal-500 font-mono">{item.code}</p>
                                </div>
                                <div className="text-sm font-black text-charcoal-900">{item.total.toFixed(0)}</div>
                            </div>
                        ))}
                        {topProducts.length === 0 && (
                            <div className="text-center text-xs uppercase tracking-widest font-bold text-charcoal-400 py-8">
                                Sem dados para o período
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="xl:col-span-6 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-widest">Origens Mais Frequentes</h4>
                            <p className="text-xs text-charcoal-500 font-medium">Distribuição por origem.</p>
                        </div>
                        <Badge variant="default">Top 5</Badge>
                    </div>
                    <div className="space-y-3">
                        {originSummary.map((item) => {
                            const max = originSummary[0]?.count || 1;
                            const width = Math.max(8, Math.round((item.count / max) * 100));
                            return (
                                <div key={item.origin} className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-charcoal-700">
                                        <span className="uppercase">{item.origin}</span>
                                        <span>{item.count}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-charcoal-100 overflow-hidden">
                                        <div className="h-full bg-ruby-500 rounded-full" style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {originSummary.length === 0 && (
                            <div className="text-center text-xs uppercase tracking-widest font-bold text-charcoal-400 py-8">
                                Sem dados para o período
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-charcoal-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-widest">Detalhamento das Operações</h4>
                        <p className="text-xs text-charcoal-500 font-medium mt-1">Ordenado da mais recente para a mais antiga.</p>
                    </div>
                    <Badge variant="default">{filteredMovements.length} itens</Badge>
                </div>
                <TableContainer className="border-none max-h-[420px] overflow-y-auto">
                    <THead>
                        <Tr>
                            <Th>Data</Th>
                            <Th className="hidden md:table-cell">SKU</Th>
                            <Th>Produto</Th>
                            <Th className="hidden lg:table-cell">Origem</Th>
                            <Th>Tipo</Th>
                            <Th className="text-right">Qtd</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {isLoading && (
                            <Tr>
                                <Td colSpan={6} className="text-center py-10 text-charcoal-400 text-xs uppercase tracking-widest font-bold">
                                    Carregando relatório
                                </Td>
                            </Tr>
                        )}
                        {!isLoading && filteredMovements.map((m) => (
                            <Tr key={m.id}>
                                <Td className="text-xs text-charcoal-500 font-bold">{formatDateTime(m.created_at)}</Td>
                                <Td className="text-xs font-mono font-bold text-charcoal-400 hidden md:table-cell">{m.product_code}</Td>
                                <Td className="font-bold text-charcoal-900 uppercase text-xs">{m.product?.name || 'Produto Removido'}</Td>
                                <Td className="text-xs text-charcoal-500 font-bold hidden lg:table-cell">{m.origin || '-'}</Td>
                                <Td>
                                    <Badge variant={m.type === 'ENTRADA' ? 'success' : 'error'}>
                                        {m.type}
                                    </Badge>
                                </Td>
                                <Td className="text-right font-bold text-charcoal-900">{m.quantity}</Td>
                            </Tr>
                        ))}
                        {!isLoading && filteredMovements.length === 0 && (
                            <Tr>
                                <Td colSpan={6} className="text-center py-8 text-charcoal-400 text-xs uppercase tracking-widest font-bold">
                                    {search
                                        ? 'Produto não encontrado no período'
                                        : 'Nenhuma movimentação encontrada'}
                                </Td>
                            </Tr>
                        )}
                    </TBody>
                </TableContainer>
            </Card>
        </div>
    );
}
