import { useState } from 'react';
import { AlertCircle, Gem, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Label } from '../components/UI';

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
        <div className="min-h-screen bg-white flex flex-col md:flex-row antialiased overflow-hidden selection:bg-ruby-500/30">
            {/* Visual side for desktop */}
            <div className="hidden md:flex md:w-3/5 bg-navy-950 items-center justify-center p-20 relative overflow-hidden">
                {/* Premium Background Effects */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-ruby-600/10 blur-[120px] -mr-96 -mt-96 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-ruby-900/10 blur-[100px] -ml-64 -mb-64" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-ruby-600/5 via-transparent to-transparent opacity-50" />

                <div className="relative z-10 text-center space-y-12 max-w-lg">
                    <div className="relative">
                        <div className="absolute inset-0 bg-ruby-600/40 blur-3xl rounded-full scale-75 animate-pulse" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-3xl flex items-center justify-center mx-auto shadow-[0_20px_50px_rgba(225,29,72,0.5)] border border-ruby-400/30 transform hover:scale-105 transition-transform duration-500">
                            <Gem className="w-12 h-12 text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.5)]" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-2xl">
                            <div className="w-2 h-2 bg-ruby-500 rounded-full shadow-[0_0_12px_rgba(225,29,72,0.8)] animate-pulse" />
                            <p className="text-white/80 font-black uppercase tracking-[0.3em] text-[10px]">Portal Corporativo v2.0</p>
                        </div>
                        <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                            Smart<br /><span className="text-ruby-600 drop-shadow-[0_0_20px_rgba(225,29,72,0.3)]">Stock</span>
                        </h1>
                        <div className="w-20 h-1.5 bg-ruby-600 mx-auto rounded-full shadow-[0_0_15px_rgba(225,29,72,0.5)]" />
                        <p className="text-white/40 text-lg font-bold tracking-tight max-w-sm mx-auto leading-relaxed">
                            Gestão inteligente de precisão para<br />
                            <span className="text-white/60">ativos e fluxos logísticos de alto valor.</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Login form side */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-24 bg-white relative">
                <div className="w-full max-w-sm space-y-12 animate-in slide-in-from-bottom-4 duration-700">
                    {/* Mobile Branding */}
                    <div className="md:hidden flex items-center gap-4 mb-16">
                        <div className="w-12 h-12 bg-navy-950 rounded-2xl flex items-center justify-center shadow-premium overflow-hidden relative">
                            <div className="absolute inset-0 bg-ruby-600/10" />
                            <Gem className="w-6 h-6 text-ruby-500" />
                        </div>
                        <h1 className="text-2xl font-black text-navy-950 tracking-tighter uppercase">S.G.E.</h1>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl font-black text-navy-900 tracking-tighter uppercase">Painel de Acesso</h2>
                        <p className="text-charcoal-400 text-sm font-bold tracking-tight">Identifique-se para gerenciar o inventário.</p>
                    </div>

                    {error && (
                        <div className="p-5 bg-ruby-50 border border-ruby-100 rounded-2xl flex items-start gap-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="p-2 bg-ruby-600 rounded-lg shadow-ruby-sm">
                                <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-ruby-900 uppercase tracking-[0.2em]">Erro de Logística</p>
                                <p className="text-sm text-ruby-800 font-bold">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2.5">
                            <Label>Credencial Corporativa</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ex: gestor@finderbit.com"
                                required
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label>Senha de Segurança</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="tracking-[0.2em]"
                            />
                        </div>

                        <Button type="submit" loading={loading} className="w-full h-14 bg-navy-950 hover:bg-black text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-premium">
                            Autenticar Conexão
                        </Button>
                    </form>

                    <footer className="pt-10 flex flex-col items-center gap-6 border-t border-charcoal-50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-px bg-charcoal-100" />
                            <p className="text-charcoal-300 text-[10px] font-black uppercase tracking-[0.4em]">Finderbit Technologies</p>
                            <div className="w-8 h-px bg-charcoal-100" />
                        </div>
                        <a
                            href="https://finderbit.com.br"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-6 py-2 rounded-full border border-charcoal-200 hover:border-ruby-500/30 hover:bg-ruby-500/5 transition-all duration-300 group shadow-sm bg-white"
                        >
                            <span className="text-charcoal-600 font-black text-[10px] group-hover:text-navy-900 transition-colors tracking-[0.2em] uppercase">Saber Mais</span>
                            <ExternalLink className="w-3 h-3 text-charcoal-400 group-hover:text-ruby-600 transition-colors" />
                        </a>
                    </footer>
                </div>
            </div>
        </div>
    );
}
