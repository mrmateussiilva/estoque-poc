import { Card, Button, Input, Label } from '../components/UI';
import { Download, Calendar } from 'lucide-react';

export default function Reports() {
    const handleExportCSV = () => {
        alert('Funcionalidade de exportação CSV em desenvolvimento');
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4 border-b border-charcoal-100 pb-6">
                <div className="w-12 h-12 bg-charcoal-900 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-5 h-5 text-ruby-500" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-ruby-600 tracking-widest leading-none">Análises de Ciclo</p>
                    <h2 className="text-2xl font-bold text-charcoal-950 tracking-tight uppercase">Relatórios Digitais</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-5 p-8 space-y-6 bg-white">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-charcoal-950 uppercase tracking-widest">Filtros de Exportação</h3>
                        <p className="text-charcoal-500 text-xs font-medium">Defina o período para extração de dados.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-1.5">
                            <Label>Data Inicial</Label>
                            <Input type="date" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Data Final</Label>
                            <Input type="date" />
                        </div>
                    </div>

                    <Button onClick={handleExportCSV} className="w-full h-12 rounded-lg bg-charcoal-900 hover:bg-black text-sm font-bold uppercase tracking-widest active:scale-95 transition-all">
                        <Download className="w-4 h-4 mr-2 text-ruby-500" />
                        <span>Gerar Planilha .CSV</span>
                    </Button>
                </Card>

                <div className="lg:col-span-7 space-y-6">
                    <div className="p-8 bg-charcoal-900 rounded-xl relative overflow-hidden group">
                        <h3 className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-6">Consolidado do Período</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Entradas</p>
                                <p className="text-3xl font-bold text-white tracking-tighter">1.254</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Itens Saindo</p>
                                <p className="text-3xl font-bold text-ruby-500 tracking-tighter">892</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Posição SKU</p>
                                <p className="text-3xl font-bold text-white tracking-tighter">15</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-white border border-charcoal-300 rounded-xl flex items-center justify-between group hover:border-ruby-200 transition-all">
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-charcoal-950 uppercase tracking-tight">Inventário Geral</h4>
                            <p className="text-charcoal-500 text-xs font-medium">Snapshot de todas as posições atuais.</p>
                        </div>
                        <button className="w-10 h-10 bg-charcoal-50 rounded-lg flex items-center justify-center text-charcoal-400 group-hover:text-ruby-600 group-hover:bg-ruby-50 transition-all border border-charcoal-100">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-6 bg-white border border-charcoal-300 rounded-xl flex items-center justify-between group hover:border-ruby-200 transition-all">
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-charcoal-950 uppercase tracking-tight">Curva ABC de Ativos</h4>
                            <p className="text-charcoal-500 text-xs font-medium">Classificação estratégica por valor.</p>
                        </div>
                        <button className="w-10 h-10 bg-charcoal-50 rounded-lg flex items-center justify-center text-charcoal-400 group-hover:text-ruby-600 group-hover:bg-ruby-50 transition-all border border-charcoal-100">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
