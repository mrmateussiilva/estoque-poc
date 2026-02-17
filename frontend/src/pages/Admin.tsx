import { useState, useEffect } from 'react';
import {
    FolderTree,
    Mail,
    Plus,
    Trash2,
    Save,
    ShieldCheck,
    Bell,
    Database,
    Users,
    Edit2,
    Check
} from 'lucide-react';
import { Card, TableContainer, THead, TBody, Tr, Th, Td, Button, Modal } from '../components/UI';
import ConfirmModal from '../components/ConfirmModal';
import {
    useCategoriesQuery,
    useUsersQuery,
    useCategoryMutations,
    useUserMutations,
    useEmailConfigQuery,
    useEmailConfigMutations
} from '../hooks/useQueries';

type AdminTab = 'categories' | 'users' | 'settings' | 'notifications';

interface User {
    id: number;
    name?: string;
    email: string;
    role: string;
    active: boolean;
}

export default function Admin() {
    const [activeTab, setActiveTab] = useState<AdminTab>('categories');

    // Queries
    const { data: categories = [] } = useCategoriesQuery();
    const { data: users = [] } = useUsersQuery();

    // Mutations
    const { saveCategory, deleteCategory } = useCategoryMutations();
    const { saveUser, toggleUserStatus } = useUserMutations();

    // Configuração de E-mail
    const { data: remoteEmailConfig } = useEmailConfigQuery();
    const { saveEmailConfig, testConnection } = useEmailConfigMutations();
    const [emailConfigLocal, setEmailConfigLocal] = useState({
        imap_host: '',
        imap_port: 993,
        imap_user: '',
        imap_password: '',
        imap_folder: 'INBOX',
        imap_allowed_senders: '',
        imap_subject_filter: '',
        use_tls: true,
        active: false
    });

    useEffect(() => {
        if (remoteEmailConfig) {
            setEmailConfigLocal({
                ...remoteEmailConfig,
                imap_password: '********'
            });
        }
    }, [remoteEmailConfig]);

    // Categorias state
    const [isAddingCat, setIsAddingCat] = useState(false);
    const [editingCatId, setEditingCatId] = useState<number | null>(null);
    const [catNameInput, setCatNameInput] = useState('');

    // Usuários state
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userInput, setUserInput] = useState({ name: '', email: '', password: '', role: 'OPERADOR' });

    // Confirmação state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'danger'
    });

    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 3000);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catNameInput.trim()) return;

        try {
            await saveCategory.mutateAsync({ id: editingCatId, name: catNameInput });
            setCatNameInput('');
            setIsAddingCat(false);
            setEditingCatId(null);
            showMsg(editingCatId ? 'Categoria atualizada!' : 'Categoria criada!');
        } catch (err: any) {
            showMsg(err.message || 'Erro ao processar categoria', 'error');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita. Verifique se não há produtos vinculados.',
            onConfirm: async () => {
                try {
                    await deleteCategory.mutateAsync(id);
                    showMsg('Categoria excluída!');
                    setConfirmModal({ ...confirmModal, isOpen: false });
                } catch (err: any) {
                    showMsg(err.message || 'Erro ao excluir (verifique se há produtos vinculados)', 'error');
                    setConfirmModal({ ...confirmModal, isOpen: false });
                }
            },
            variant: 'danger'
        });
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saveUser.mutateAsync({ id: editingUser?.id, data: userInput });
            setIsAddingUser(false);
            setEditingUser(null);
            setUserInput({ name: '', email: '', password: '', role: 'OPERADOR' });
            showMsg(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
        } catch (err: any) {
            showMsg(err.message || 'Erro ao processar usuário', 'error');
        }
    };

    const handleDeactivateUser = async (user: User) => {
        setConfirmModal({
            isOpen: true,
            title: user.active ? 'Confirmar Inativação' : 'Confirmar Ativação',
            message: user.active
                ? `Tem certeza que deseja inativar o usuário "${user.email}"? Ele não poderá mais acessar o sistema.`
                : `Tem certeza que deseja ativar o usuário "${user.email}"?`,
            onConfirm: async () => {
                try {
                    await toggleUserStatus.mutateAsync(user);
                    showMsg(`Usuário ${user.active ? 'inativado' : 'ativado'}!`);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                } catch (err: any) {
                    showMsg(err.message || 'Erro ao conectar no servidor', 'error');
                    setConfirmModal({ ...confirmModal, isOpen: false });
                }
            },
            variant: user.active ? 'danger' : 'info'
        });
    };

    const tabs = [
        { id: 'categories', label: 'Categorias', icon: FolderTree },
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'settings', label: 'E-mail', icon: Mail },
        { id: 'notifications', label: 'Sistema', icon: Bell },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-charcoal-100/50 px-4 md:px-0">
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-navy-950 rounded-2xl flex items-center justify-center shadow-premium border border-navy-800 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-ruby-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <ShieldCheck className="text-ruby-500 group-hover:text-white w-6 h-6 md:w-8 md:h-8 transition-colors relative z-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-4xl font-black text-navy-900 tracking-tighter uppercase leading-none">Administração</h2>
                        <p className="hidden md:block text-[10px] font-black text-charcoal-400 uppercase tracking-[0.3em] mt-3 opacity-60">HUB DE GOVERNANÇA E CONTROLE</p>
                    </div>
                </div>

                {msg && (
                    <div className={`px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-500 shadow-premium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-ruby-50 text-ruby-600 border border-ruby-100'
                        }`}>
                        {msg.text}
                    </div>
                )}
            </div>

            {/* Hub Navigation */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as AdminTab)}
                            className={`
                                group flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-2xl md:rounded-3xl border transition-all duration-500 relative overflow-hidden
                                ${isActive
                                    ? 'bg-navy-900 border-navy-900 shadow-premium scale-[1.02]'
                                    : 'bg-white border-charcoal-100 hover:border-ruby-200 hover:bg-ruby-50/20'}
                            `}
                        >
                            <div className={`p-2.5 md:p-3 rounded-lg md:rounded-xl transition-all duration-500 ${isActive ? 'bg-ruby-600 shadow-ruby' : 'bg-charcoal-50 group-hover:bg-ruby-100'}`}>
                                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-white scale-110' : 'text-navy-900 group-hover:text-ruby-600'}`} />
                            </div>
                            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] transition-colors ${isActive ? 'text-white' : 'text-charcoal-600 group-hover:text-navy-900'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* View Content */}
            <div className="mt-8">
                {activeTab === 'categories' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 px-4 md:px-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Database className="text-ruby-600 w-5 h-5" />
                                <h3 className="text-base md:text-lg font-black text-charcoal-900 uppercase tracking-tight">Categorias</h3>
                            </div>
                            <Button
                                onClick={() => { setIsAddingCat(true); setEditingCatId(null); setCatNameInput(''); }}
                                className="bg-charcoal-900 rounded-xl h-10 px-4"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest hidden sm:inline">Nova Categoria</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest sm:hidden">Nova</span>
                            </Button>
                        </div>

                        {(isAddingCat || editingCatId) && (
                            <Modal
                                title={editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
                                onClose={() => { setIsAddingCat(false); setEditingCatId(null); setCatNameInput(''); }}
                                className="max-w-md mx-4"
                            >
                                <form onSubmit={handleSaveCategory} className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-[0.2em]">
                                            Nome da Categoria
                                        </label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={catNameInput}
                                            onChange={(e) => setCatNameInput(e.target.value)}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold outline-none focus:border-charcoal-900"
                                            placeholder="Ex: Eletrônicos"
                                        />
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2">
                                        <Button type="button" onClick={() => { setIsAddingCat(false); setEditingCatId(null); }} variant="outline" className="h-11">Cancelar</Button>
                                        <Button type="submit" className="bg-emerald-600 h-11">Salvar</Button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        {/* Mobile Cards View */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-white p-5 rounded-2xl border border-charcoal-100 shadow-sm flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-charcoal-300 tracking-widest">#{cat.id}</span>
                                        <span className="font-bold text-navy-900 uppercase tracking-tight">{cat.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditingCatId(cat.id); setCatNameInput(cat.name); }} className="p-2.5 text-charcoal-400 active:text-navy-900 active:bg-charcoal-50 rounded-xl transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-2.5 text-charcoal-400 active:text-ruby-600 active:bg-ruby-50 rounded-xl transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-3xl border border-charcoal-100 overflow-hidden shadow-premium">
                            <TableContainer className="border-none">
                                <THead><Tr className="bg-navy-950"><Th className="text-white">ID</Th><Th className="text-white">Nome</Th><Th className="text-right text-white">Ações</Th></Tr></THead>
                                <TBody>
                                    {categories.map(cat => (
                                        <Tr key={cat.id}>
                                            <Td className="text-[10px] font-bold text-charcoal-300">#{cat.id}</Td>
                                            <Td className="font-bold text-charcoal-900 uppercase tracking-tight">{cat.name}</Td>
                                            <Td className="text-right space-x-2">
                                                <button onClick={() => { setEditingCatId(cat.id); setCatNameInput(cat.name); }} className="p-2 text-charcoal-400 hover:text-navy-900">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-charcoal-400 hover:text-ruby-600">
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

                {activeTab === 'users' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 px-4 md:px-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Users className="text-ruby-600 w-5 h-5" />
                                <h3 className="text-base md:text-lg font-black text-charcoal-900 uppercase tracking-tight">Equipe & Acessos</h3>
                            </div>
                            <Button
                                onClick={() => { setIsAddingUser(true); setEditingUser(null); setUserInput({ name: '', email: '', password: '', role: 'OPERADOR' }); }}
                                className="bg-charcoal-900 rounded-xl h-10 px-4"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest hidden sm:inline">Novo Usuário</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest sm:hidden">Novo</span>
                            </Button>
                        </div>

                        {(isAddingUser || editingUser) && (
                            <Modal
                                title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                onClose={() => { setIsAddingUser(false); setEditingUser(null); }}
                                className="max-w-2xl mx-4"
                            >
                                <form onSubmit={handleSaveUser} className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Nome Completo</label>
                                        <input type="text" value={userInput.name} onChange={e => setUserInput({ ...userInput, name: e.target.value })} className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">E-mail de Acesso</label>
                                        <input type="email" value={userInput.email} onChange={e => setUserInput({ ...userInput, email: e.target.value })} className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Senha {editingUser && '(deixe em branco para manter)'}</label>
                                        <input type="password" value={userInput.password} onChange={e => setUserInput({ ...userInput, password: e.target.value })} className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Perfil</label>
                                        <select value={userInput.role} onChange={e => setUserInput({ ...userInput, role: e.target.value })} className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold">
                                            <option value="OPERADOR">Operador</option>
                                            <option value="GERENTE">Gerente</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-charcoal-100 mt-2">
                                        <Button type="button" onClick={() => { setIsAddingUser(false); setEditingUser(null); }} variant="outline">Cancelar</Button>
                                        <Button type="submit" className="bg-emerald-600 px-6 md:px-10">Confirmar</Button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        {/* Mobile Cards View */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {users.map(u => (
                                <div key={u.id} className={`bg-white p-5 rounded-2xl border border-charcoal-100 shadow-sm flex flex-col gap-4 ${!u.active ? 'opacity-50 grayscale' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-navy-900 uppercase tracking-tight">{u.name || 'Sem Nome'}</span>
                                            <span className="text-[10px] text-charcoal-400 font-bold">{u.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-charcoal-300'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{u.active ? 'Ativo' : 'Inativo'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-charcoal-50">
                                        <span className="text-[10px] font-black px-3 py-1 bg-charcoal-50 rounded-full border border-charcoal-100 text-charcoal-600">
                                            {u.role}
                                        </span>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingUser(u); setUserInput({ ...userInput, name: u.name || '', email: u.email, role: u.role, password: '' }); }} className="p-2.5 text-charcoal-400 active:text-navy-900 active:bg-charcoal-50 rounded-xl transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeactivateUser(u)} className={`p-2.5 ${u.active ? 'text-charcoal-400 active:text-ruby-600 active:bg-ruby-50' : 'text-emerald-600 active:bg-emerald-50'} rounded-xl transition-colors`}>
                                                {u.active ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-3xl border border-charcoal-100 overflow-hidden shadow-premium">
                            <TableContainer className="border-none">
                                <THead><Tr className="bg-navy-950"><Th className="text-white">Usuário</Th><Th className="text-white">Perfil</Th><Th className="text-white">Status</Th><Th className="text-right text-white">Ações</Th></Tr></THead>
                                <TBody>
                                    {users.map(u => (
                                        <Tr key={u.id} className={!u.active ? 'opacity-50 grayscale' : ''}>
                                            <Td>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-navy-900 uppercase tracking-tight">{u.name || 'Sem Nome'}</span>
                                                    <span className="text-[10px] text-charcoal-400 font-bold">{u.email}</span>
                                                </div>
                                            </Td>
                                            <Td><span className="text-[10px] font-black px-3 py-1 bg-charcoal-50 rounded-full border border-charcoal-100">{u.role}</span></Td>
                                            <Td>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-charcoal-300'}`} />
                                                    <span className="text-[10px] font-bold uppercase">{u.active ? 'Ativo' : 'Inativo'}</span>
                                                </div>
                                            </Td>
                                            <Td className="text-right space-x-2">
                                                <button onClick={() => { setEditingUser(u); setUserInput({ ...userInput, name: u.name || '', email: u.email, role: u.role, password: '' }); }} className="p-2 text-charcoal-400 hover:text-navy-900">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeactivateUser(u)} className={`p-2 ${u.active ? 'text-charcoal-400 hover:text-ruby-600' : 'text-emerald-600'}`}>
                                                    {u.active ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
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
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl px-4 md:px-0">
                        <div className="flex items-center gap-3">
                            <Mail className="text-ruby-600 w-5 h-5" />
                            <h3 className="text-base md:text-lg font-black text-charcoal-900 uppercase tracking-tight">Configuração de E-mail (IMAP)</h3>
                        </div>

                        <Card className="p-4 md:p-8 space-y-8 rounded-3xl">
                            <form className="space-y-6" onSubmit={(e) => {
                                e.preventDefault();
                                saveEmailConfig.mutate(emailConfigLocal, {
                                    onSuccess: () => showMsg('Configurações salvas com sucesso!')
                                });
                            }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Servidor IMAP (Host)</label>
                                        <input
                                            type="text"
                                            value={emailConfigLocal.imap_host}
                                            onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, imap_host: e.target.value })}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold text-sm"
                                            placeholder="imap.gmail.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Porta</label>
                                        <input
                                            type="number"
                                            value={emailConfigLocal.imap_port}
                                            onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, imap_port: parseInt(e.target.value) })}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold text-sm"
                                            placeholder="993"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Usuário / E-mail</label>
                                        <input
                                            type="email"
                                            value={emailConfigLocal.imap_user}
                                            onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, imap_user: e.target.value })}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Senha</label>
                                        <input
                                            type="password"
                                            value={emailConfigLocal.imap_password}
                                            onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, imap_password: e.target.value })}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold text-sm"
                                            placeholder="********"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Pasta (Folder)</label>
                                        <input
                                            type="text"
                                            value={emailConfigLocal.imap_folder}
                                            onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, imap_folder: e.target.value })}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold text-sm"
                                            placeholder="INBOX"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Filtro de Assunto</label>
                                        <input
                                            type="text"
                                            value={emailConfigLocal.imap_subject_filter}
                                            onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, imap_subject_filter: e.target.value })}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold text-sm"
                                            placeholder="Ex: Nota Fiscal"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Remetentes Permitidos (vírgula)</label>
                                        <input
                                            type="text"
                                            value={emailConfigLocal.imap_allowed_senders}
                                            onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, imap_allowed_senders: e.target.value })}
                                            className="w-full h-12 px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold text-sm"
                                            placeholder="exemplo@gmail.com"
                                        />
                                    </div>
                                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="use-tls"
                                                checked={emailConfigLocal.use_tls}
                                                onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, use_tls: e.target.checked })}
                                                className="w-5 h-5 accent-ruby-600"
                                            />
                                            <label htmlFor="use-tls" className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Usar TLS (SSL)</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="is-active"
                                                checked={emailConfigLocal.active}
                                                onChange={(e) => setEmailConfigLocal({ ...emailConfigLocal, active: e.target.checked })}
                                                className="w-5 h-5 accent-ruby-600"
                                            />
                                            <label htmlFor="is-active" className="text-[10px] font-black text-charcoal-700 uppercase tracking-widest">Ativo</label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-3 pt-6 border-t border-charcoal-50">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 border-charcoal-300"
                                        onClick={() => {
                                            testConnection.mutate(emailConfigLocal, {
                                                onSuccess: (data) => showMsg(data.message),
                                                onError: (err: any) => showMsg(err.message, 'error')
                                            });
                                        }}
                                        disabled={testConnection.isPending}
                                    >
                                        {testConnection.isPending ? 'Testando...' : 'Testar Conexão'}
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-charcoal-900 h-12 shadow-lg"
                                        disabled={saveEmailConfig.isPending}
                                    >
                                        <Save className="w-4 h-4" />
                                        <span className="font-black uppercase tracking-widest">
                                            {saveEmailConfig.isPending ? 'Salvando...' : 'Salvar'}
                                        </span>
                                    </Button>
                                </div>
                            </form>
                        </Card>
                        <p className="text-[9px] md:text-[10px] text-charcoal-400 font-medium italic text-center px-4">
                            O sistema verificará novos e-mails a cada 5 minutos em busca de arquivos .xml ou .zip contendo notas fiscais.
                        </p>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="p-12 md:p-24 text-center opacity-30 space-y-4 animate-in fade-in duration-500">
                        <Bell className="w-12 h-12 md:w-16 md:h-16 mx-auto text-charcoal-200" />
                        <p className="text-[10px] md:text-sm font-bold uppercase tracking-[0.3em]">Logs do Sistema indisponíveis</p>
                    </div>
                )}
            </div>

            {/* Modal de Confirmação */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </div>
    );
}