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
            <div className="flex items-center gap-4 border-b border-charcoal-100 pb-6">
                <div className="w-12 h-12 bg-charcoal-900 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-5 h-5 text-ruby-500" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-ruby-600 tracking-widest leading-none">Arquivo Fiscal</p>
                    <h2 className="text-2xl font-bold text-charcoal-950 tracking-tight uppercase">Histórico de Notas</h2>
                </div>
            </div>

            <TableContainer className="border-none">
                <THead>
                    <Tr>
                        <Th>Identificação Fiscal</Th>
                        <Th>Data Processamento</Th>
                        <Th>Qtd Itens</Th>
                        <Th>Status</Th>
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
