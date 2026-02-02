import { useState, useEffect } from 'react';
import { Card } from '../components/UI';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NFe {
    access_key: string;
    number?: string;
    supplier_name?: string;
    total_items: number;
    processed_at: string;
}

export default function NFe() {
    const { apiFetch } = useAuth();
    const [nfes, setNfes] = useState<NFe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNFes = async () => {
            try {
                const response = await apiFetch('/api/nfes');
                if (response.ok) {
                    const data = await response.json();
                    setNfes(data || []);
                }
            } catch (err) {
                console.error('Error fetching NFes:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNFes();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4 border-b border-charcoal-100/50 pb-6">
                <div className="w-12 h-12 bg-charcoal-950 rounded-2xl flex items-center justify-center shadow-xl">
                    <CheckCircle className="w-6 h-6 text-ruby-500" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-ruby-600 tracking-[0.3em] leading-none opacity-80">Registro Fiscal</p>
                    <h2 className="text-2xl font-black text-charcoal-950 tracking-tighter italic uppercase">Arquivos Processados</h2>
                </div>
            </div>

            <Card className="border-none shadow-ruby p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-charcoal-950 text-white/40 uppercase">
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">ID Fiscal (Chave)</th>
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">Data de Registro</th>
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">Volume</th>
                                <th className="px-8 py-6 text-[10px] font-black tracking-[0.2em]">Status de Importação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-100/50 bg-white">
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-6"><div className="h-5 bg-charcoal-50 rounded-lg w-48" /></td>
                                        <td className="px-8 py-6"><div className="h-5 bg-charcoal-50 rounded-lg w-24" /></td>
                                        <td className="px-8 py-6"><div className="h-5 bg-charcoal-50 rounded-lg w-16" /></td>
                                        <td className="px-8 py-6"><div className="h-7 bg-charcoal-50 rounded-full w-28" /></td>
                                    </tr>
                                ))
                            ) : nfes.length > 0 ? (
                                nfes.map((nfe) => (
                                    <tr key={nfe.access_key} className="hover:bg-ruby-50/20 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-charcoal-50 flex items-center justify-center text-charcoal-300 group-hover:text-ruby-600 transition-colors">
                                                    <span className="text-[10px] font-black">NFe</span>
                                                </div>
                                                <span className="text-sm font-black text-charcoal-950 tracking-tighter uppercase">{nfe.access_key.slice(-8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-bold text-charcoal-600">{formatDate(nfe.processed_at)}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-black text-charcoal-900">{nfe.total_items} Itens</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100/50 shadow-sm shadow-emerald-500/10">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                Validada & Integrada
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="w-20 h-20 bg-charcoal-50 rounded-3xl flex items-center justify-center">
                                                <CheckCircle className="w-10 h-10 text-charcoal-200" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-charcoal-950 text-lg font-black tracking-tighter">Nenhum registro fiscal</p>
                                                <p className="text-charcoal-400 text-xs font-bold uppercase tracking-widest">Sincronize sua primeira nota fiscal para ver os dados aqui</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
