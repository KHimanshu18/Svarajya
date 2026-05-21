interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/50 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-2 bg-red-500 rounded-xl text-white font-semibold">Unlink</button>
                </div>
            </div>
        </div>
    );
}
