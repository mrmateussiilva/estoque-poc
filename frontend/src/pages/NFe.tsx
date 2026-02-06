import { useState, useEffect } from 'react';
import { TableContainer, THead, TBody, Tr, Th, Td, Badge } from '../components/UI';
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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-6 pb-8 border-b border-charcoal-100/50">
                <div className="w-16 h-16 bg-navy-950 rounded-2xl flex items-center justify-center shadow-premium relative overflow-hidden group">
                    <div className="absolute inset-0 bg-ruby-600 translate-y-full group-hover:origin-bottom group-hover:translate-y-0 transition-transform duration-500" />
                    <CheckCircle className="w-8 h-8 text-ruby-500 group-hover:text-white transition-colors relative z-10" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-ruby-600 tracking-[0.3em] leading-none">Arquivo Fiscal Inteligente</p>
                    <h2 className="text-3xl font-black text-navy-900 tracking-tighter uppercase mt-2">Histórico de Notas</h2>
                </div>
            </div>

            <TableContainer className="border-none shadow-premium rounded-3xl overflow-hidden">
                <THead>
                    <Tr className="bg-navy-950 border-none">
                        <Th className="text-white py-6">Identificação Fiscal</Th>
                        <Th className="text-white">Data Processamento</Th>
                        <Th className="text-white">Qtd Itens</Th>
                        <Th className="text-white">Status</Th>
                    </Tr>
                </THead>
                <TBody>
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <Tr key={i} className="animate-pulse">
                                <Td><div className="h-5 bg-charcoal-50 rounded w-48" /></Td>
                                <Td><div className="h-5 bg-charcoal-50 rounded w-24" /></Td>
                                <Td><div className="h-5 bg-charcoal-50 rounded w-16" /></Td>
                                <Td><div className="h-7 bg-charcoal-50 rounded-full w-28" /></Td>
                            </Tr>
                        ))
                    ) : nfes.length > 0 ? (
                        nfes.map((nfe) => (
                            <Tr key={nfe.access_key}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-charcoal-50 flex items-center justify-center text-charcoal-400 group-hover:text-ruby-600 transition-colors border border-charcoal-100">
                                            <span className="text-[10px] font-bold uppercase">NFe</span>
                                        </div>
                                        <span className="text-sm font-semibold text-charcoal-950 tracking-tight uppercase">{nfe.access_key.slice(-12)}...</span>
                                    </div>
                                </Td>
                                <Td>
                                    <span className="text-sm font-medium text-charcoal-500">{formatDate(nfe.processed_at)}</span>
                                </Td>
                                <Td>
                                    <span className="text-sm font-semibold text-charcoal-900">{nfe.total_items} unid.</span>
                                </Td>
                                <Td>
                                    <Badge variant="success">Processada</Badge>
                                </Td>
                            </Tr>
                        ))
                    ) : (
                        <Tr>
                            <Td colSpan={4} className="px-8 py-24 text-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-charcoal-50 rounded-xl flex items-center justify-center">
                                        <CheckCircle className="w-8 h-8 text-charcoal-200" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-charcoal-950 font-bold">Nenhum registro</p>
                                        <p className="text-charcoal-400 text-xs font-medium uppercase tracking-widest">Sincronize notas para começar</p>
                                    </div>
                                </div>
                            </Td>
                        </Tr>
                    )}
                </TBody>
            </TableContainer>
        </div>
    );
}
