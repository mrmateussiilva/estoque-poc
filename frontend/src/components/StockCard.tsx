import { Package, AlertTriangle, CheckCircle2, Edit2, ChevronRight } from 'lucide-react';
import { Card, Badge } from './UI';
import { type StockItem } from '../contexts/DataContext';
import { useSwipeable } from 'react-swipeable';
import { motion, useAnimation } from 'framer-motion';
import { useState } from 'react';

interface StockCardProps {
    item: StockItem;
    onEdit?: (item: StockItem) => void;
}

export default function StockCard({ item, onEdit }: StockCardProps) {
    const [swipeX, setSwipeX] = useState(0);
    const controls = useAnimation();

    const getStockStatus = () => {
        if (item.quantity <= 0) {
            return { label: 'Esgotado', color: 'bg-red-500', icon: AlertTriangle };
        }
        if (item.quantity < item.min_stock) {
            return { label: 'Baixo Estoque', color: 'bg-yellow-500', icon: AlertTriangle };
        }
        return { label: 'Em Estoque', color: 'bg-emerald-500', icon: CheckCircle2 };
    };

    const status = getStockStatus();
    const StatusIcon = status.icon;

    const handlers = useSwipeable({
        onSwiping: (e) => {
            if (e.dir === 'Left' || e.dir === 'Right') {
                setSwipeX(e.deltaX);
            }
        },
        onSwiped: (e) => {
            if (e.dir === 'Right' && e.deltaX > 100) {
                // Haptic feedback
                if ('vibrate' in navigator) navigator.vibrate(10);
                if (onEdit) onEdit(item);
            }
            setSwipeX(0);
            controls.start({ x: 0 });
        },
        trackMouse: true,
    });

    return (
        <div className="relative overflow-hidden rounded-2xl bg-charcoal-50">
            {/* Background Actions */}
            <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                <div className="flex items-center gap-2 text-ruby-600 font-black uppercase text-[10px] tracking-widest transition-opacity" style={{ opacity: swipeX > 20 ? 1 : 0 }}>
                    <Edit2 className="w-4 h-4" />
                    <span>Editar</span>
                </div>
                <div className="flex items-center gap-2 text-navy-600 font-black uppercase text-[10px] tracking-widest transition-opacity" style={{ opacity: swipeX < -20 ? 1 : 0 }}>
                    <span>Detalhes</span>
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>

            <motion.div
                {...handlers}
                animate={controls}
                style={{ x: swipeX }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="relative z-10"
            >
                <Card
                    className="p-4 md:p-6 hover:shadow-md transition-all border-none shadow-none"
                    onClick={() => {
                        if (Math.abs(swipeX) < 10) {
                            if (onEdit) onEdit(item);
                        }
                    }}
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-ruby-50 rounded-lg">
                                    <Package className="w-4 h-4 text-ruby-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-lg text-navy-900 truncate">{item.name}</h3>
                                    <p className="text-xs text-charcoal-500 font-bold uppercase tracking-wider mt-0.5">
                                        {item.code}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Badge className={`${status.color} text-white text-[10px] font-black px-2 py-1`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Quantidade</span>
                            <span className="text-xl font-black text-navy-900">{item.quantity.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Unidade</span>
                            <span className="text-sm font-bold text-charcoal-700">{item.unit || 'UN'}</span>
                        </div>
                        {item.sale_price > 0 && (
                            <div className="flex items-center justify-between pt-2 border-t border-charcoal-100 mt-2">
                                <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Preço Venda</span>
                                <span className="text-base font-black text-ruby-600">
                                    R$ {item.sale_price.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
