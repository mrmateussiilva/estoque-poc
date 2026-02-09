import { useState } from 'react';
import {
    FolderTree,
    Mail,
    Settings,
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
import { useCategoriesQuery, useUsersQuery, useCategoryMutations, useUserMutations } from '../hooks/useQueries';

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

    // Categorias state
    const [isAddingCat, setIsAddingCat] = useState(false);
    const [editingCatId, setEditingCatId] = useState<number | null>(null);
    const [catNameInput, setCatNameInput] = useState('');

    // Usuários state
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userInput, setUserInput] = useState({ name: '', email: '', password: '', role: 'OPERADOR' });

    // Settings state
    const [emailConfig, setEmailConfig] = useState({
        inbound_email: 'financeiro@empresa.com.br',
        auto_process: true,
        notify_errors: true,
        retention_days: 90
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
        if (!confirm('Deseja realmente excluir esta categoria?')) return;
        try {
            await deleteCategory.mutateAsync(id);
            showMsg('Categoria excluída!');
        } catch (err: any) {
            showMsg(err.message || 'Erro ao excluir (verifique se há produtos vinculados)', 'error');
        }
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
        const action = user.active ? 'inativar' : 'ativar';
        if (!confirm(`Deseja realmente ${action} este usuário?`)) return;
        try {
            await toggleUserStatus.mutateAsync(user);
            showMsg(`Usuário ${user.active ? 'inativado' : 'ativado'}!`);
        } catch (err: any) {
            showMsg(err.message || 'Erro ao conectar no servidor', 'error');
        }
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-charcoal-100/50">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-navy-950 rounded-2xl flex items-center justify-center shadow-premium border border-navy-800 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-ruby-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <ShieldCheck className="text-ruby-500 group-hover:text-white w-8 h-8 transition-colors relative z-10" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-navy-900 tracking-tighter uppercase leading-none">Administração</h2>
                        <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-[0.3em] mt-3 opacity-60">HUB DE GOVERNANÇA E CONTROLE</p>
                    </div>
                </div>

                {msg && (
                    <div className={`px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-500 shadow-premium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-ruby-50 text-ruby-600 border border-ruby-100'
                        }`}>
                        {msg.text}
                    </div>
                )}
            </div>

            {/* Hub Navigation */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as AdminTab)}
                            className={`
                                group flex items-center gap-4 p-5 rounded-3xl border transition-all duration-500 relative overflow-hidden
                                ${isActive
                                    ? 'bg-navy-950 border-navy-900 shadow-premium scale-[1.02]'
                                    : 'bg-white border-charcoal-100 hover:border-ruby-200 hover:bg-ruby-50/20'}
                            `}
                        >
                            <div className={`p-3 rounded-xl transition-all duration-500 ${isActive ? 'bg-ruby-600 shadow-ruby' : 'bg-charcoal-50 group-hover:bg-ruby-100'}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'text-white scale-110' : 'text-navy-900 group-hover:text-ruby-600'}`} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-white' : 'text-charcoal-600 group-hover:text-navy-900'}`}>
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
                                <h3 className="text-lg font-black text-charcoal-900 uppercase tracking-tight">Categorias</h3>
                            </div>
                            <Button
                                onClick={() => { setIsAddingCat(true); setEditingCatId(null); setCatNameInput(''); }}
                                className="bg-charcoal-900 rounded-xl"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Nova Categoria</span>
                            </Button>
                        </div>

                        {(isAddingCat || editingCatId) && (
                            <Modal
                                title={editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
                                onClose={() => { setIsAddingCat(false); setEditingCatId(null); setCatNameInput(''); }}
                                className="max-w-md"
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

                        <div className="bg-white rounded-3xl border border-charcoal-100 overflow-hidden shadow-premium">
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
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Users className="text-ruby-600 w-5 h-5" />
                                <h3 className="text-lg font-black text-charcoal-900 uppercase tracking-tight">Equipe & Acessos</h3>
                            </div>
                            <Button
                                onClick={() => { setIsAddingUser(true); setEditingUser(null); setUserInput({ name: '', email: '', password: '', role: 'OPERADOR' }); }}
                                className="bg-charcoal-900 rounded-xl"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Novo Usuário</span>
                            </Button>
                        </div>

                        {(isAddingUser || editingUser) && (
                            <Modal
                                title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                onClose={() => { setIsAddingUser(false); setEditingUser(null); }}
                                className="max-w-2xl"
                            >
                                <form onSubmit={handleSaveUser} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <Button type="submit" className="bg-emerald-600 px-10">Confirmar</Button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        <div className="bg-white rounded-3xl border border-charcoal-100 overflow-hidden shadow-premium">
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
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <Settings className="text-ruby-600 w-5 h-5" />
                            <h3 className="text-lg font-black text-charcoal-900 uppercase tracking-tight">Preferências de Integração</h3>
                        </div>

                        <Card className="p-8 space-y-8">
                            <form className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-charcoal-700 uppercase tracking-widest">E-mail de Entrada (NF-e)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300" />
                                        <input
                                            type="email"
                                            value={emailConfig.inbound_email}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, inbound_email: e.target.value })}
                                            className="w-full pl-12 pr-4 h-14 bg-charcoal-50 border border-charcoal-300 rounded-xl font-bold outline-none focus:border-ruby-600 transition-colors"
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
                                    <Button onClick={() => showMsg('Configurações salvas!')} className="w-full bg-charcoal-900 h-14 rounded-2xl shadow-lg">
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