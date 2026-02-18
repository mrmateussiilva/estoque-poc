import { useState, useEffect } from 'react';
import { TableContainer, THead, TBody, Tr, Th, Td, Badge, Button, Modal } from '../components/UI';
import { FileText, Eye, ShieldCheck, TrendingUp, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { type NFe, type NFeDetail } from '../hooks/useQueries';
import PullToRefresh from '../components/PullToRefresh';

export default function NFe() {
    const { apiFetch } = useAuth();
    const queryClient = useQueryClient();
    const [nfes, setNfes] = useState<NFe[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    // Modal state
    const [selectedNfe, setSelectedNfe] = useState<NFe | null>(null);
    const [nfeDetail, setNfeDetail] = useState<NFeDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const fetchNFes = async () => {
        try {
            const response = await apiFetch('/api/nfes');
            if (response.ok) {
                const result = await response.json();
                setNfes(result.data || []);
            }
        } catch (err) {
            console.error('Error fetching NFes:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchNfeDetail = async (accessKey: string) => {
        setLoadingDetail(true);
        try {
            const response = await apiFetch(`/api/nfes/${accessKey}`);
            if (response.ok) {
                const result = await response.json();
                setNfeDetail(result);
            }
        } catch (err) {
            console.error('Error fetching NFe detail:', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleOpenDetail = (nfe: NFe) => {
        setSelectedNfe(nfe);
        fetchNfeDetail(nfe.access_key);
    };

    const handleRefresh = async () => {
        setLoading(true);
        await fetchNFes();
    };

    useEffect(() => {
        fetchNFes();
    }, []);

    const handleProcess = async (accessKey: string) => {
        setProcessing(accessKey);
        try {
            const response = await apiFetch(`/api/nfes/${accessKey}/process`, {
                method: 'POST'
            });
            if (response.ok) {
                setNfes(prev => prev.map(n =>
                    n.access_key === accessKey ? { ...n, status: 'PROCESSADA' } : n
                ));
                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-evolution'] });
                queryClient.invalidateQueries({ queryKey: ['stock'] });
            }
        } catch (err) {
            console.error('Error processing NFe:', err);
        } finally {
            setProcessing(null);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '---';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalValue = nfes.reduce((acc, curr) => acc + (curr.total_value || 0), 0);

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-8 animate-in fade-in duration-700">
                {/* Header Contextual */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-charcoal-100">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-navy-950 rounded-2xl flex items-center justify-center shadow-premium relative group overflow-hidden">
                            <div className="absolute inset-0 bg-ruby-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <FileText className="w-8 h-8 text-ruby-500 group-hover:text-white transition-colors relative z-10" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-navy-900 tracking-tighter uppercase leading-none">Arquivo Fiscal</h2>
                                <Badge variant="info" className="bg-blue-50/50! border-blue-100! text-blue-600! uppercase text-[9px] tracking-widest">Auditoria</Badge>
                            </div>
                            <p className="text-charcoal-400 text-[10px] font-black uppercase tracking-[0.25em]">Histórico completo de notas processadas e pendentes</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white px-6 py-3 rounded-2xl border border-charcoal-100 shadow-sm flex items-center gap-4">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <div className="text-right">
                                <p className="text-[9px] font-black text-charcoal-400 uppercase tracking-widest leading-none mb-1">Total Movimentado</p>
                                <p className="text-sm font-black text-navy-900 leading-none">
                                    {formatCurrency(totalValue)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabela de Histórico */}
                <div className="bg-white rounded-[32px] border border-charcoal-200 shadow-premium overflow-hidden">
                    <TableContainer className="border-none">
                        <THead>
                            <Tr className="bg-navy-950 border-none">
                                <Th className="text-white py-6">Emissor & Documento</Th>
                                <Th className="text-white">Data de Registro</Th>
                                <Th className="text-center text-white">Itens</Th>
                                <Th className="text-right text-white">Valor Total</Th>
                                <Th className="text-white">Status</Th>
                                <Th className="w-10 text-white">{null}</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <Tr key={i} className="animate-pulse">
                                        <Td><div className="h-5 bg-charcoal-50 rounded w-64" /></Td>
                                        <Td><div className="h-5 bg-charcoal-50 rounded w-32" /></Td>
                                        <Td><div className="h-5 bg-charcoal-50 rounded w-16 mx-auto" /></Td>
                                        <Td><div className="h-5 bg-charcoal-50 rounded w-24 ml-auto" /></Td>
                                        <Td><div className="h-7 bg-charcoal-50 rounded-full w-28" /></Td>
                                        <Td>{null}</Td>
                                    </Tr>
                                ))
                            ) : nfes.length > 0 ? (
                                nfes.map((nfe) => (
                                    <Tr key={nfe.access_key} className="group hover:bg-charcoal-50/50 transition-colors">
                                        <Td>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-charcoal-50 flex items-center justify-center text-charcoal-300 group-hover:bg-navy-950 group-hover:text-white transition-all shadow-sm ring-1 ring-charcoal-200/50">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-navy-900 uppercase tracking-tight truncate max-w-[240px]" title={nfe.supplier_name}>
                                                        {nfe.supplier_name || "Fornecedor não identificado"}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-charcoal-400 mt-1 uppercase tracking-[0.15em] font-mono">
                                                        Nº NF: {nfe.number || "---"}
                                                    </span>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-navy-900 tracking-tight">{formatDate(nfe.processed_at).split(' ')[0]}</span>
                                                <span className="text-[10px] font-medium text-charcoal-400">{formatDate(nfe.processed_at).split(' ')[1]}</span>
                                            </div>
                                        </Td>
                                        <Td className="text-center">
                                            <span className="text-sm font-black text-navy-900 tabular-nums">{nfe.total_items}</span>
                                            <span className="text-[10px] font-bold text-charcoal-300 ml-1 uppercase">it</span>
                                        </Td>
                                        <Td className="text-right">
                                            <span className="text-sm font-black text-navy-900 tracking-tighter tabular-nums">
                                                {formatCurrency(nfe.total_value || 0)}
                                            </span>
                                        </Td>
                                        <Td>
                                            {nfe.status === 'PROCESSADA' ? (
                                                <div className="flex items-center gap-2 text-emerald-600">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Conciliada</span>
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); handleProcess(nfe.access_key); }}
                                                    loading={processing === nfe.access_key}
                                                    className="h-8 px-4 bg-navy-950 hover:bg-ruby-600 text-[9px] font-black uppercase tracking-widest rounded-lg"
                                                >
                                                    Efetivar
                                                </Button>
                                            )}
                                        </Td>
                                        <Td className="text-right">
                                            <button
                                                onClick={() => handleOpenDetail(nfe)}
                                                className="w-8 h-8 rounded-lg bg-charcoal-50 flex items-center justify-center text-charcoal-300 hover:bg-navy-950 hover:text-white transition-all group-hover:translate-x-1"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </Td>
                                    </Tr>
                                ))
                            ) : (
                                <Tr>
                                    <Td colSpan={6} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="w-24 h-24 bg-charcoal-50 rounded-[32px] flex items-center justify-center shadow-inner border border-charcoal-100">
                                                <FileText className="w-10 h-10 text-charcoal-200" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xl font-black text-navy-950 tracking-tighter uppercase italic">Vazio Fiscal</p>
                                                <p className="text-sm font-bold text-charcoal-400 max-w-xs mx-auto leading-relaxed uppercase">
                                                    Nenhuma nota fiscal registrada no sistema. Comece importando arquivos XML.
                                                </p>
                                            </div>
                                        </div>
                                    </Td>
                                </Tr>
                            )}
                        </TBody>
                    </TableContainer>
                </div>

                {/* Modal de Detalhes */}
                {selectedNfe && (
                    <Modal
                        title="Auditoria de Nota Fiscal"
                        onClose={() => { setSelectedNfe(null); setNfeDetail(null); }}
                        className="max-w-4xl"
                    >
                        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {/* Modal Header/Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-4 bg-charcoal-50 rounded-2xl border border-charcoal-100 space-y-1">
                                    <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest">Fornecedor</p>
                                    <p className="text-sm font-black text-navy-900 truncate uppercase">{selectedNfe.supplier_name || 'Desconhecido'}</p>
                                </div>
                                <div className="p-4 bg-charcoal-50 rounded-2xl border border-charcoal-100 space-y-1">
                                    <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest">Número / Chave</p>
                                    <p className="text-sm font-black text-navy-900 font-mono">
                                        {selectedNfe.number || '---'} / ...{selectedNfe.access_key.slice(-8)}
                                    </p>
                                </div>
                                <div className="p-4 bg-navy-950 rounded-2xl border border-navy-900 shadow-ruby-sm space-y-1">
                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Valor da Operação</p>
                                    <p className="text-lg font-black text-ruby-500 tracking-tighter">
                                        {formatCurrency(selectedNfe.total_value)}
                                    </p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Package className="w-5 h-5 text-charcoal-400" />
                                    <h4 className="text-xs font-black text-navy-900 uppercase tracking-widest">Produtos Vinculados</h4>
                                </div>

                                <div className="border border-charcoal-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                                    <TableContainer className="min-w-full">
                                        <THead>
                                            <Tr className="bg-charcoal-50 border-b border-charcoal-100">
                                                <Th className="text-charcoal-500 py-4 uppercase">Código</Th>
                                                <Th className="text-charcoal-500 uppercase">Descrição do Produto</Th>
                                                <Th className="text-center text-charcoal-500 uppercase">Qtd</Th>
                                                <Th className="text-right text-charcoal-500 uppercase">V. Unit</Th>
                                                <Th className="text-right text-charcoal-500 uppercase">Total</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {loadingDetail ? (
                                                [...Array(3)].map((_, i) => (
                                                    <Tr key={i} className="animate-pulse">
                                                        <Td><div className="h-4 bg-charcoal-50 rounded w-16" /></Td>
                                                        <Td><div className="h-4 bg-charcoal-50 rounded w-full" /></Td>
                                                        <Td><div className="h-4 bg-charcoal-50 rounded w-8 mx-auto" /></Td>
                                                        <Td><div className="h-4 bg-charcoal-50 rounded w-16 ml-auto" /></Td>
                                                        <Td><div className="h-4 bg-charcoal-50 rounded w-16 ml-auto" /></Td>
                                                    </Tr>
                                                ))
                                            ) : nfeDetail?.items.map((item, idx) => (
                                                <Tr key={idx} className="hover:bg-charcoal-50/30">
                                                    <Td className="font-mono text-[10px] text-charcoal-400 uppercase">{item.code}</Td>
                                                    <Td>
                                                        <span className="text-xs font-bold text-navy-900 uppercase block leading-tight">
                                                            {item.name}
                                                        </span>
                                                    </Td>
                                                    <Td className="text-center font-black text-navy-900 tabular-nums">
                                                        {item.quantity}
                                                    </Td>
                                                    <Td className="text-right text-charcoal-600 tabular-nums">
                                                        {formatCurrency(item.unit_price)}
                                                    </Td>
                                                    <Td className="text-right font-black text-navy-900 tabular-nums">
                                                        {formatCurrency(item.total_price)}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </TableContainer>
                                </div>
                            </div>

                            {/* Footer Information */}
                            <div className="pt-6 border-t border-charcoal-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4 text-emerald-600">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Dados validados via SEFAZ XML</span>
                                </div>

                                {selectedNfe.status === 'PENDENTE' && (
                                    <Button
                                        onClick={() => handleProcess(selectedNfe.access_key)}
                                        loading={processing === selectedNfe.access_key}
                                        className="w-full md:w-auto bg-ruby-600 hover:bg-ruby-500 text-white"
                                    >
                                        Confirmar e Efetivar Estoque
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </PullToRefresh>
    );
}
