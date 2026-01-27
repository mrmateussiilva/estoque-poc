import { Card, Button } from '../components/UI';
import { Download, Calendar } from 'lucide-react';

export default function Reports() {
    const handleExportCSV = () => {
        alert('Funcionalidade de exportação CSV em desenvolvimento');
    };

    return (
        <div className="space-y-6">
            <Card className="p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Calendar className="w-5 h-5 text-ruby-700" />
                    <h3 className="text-xl font-bold text-charcoal-900">Movimentação por Período</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-charcoal-700 mb-2">Data Inicial</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border border-charcoal-50 rounded-ruby focus:outline-none focus:ring-2 focus:ring-ruby-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-charcoal-700 mb-2">Data Final</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border border-charcoal-50 rounded-ruby focus:outline-none focus:ring-2 focus:ring-ruby-700"
                        />
                    </div>
                </div>

                <Button onClick={handleExportCSV} className="w-full h-12">
                    <Download className="w-4 h-4" />
                    Exportar CSV
                </Button>
            </Card>

            <Card className="p-8">
                <h3 className="text-lg font-bold text-charcoal-900 mb-4">Resumo do Período</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-charcoal-50 rounded-ruby">
                        <p className="text-xs font-bold text-charcoal-400 uppercase mb-1">Total de Entradas</p>
                        <p className="text-2xl font-black text-charcoal-900">12</p>
                    </div>
                    <div className="p-4 bg-charcoal-50 rounded-ruby">
                        <p className="text-xs font-bold text-charcoal-400 uppercase mb-1">Itens Adicionados</p>
                        <p className="text-2xl font-black text-charcoal-900">487</p>
                    </div>
                    <div className="p-4 bg-charcoal-50 rounded-ruby">
                        <p className="text-xs font-bold text-charcoal-400 uppercase mb-1">Novos SKUs</p>
                        <p className="text-2xl font-black text-charcoal-900">8</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
