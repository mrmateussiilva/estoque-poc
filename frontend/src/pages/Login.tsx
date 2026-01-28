import { useState } from 'react';
import { LogIn, AlertCircle } from 'lucide-react';
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
        <div className="min-h-screen bg-charcoal-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex w-16 h-16 bg-ruby-700 rounded-ruby items-center justify-center mb-4">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">S.G.E.</h1>
                    <p className="text-charcoal-400">Sistema de Gestão de Estoque</p>
                </div>

                <div className="bg-white rounded-ruby shadow-ruby p-8">
                    <h2 className="text-2xl font-bold text-charcoal-900 mb-6">Login</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-ruby-50 border-l-4 border-ruby-700 rounded-ruby flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-ruby-700 flex-shrink-0" />
                            <span className="text-sm text-ruby-900">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-charcoal-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-charcoal-50 rounded-ruby focus:outline-none focus:ring-2 focus:ring-ruby-700"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-charcoal-700 mb-2">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-charcoal-50 rounded-ruby focus:outline-none focus:ring-2 focus:ring-ruby-700"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <Button type="submit" loading={loading} className="w-full h-12 mt-6">
                            Entrar
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-charcoal-50">
                        <p className="text-xs text-charcoal-400 text-center">
                            Credenciais padrão: admin@sge.com / admin123
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
