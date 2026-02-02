import { useState } from 'react';
import { AlertCircle, Gem, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/UI';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row antialiased overflow-hidden">
            {/* Visual side for desktop */}
            <div className="hidden md:flex md:w-3/5 bg-charcoal-950 items-center justify-center p-20 relative">
                <div className="relative z-10 text-center space-y-10 max-w-md">
                    <div className="relative mx-auto inline-block">
                        <div className="w-24 h-24 bg-ruby-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                            <Gem className="w-12 h-12 text-white" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                            <span className="w-1.5 h-1.5 bg-ruby-500 rounded-full" />
                            <p className="text-white/70 font-bold uppercase tracking-[0.2em] text-[10px]">Portal Corporativo</p>
                        </div>
                        <h1 className="text-6xl font-bold text-white tracking-tight leading-none uppercase">
                            Smart<br />Stock
                        </h1>
                        <p className="text-white/40 text-lg leading-relaxed font-medium tracking-tight">
                            Sistema de Gestão Estratégica para controle total de fluxos logísticos e ativos.
                        </p>
                    </div>
                </div>
            </div>

            {/* Login form side */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20 relative bg-white">
                <div className="w-full max-w-sm space-y-12 animate-in fade-in duration-700">
                    {/* Mobile Branding */}
                    <div className="md:hidden flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-charcoal-950 rounded-xl flex items-center justify-center">
                            <Gem className="w-5 h-5 text-ruby-500" />
                        </div>
                        <h1 className="text-xl font-bold text-charcoal-950 tracking-tight uppercase">S.G.E.</h1>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-charcoal-950 tracking-tight">Painel de Acesso</h2>
                        <p className="text-charcoal-500 text-sm font-medium">Entre com suas credenciais para gerenciar a operação.</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-ruby-50 border border-ruby-100 rounded-xl flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-ruby-100 flex-shrink-0 mt-0.5">
                                <AlertCircle className="w-5 h-5 text-ruby-600" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold text-ruby-900 uppercase tracking-widest leading-none mt-1">Acesso Negado</p>
                                <p className="text-sm text-ruby-800/80 font-semibold leading-tight">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest ml-1">Usuário / Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-14 px-5 bg-charcoal-50 border border-charcoal-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white text-sm font-semibold tracking-tight transition-all placeholder:text-charcoal-300"
                                placeholder="ex: admin@empresa.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">Senha de Acesso</label>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-14 px-5 bg-charcoal-50 border border-charcoal-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white text-sm font-semibold tracking-widest transition-all placeholder:text-charcoal-300"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <Button type="submit" loading={loading} className="w-full h-14 rounded-xl bg-charcoal-900 hover:bg-black text-sm font-bold uppercase tracking-widest active:scale-95 transition-all">
                            Iniciar Sessão
                        </Button>
                    </form>

                    <footer className="pt-8 flex flex-col items-center gap-4 border-t border-charcoal-100">
                        <p className="text-charcoal-300 text-[10px] font-bold uppercase tracking-widest">Powered by</p>
                        <a
                            href="https://finderbit.com.br"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-charcoal-200 hover:border-ruby-600/20 hover:bg-ruby-50/50 transition-all group"
                        >
                            <span className="text-charcoal-500 font-bold text-[10px] group-hover:text-charcoal-950 transition-colors tracking-widest uppercase">Finderbit</span>
                            <ExternalLink className="w-3 h-3 text-charcoal-300 group-hover:text-ruby-600 transition-colors" />
                        </a>
                    </footer>
                </div>
            </div>
        </div>
    );
}
