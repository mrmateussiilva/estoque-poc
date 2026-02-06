import { useState, useEffect } from 'react';
import {
    FolderTree,
    Mail,
    Settings,
    Plus,
    Trash2,
    Save,
    ShieldCheck,
    Bell,
    Database
} from 'lucide-react';
import { Card, TableContainer, THead, TBody, Tr, Th, Td, Button } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

type AdminTab = 'categories' | 'settings' | 'notifications';

export default function Admin() {
    const { apiFetch } = useAuth();
    const { categories, setCategories } = useData();
    const [activeTab, setActiveTab] = useState<AdminTab>('categories');

    // Categorias state
    const [loadingCat, setLoadingCat] = useState(false);
    const [isAddingCat, setIsAddingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    // Settings state
    const [emailConfig, setEmailConfig] = useState({
        inbound_email: 'financeiro@empresa.com.br',
        auto_process: true,
        notify_errors: true,
        retention_days: 90
    });

    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchCategories = async () => {
        setLoadingCat(true);
        try {
            const response = await apiFetch('/api/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data || []);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoadingCat(false);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        try {
            const response = await apiFetch('/api/categories', {
                method: 'POST',
                body: JSON.stringify({ name: newCatName })
            });

            if (response.ok) {
                setNewCatName('');
                setIsAddingCat(false);
                setMsg({ type: 'success', text: 'Categoria adicionada com sucesso!' });
                await fetchCategories();
                setTimeout(() => setMsg(null), 3000);
            } else {
                const data = await response.json();
                setMsg({ type: 'error', text: data.error || 'Erro ao criar categoria' });
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Erro ao conectar no servidor' });
        }
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ type: 'success', text: 'Configurações salvas com sucesso!' });
        setTimeout(() => setMsg(null), 3000);
    };

    useEffect(() => {
        if (activeTab === 'categories') fetchCategories();
    }, [activeTab]);

    const tabs = [
        { id: 'categories', label: 'Gestão de Categorias', icon: FolderTree },
        { id: 'settings', label: 'Configurações de E-mail', icon: Mail },
        { id: 'notifications', label: 'Sistema & Logs', icon: Bell },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-charcoal-100">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-charcoal-950 rounded-2xl flex items-center justify-center shadow-xl border border-white/10">
                        <ShieldCheck className="text-ruby-500 w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-charcoal-950 tracking-tighter uppercase leading-none">Painel Administrativo</h2>
                        <p className="text-xs font-bold text-charcoal-400 uppercase tracking-[0.2em] mt-2">Configurações globais do sistema</p>
                    </div>
                </div>

                {msg && (
                    <div className={`px-6 py-3 rounded-xl text-sm font-bold animate-in slide-in-from-right-4 duration-300 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-ruby-50 text-ruby-700 border border-ruby-100'
                        }`}>
                        {msg.text}
                    </div>
                )}
            </div>

            {/* Hub Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as AdminTab)}
                            className={`
                                group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300
                                ${isActive
                                    ? 'bg-charcoal-900 border-charcoal-900 shadow-xl shadow-charcoal-900/10'
                                    : 'bg-white border-charcoal-100 hover:border-ruby-200 hover:bg-ruby-50/30'}
                            `}
                        >
                            <div className={`p-3 rounded-xl transition-colors ${isActive ? 'bg-ruby-600' : 'bg-charcoal-50 group-hover:bg-ruby-100'}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-charcoal-900 group-hover:text-ruby-600'}`} />
                            </div>
                            <span className={`text-sm font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-charcoal-600'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* View Content */}
            <div className="mt-8">
                {activeTab === 'categories' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Database className="text-ruby-600 w-5 h-5" />
                                <h3 className="text-lg font-black text-charcoal-900 uppercase tracking-tight">Banco de Categorias</h3>
                            </div>
                            <Button
                                onClick={() => setIsAddingCat(!isAddingCat)}
                                className="bg-charcoal-900 rounded-xl"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Adicionar</span>
                            </Button>
                        </div>

                        {isAddingCat && (
                            <Card className="p-6 border-2 border-charcoal-900 shadow-xl">
                                <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Novo Nome</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newCatName}
                                            onChange={(e) => setNewCatName(e.target.value)}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-100 rounded-xl font-bold outline-none focus:border-charcoal-900"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" className="bg-emerald-600 h-12 px-8">Salvar</Button>
                                        <Button type="button" onClick={() => setIsAddingCat(false)} className="bg-charcoal-100 text-charcoal-600 h-12">X</Button>
                                    </div>
                                </form>
                            </Card>
                        )}

                        <div className="bg-white rounded-3xl border border-charcoal-100 overflow-hidden shadow-sm">
                            <TableContainer className="border-none">
                                <THead>
                                    <Tr>
                                        <Th>ID</Th>
                                        <Th>Categoria</Th>
                                        <Th className="text-right">Ações</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {loadingCat ? (
                                        [...Array(3)].map((_, i) => (
                                            <Tr key={i} className="animate-pulse">
                                                <Td><div className="h-4 bg-charcoal-50 rounded w-8" /></Td>
                                                <Td><div className="h-4 bg-charcoal-50 rounded w-48" /></Td>
                                                <Td><div className="h-4 bg-charcoal-50 rounded w-4 ml-auto" /></Td>
                                            </Tr>
                                        ))
                                    ) : categories.map(cat => (
                                        <Tr key={cat.id}>
                                            <Td className="text-[10px] font-bold text-charcoal-300">#{cat.id}</Td>
                                            <Td className="font-bold text-charcoal-900 uppercase tracking-tight">{cat.name}</Td>
                                            <Td className="text-right">
                                                <button disabled className="p-2 text-charcoal-100 cursor-not-allowed">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </TableContainer>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <Settings className="text-ruby-600 w-5 h-5" />
                            <h3 className="text-lg font-black text-charcoal-900 uppercase tracking-tight">Preferências de Integração</h3>
                        </div>

                        <Card className="p-8 space-y-8">
                            <form onSubmit={handleSaveSettings} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-charcoal-400 uppercase tracking-widest">E-mail de Entrada (NF-e)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300" />
                                        <input
                                            type="email"
                                            value={emailConfig.inbound_email}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, inbound_email: e.target.value })}
                                            className="w-full pl-12 pr-4 h-14 bg-charcoal-50 border border-charcoal-100 rounded-xl font-bold outline-none focus:border-ruby-600 transition-colors"
                                        />
                                    </div>
                                    <p className="text-[10px] text-charcoal-400 font-medium italic">As notas enviadas para este e-mail serão processadas automaticamente.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="flex items-center justify-between p-4 bg-charcoal-50 rounded-2xl border border-charcoal-100">
                                        <span className="text-xs font-bold text-charcoal-900 uppercase">Processo Automático</span>
                                        <input
                                            type="checkbox"
                                            checked={emailConfig.auto_process}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, auto_process: e.target.checked })}
                                            className="w-5 h-5 accent-ruby-600"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-charcoal-50 rounded-2xl border border-charcoal-100">
                                        <span className="text-xs font-bold text-charcoal-900 uppercase">Alerta de Falhas</span>
                                        <input
                                            type="checkbox"
                                            checked={emailConfig.notify_errors}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, notify_errors: e.target.checked })}
                                            className="w-5 h-5 accent-ruby-600"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-charcoal-50">
                                    <Button type="submit" className="w-full bg-charcoal-900 h-14 rounded-2xl shadow-lg">
                                        <Save className="w-4 h-4" />
                                        <span className="font-black uppercase tracking-widest">Salvar Configurações</span>
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="p-12 text-center opacity-30 space-y-4 animate-in fade-in duration-500">
                        <Bell className="w-16 h-16 mx-auto text-charcoal-200" />
                        <p className="text-sm font-bold uppercase tracking-[0.3em]">Logs do Sistema indisponíveis</p>
                    </div>
                )}
            </div>
        </div>
    );
}
