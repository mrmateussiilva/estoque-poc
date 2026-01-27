import { Card } from '../components/UI';
import { CheckCircle } from 'lucide-react';

const mockNFes = [
    { id: 1, date: '2026-01-27', status: 'Processada', items: 5 },
    { id: 2, date: '2026-01-26', status: 'Processada', items: 3 },
    { id: 3, date: '2026-01-25', status: 'Processada', items: 8 },
    { id: 4, date: '2026-01-24', status: 'Processada', items: 2 },
    { id: 5, date: '2026-01-23', status: 'Processada', items: 6 },
];

export default function NFe() {
    return (
        <Card>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-charcoal-50">
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">ID</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Data</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Itens</th>
                        <th className="px-8 py-5 text-[10px] font-black text-charcoal-400 uppercase tracking-[0.2em]">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-50/50">
                    {mockNFes.map((nfe) => (
                        <tr key={nfe.id} className="hover:bg-charcoal-50/40 transition-colors">
                            <td className="px-8 py-5 text-sm font-mono text-ruby-700/70">#{nfe.id}</td>
                            <td className="px-8 py-5 text-sm font-bold text-charcoal-900">{nfe.date}</td>
                            <td className="px-8 py-5 text-sm text-charcoal-700">{nfe.items} produtos</td>
                            <td className="px-8 py-5">
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-ruby text-xs font-bold">
                                    <CheckCircle className="w-3 h-3" />
                                    {nfe.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}
