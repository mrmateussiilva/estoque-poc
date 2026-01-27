import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Upload, ChevronRight, TrendingUp, Package, FileText } from 'lucide-react';
import { Card, KPICard, Button } from '../components/UI';

const API_BASE_URL = '';

const stockEvolutionData = [
    { month: 'Jan', items: 120 },
    { month: 'Fev', items: 145 },
    { month: 'Mar', items: 132 },
    { month: 'Abr', items: 178 },
    { month: 'Mai', items: 195 },
    { month: 'Jun', items: 210 },
];

const topProductsData = [
    { name: 'Produto A', quantity: 45 },
    { name: 'Produto B', quantity: 38 },
    { name: 'Produto C', quantity: 32 },
    { name: 'Produto D', quantity: 28 },
    { name: 'Produto E', quantity: 22 },
];

export default function Dashboard() {
    const [stock, setStock] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const fetchStock = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/stock`);
            if (!response.ok) throw new Error('Falha na comunicação');
            const data = await response.json();
            setStock(data || []);
        } catch (err: any) {
            setError(err.message);
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
            const response = await fetch(`${API_BASE_URL}/nfe/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.status === 409) throw new Error('NF-e já processada');
            if (!response.ok) throw new Error('Erro ao processar XML');

            setSuccess('NF-e processada com sucesso');
            setFile(null);
            await fetchStock();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => { fetchStock(); }, []);

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

    const totalItems = stock.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalSKUs = stock.length;

    return (
        <div className="space-y-8">
            {/* Notifications */}
            <div className="fixed top-24 right-8 z-50 flex flex-col gap-3 max-w-md">
                {error && (
                    <div className="bg-white border-l-4 border-ruby-700 shadow-lg px-6 py-4 flex items-center gap-3 rounded-ruby">
                        <span className="text-sm font-medium text-charcoal-700">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="bg-white border-l-4 border-emerald-500 shadow-lg px-6 py-4 flex items-center gap-3 rounded-ruby">
                        <span className="text-sm font-medium text-charcoal-700">{success}</span>
                    </div>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Itens em Estoque" value={totalItems} subtitle="Total de unidades" />
                <KPICard title="SKUs Ativos" value={totalSKUs} subtitle="Produtos cadastrados" />
                <KPICard title="Entradas no Mês" value="12" subtitle="NF-es processadas" />
                <KPICard title="Última Sincronização" value="Agora" subtitle="Atualizado" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-ruby-700" />
                        <h3 className="text-lg font-bold text-charcoal-900">Evolução de Estoque</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={stockEvolutionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="items" stroke="#9b111e" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Package className="w-5 h-5 text-ruby-700" />
                        <h3 className="text-lg font-bold text-charcoal-900">Top 5 Produtos</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={topProductsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Bar dataKey="quantity" fill="#9b111e" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Upload Card */}
            <Card className="p-8">
                <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-ruby-700" />
                    <h3 className="text-xl font-bold text-charcoal-900">Importar NF-e</h3>
                </div>

                <div className="relative group overflow-hidden rounded-ruby bg-charcoal-50 border border-transparent transition-all border-dashed hover:border-ruby-700/30 p-10 text-center cursor-pointer mb-6">
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
