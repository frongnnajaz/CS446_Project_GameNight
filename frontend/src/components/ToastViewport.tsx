import { useToastStore } from '../store/toastStore'

export default function ToastViewport() {
  const toast = useToastStore((s) => s.toast)
  return (
    <div role="status" aria-live="polite" className="toast toast-bottom toast-center pointer-events-none z-50 p-4">
      {toast && (
        <div key={toast.key} className="alert toast-in border-base-300 bg-base-200 text-[15px] text-white shadow-xl shadow-black/40">
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  )
}
