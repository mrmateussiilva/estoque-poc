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
        <Card>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-charcoal-50">
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Chave de Acesso</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Data</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Itens</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-50/50">
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                <td className="px-8 py-5"><div className="h-3 bg-charcoal-50 rounded w-32" /></td>
                                <td className="px-8 py-5"><div className="h-3 bg-charcoal-50 rounded w-24" /></td>
                                <td className="px-8 py-5"><div className="h-3 bg-charcoal-50 rounded w-16" /></td>
                                <td className="px-8 py-5"><div className="h-3 bg-charcoal-50 rounded w-20" /></td>
                            </tr>
                        ))
                    ) : nfes.length > 0 ? (
                        nfes.map((nfe) => (
                            <tr key={nfe.access_key} className="hover:bg-charcoal-50/40 transition-colors">
                                <td className="px-8 py-5 text-xs font-mono text-ruby-700/70">{nfe.access_key.slice(-8)}</td>
                                <td className="px-8 py-5 text-sm font-bold text-charcoal-900">{formatDate(nfe.processed_at)}</td>
                                <td className="px-8 py-5 text-sm text-charcoal-700">{nfe.total_items} produtos</td>
                                <td className="px-8 py-5">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-ruby text-xs font-bold">
                                        <CheckCircle className="w-3 h-3" />
                                        Processada
                                    </span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-8 py-20 text-center text-sm text-charcoal-400 italic">
                                Nenhuma NF-e processada
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </Card>
    );
}
