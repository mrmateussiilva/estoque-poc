import { Modal, Button } from './UI';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    loading = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
    };

    const variantStyles = {
        danger: 'text-ruby-600 bg-ruby-50 border-ruby-200',
        warning: 'text-amber-600 bg-amber-50 border-amber-200',
        info: 'text-blue-600 bg-blue-50 border-blue-200'
    };

    return (
        <Modal onClose={onClose} title={title}>
            <div className="p-6 space-y-6">
                <div className={`flex items-start gap-4 p-4 rounded-xl border ${variantStyles[variant]}`}>
                    <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium leading-relaxed">{message}</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-charcoal-100">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'primary' : 'secondary'}
                        onClick={handleConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
