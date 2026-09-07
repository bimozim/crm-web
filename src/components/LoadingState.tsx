import { LoaderCircle } from "lucide-react";

export default function LoadingState({ label = "Carregando informações...", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-sm text-white/40 ${compact ? "py-8" : "min-h-52"}`} role="status" aria-live="polite">
      <LoaderCircle className="animate-spin text-emerald-400" size={20} />
      <span>{label}</span>
    </div>
  );
}
