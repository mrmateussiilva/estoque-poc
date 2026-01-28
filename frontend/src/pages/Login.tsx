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
        <div className="min-h-screen bg-white flex flex-col md:flex-row antialiased">
            {/* Visual side for desktop */}
            <div className="hidden md:flex md:w-1/2 bg-[#0D0F14] items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-ruby-700/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-ruby-950/20 blur-[120px] rounded-full"></div>

                <div className="relative z-10 text-center space-y-8 max-w-sm">
                    <div className="inline-flex w-24 h-24 bg-gradient-to-br from-ruby-500 to-ruby-800 rounded-3xl items-center justify-center shadow-2xl shadow-ruby-950/40 border border-white/10 mx-auto">
                        <Gem className="w-12 h-12 text-white" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-5xl font-black text-white tracking-tighter leading-none italic">S.G.E.</h1>
                        <p className="text-ruby-500 font-black uppercase tracking-[0.3em] text-xs">Smart Stock Control</p>
                    </div>
                    <p className="text-white/30 text-sm leading-relaxed font-medium">
                        Gestão inteligente de estoque corporativo com processamento automatizado de NF-e e relatórios em tempo real.
                    </p>
                </div>
            </div>

            {/* Login form side */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
                <div className="w-full max-w-sm space-y-10">
                    {/* Mobile Branding */}
                    <div className="md:hidden text-center space-y-4 mb-12">
                        <div className="inline-flex w-16 h-16 bg-gradient-to-br from-ruby-500 to-ruby-800 rounded-2xl items-center justify-center shadow-xl border border-white/10 mx-auto">
                            <Gem className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-charcoal-900 tracking-tighter leading-none italic">S.G.E.</h1>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-charcoal-900 tracking-tight">Portal de Acesso</h2>
                        <p className="text-charcoal-400 text-sm font-medium">Entre com suas credenciais para gerenciar sua operação.</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-ruby-50 border border-ruby-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 text-ruby-700 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-black text-ruby-900 uppercase tracking-widest">Erro de Autenticação</p>
                                <p className="text-sm text-ruby-800/80 font-medium leading-tight">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest ml-1">Usuário / Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-14 px-5 bg-charcoal-50 border border-charcoal-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ruby-700/10 focus:border-ruby-700 text-sm font-bold transition-all placeholder:text-charcoal-200"
                                placeholder="ex: admin@sge.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest">Senha de Acesso</label>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-14 px-5 bg-charcoal-50 border border-charcoal-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ruby-700/10 focus:border-ruby-700 text-sm font-bold transition-all placeholder:text-charcoal-200"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <Button type="submit" loading={loading} className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-ruby-900/10">
                            Iniciar Sessão
                        </Button>
                    </form>

                    <footer className="pt-12 text-center">
                        <p className="text-black/20 text-[10px] font-black uppercase tracking-widest mb-3">Desenvolvido por</p>
                        <a
                            href="https://finderbit.com.br"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 group transition-all"
                        >
                            <span className="text-charcoal-400 font-bold text-sm group-hover:text-charcoal-900 transition-colors tracking-tight">Finderbit</span>
                            <ExternalLink className="w-3 h-3 text-charcoal-200 group-hover:text-ruby-700 transition-colors" />
                        </a>
                    </footer>
                </div>
            </div>
        </div>
    );
}
