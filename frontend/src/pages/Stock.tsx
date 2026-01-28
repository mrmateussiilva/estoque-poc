import { useState, useEffect } from 'react';
import { Card } from '../components/UI';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export default function Stock() {
    const [stock, setStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE_URL}/stock`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (!response.ok) throw new Error('Falha na comunicação');
            const data = await response.json();
            setStock(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStock(); }, []);

    return (
        <Card>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-charcoal-50">
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">SKU</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Descrição</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em] text-right">Quantidade</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-50/50">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                <td className="px-8 py-6"><div className="h-3 bg-charcoal-50 rounded w-16" /></td>
                                <td className="px-8 py-6"><div className="h-3 bg-charcoal-50 rounded w-48" /></td>
                                <td className="px-8 py-6 text-right"><div className="h-3 bg-charcoal-50 rounded w-10 ml-auto" /></td>
                            </tr>
                        ))
                    ) : stock && stock.length > 0 ? (
                        stock.map((item) => (
                            <tr key={item.code} className="hover:bg-charcoal-50/40 transition-colors">
                                <td className="px-8 py-5 text-sm font-mono text-ruby-700/70">{item.code}</td>
                                <td className="px-8 py-5 text-sm font-bold text-charcoal-900">{item.name}</td>
                                <td className="px-8 py-5 text-sm font-black text-charcoal-700 text-right">{item.quantity}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={3} className="px-8 py-20 text-center text-sm text-charcoal-400 italic">
                                Nenhum produto cadastrado
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </Card>
    );
}
