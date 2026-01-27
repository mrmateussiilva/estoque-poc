import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, Grape } from 'lucide-react';

const API_BASE_URL = '';

// Premium Components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-ruby border border-charcoal-50 shadow-ruby overflow-hidden ${className}`}>
        {children}
    </div>
);

const RubyButton = ({
    children,
    onClick,
    disabled,
    variant = 'primary',
    loading = false,
    className = ""
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'outline';
    loading?: boolean;
    className?: string;
}) => {
    const base = "px-6 py-2.5 rounded-ruby font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale text-sm tracking-tight active:scale-[0.98]";
    const variants = {
        primary: "bg-ruby-700 text-white hover:bg-ruby-900 shadow-sm",
        outline: "bg-transparent border border-charcoal-50 text-charcoal-700 hover:bg-charcoal-50"
    };

    return (
        <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
        </button>
    );
};

const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-8 py-6"><div className="h-3 bg-charcoal-50 rounded w-16" /></td>
        <td className="px-8 py-6"><div className="h-3 bg-charcoal-50 rounded w-48" /></td>
        <td className="px-8 py-6 text-right"><div className="h-3 bg-charcoal-50 rounded w-10 ml-auto" /></td>
    </tr>
);

export default function Dashboard() {
    const [stock, setStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/stock`);
            if (!response.ok) throw new Error('Falha na comunicação com servidor');
            const data = await response.json();
            setStock(data);
        } catch (err: any) {
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
            const response = await fetch(`${API_BASE_URL}/nfe/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.status === 409) throw new Error('Esta NF-e já foi processada.');
            if (!response.ok) throw new Error('Erro ao processar arquivo XML.');

            setSuccess('NF-e processada e estoque atualizado.');
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

    return (
        <div className="min-h-screen bg-background font-sans">
            <header className="h-20 border-b border-charcoal-50 bg-white/50 backdrop-blur-xl flex items-center sticky top-0 z-50">
                <div className="max-w-6xl mx-auto w-full px-8 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-ruby-700 flex items-center justify-center rounded-ruby shadow-ruby rotate-3">
                            <Grape className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-charcoal-900 font-bold text-xl tracking-tighter uppercase italic">Ruby<span className="text-ruby-700">Stock</span></h1>
                    </div>
                    <RubyButton variant="outline" onClick={fetchStock} loading={loading}>
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Sincronizar
                    </RubyButton>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-8 py-12 space-y-12">
                {/* Notifications */}
                <div className="fixed top-24 right-8 z-50 flex flex-col gap-3 max-w-md">
                    {error && (
                        <div className="bg-white border-l-4 border-ruby-700 shadow-lg px-6 py-4 flex items-center gap-3 rounded-ruby">
                            <AlertCircle className="w-5 h-5 text-ruby-700 flex-shrink-0" />
                            <span className="text-sm font-medium text-charcoal-700">{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="bg-white border-l-4 border-emerald-500 shadow-lg px-6 py-4 flex items-center gap-3 rounded-ruby">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-charcoal-700">{success}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Import Card */}
                    <section className="lg:col-span-5">
                        <h2 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest mb-6">Operacional</h2>
                        <Card className="p-8">
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-charcoal-900 mb-1">Importar NF-e</h3>
                                <p className="text-charcoal-400 text-sm">Entrada de novos lotes de mercadoria via XML</p>
                            </div>

                            <div className="relative group overflow-hidden rounded-ruby bg-charcoal-50 border border-transparent transition-all border-dashed hover:border-ruby-700/30 p-10 text-center cursor-pointer">
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
                                        <p className="text-sm font-semibold text-charcoal-900">{file ? file.name : "Solte o arquivo ou clique"}</p>
                                        <p className="text-xs text-charcoal-400">Padrão Nacional SEFAZ (.xml)</p>
                                    </div>
                                </div>
                            </div>

                            <RubyButton
                                onClick={handleUpload}
                                loading={uploading}
                                disabled={!file}
                                className="w-full mt-8 h-12"
                            >
                                Efetivar Entrada
                                <ChevronRight className="w-4 h-4" />
                            </RubyButton>
                        </Card>
                    </section>

                    {/* Table Card */}
                    <section className="lg:col-span-7">
                        <h2 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest mb-6">Ativos em Estoque</h2>
                        <Card>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-charcoal-50">
                                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">SKU</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Especificação</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em] text-right">QTD</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-charcoal-50/50">
                                    {loading ? (
                                        [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                                    ) : stock && stock.length > 0 ? (
                                        stock.map((item) => (
                                            <tr key={item.code} className="hover:bg-charcoal-50/40 transition-colors group">
                                                <td className="px-8 py-5 text-sm font-mono text-ruby-700/70">{item.code}</td>
                                                <td className="px-8 py-5 text-sm font-bold text-charcoal-900">{item.name}</td>
                                                <td className="px-8 py-5 text-sm font-black text-charcoal-700 text-right">{item.quantity}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-8 py-20 text-center text-sm text-charcoal-400 italic">
                                                Nenhum registro encontrado na base de dados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </Card>
                    </section>
                </div>
            </main>
        </div>
    );
}
