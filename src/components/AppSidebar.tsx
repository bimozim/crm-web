"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  KanbanSquare,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

const MIN_WIDTH = 72;
const DEFAULT_WIDTH = 256;
const MAX_WIDTH = 320;

const items = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/opportunities", label: "Oportunidades", icon: KanbanSquare },
  { href: "/activities", label: "Atividades", icon: Activity },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const compact = width < 176;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedWidth = Number(window.localStorage.getItem("vivemed-sidebar-width"));
      const desktopWidth = savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH ? savedWidth : DEFAULT_WIDTH;
      const initialWidth = window.innerWidth <= 720 ? MIN_WIDTH : desktopWidth;
      setWidth(initialWidth);
      document.documentElement.style.setProperty("--sidebar-width", `${initialWidth}px`);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function updateWidth(nextWidth: number) {
    const safeWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, nextWidth));
    setWidth(safeWidth);
    document.documentElement.style.setProperty("--sidebar-width", `${safeWidth}px`);
  }

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    setResizing(true);
    document.documentElement.classList.add("sidebar-resizing");
    const resize = (moveEvent: PointerEvent) => updateWidth(moveEvent.clientX);
    const stop = () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stop);
      setResizing(false);
      document.documentElement.classList.remove("sidebar-resizing");
      const currentWidth = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width");
      window.localStorage.setItem("vivemed-sidebar-width", String(parseInt(currentWidth, 10)));
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stop);
  }

  function toggle() {
    const nextWidth = compact ? DEFAULT_WIDTH : MIN_WIDTH;
    updateWidth(nextWidth);
    window.localStorage.setItem("vivemed-sidebar-width", String(nextWidth));
  }

  return (
    <aside
      data-app-sidebar
      style={{ width: "var(--sidebar-width)" }}
      className={`fixed inset-y-0 left-0 z-50 flex max-w-[82vw] flex-col overflow-visible bg-[#0b1018]/95 shadow-[18px_0_50px_rgba(0,0,0,0.22)] backdrop-blur-xl will-change-[width] after:pointer-events-none after:absolute after:inset-y-8 after:right-0 after:w-px after:bg-gradient-to-b after:from-transparent after:via-white/10 after:to-transparent ${resizing ? "transition-none" : "transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
    >
      <div className={`relative flex h-24 shrink-0 items-center overflow-hidden after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent ${compact ? "flex-col justify-center gap-1" : "gap-3 px-5"}`}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-emerald-500 text-[#052218] shadow-[0_8px_25px_rgba(52,211,153,0.2)]">
          <HeartPulse size={21} strokeWidth={2.2} />
        </div>
        <div className={compact ? "text-center" : "min-w-0"}>
          <strong className={`block font-semibold tracking-tight ${compact ? "text-[11px]" : "text-base"}`}>Vivemed</strong>
          {!compact && <span className="text-xs text-white/35">CRM comercial</span>}
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-hidden px-3 py-6">
        <button
          type="button"
          onClick={toggle}
          className={`mb-4 flex h-10 w-full items-center rounded-xl text-white/35 transition hover:bg-white/5 hover:text-emerald-300 ${compact ? "justify-center" : "gap-3 px-3"}`}
          title={compact ? "Abrir menu" : "Recolher menu"}
          aria-label={compact ? "Abrir menu lateral" : "Recolher menu lateral"}
        >
          {compact ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span className={`overflow-hidden whitespace-nowrap text-xs transition-all duration-300 ${compact ? "max-w-0 opacity-0" : "max-w-32 opacity-100"}`}>
            Recolher menu
          </span>
        </button>

        {!compact && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">Navegação</p>}
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={compact ? label : undefined}
              className={`group relative flex h-11 items-center rounded-xl transition ${compact ? "justify-center" : "gap-3 px-3"} ${active ? "bg-emerald-400/[0.12] text-emerald-300" : "text-white/48 hover:bg-white/[0.045] hover:text-white/90"}`}
            >
              {active && <span className="absolute -left-3 h-5 w-0.5 rounded-r-full bg-emerald-400" />}
              <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
              <span className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 ${compact ? "max-w-0 opacity-0" : "max-w-40 opacity-100"}`}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="overflow-hidden px-3 pb-5">
        {!compact && (
          <div className="mb-3 rounded-xl bg-white/[0.025] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/25">Ambiente</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-white/55"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />Sistema conectado</div>
          </div>
        )}
      </div>

      <div onPointerDown={startResize} className="absolute inset-y-0 -right-1 w-2 cursor-col-resize touch-none hover:bg-emerald-400/20" title="Arraste para redimensionar" />
    </aside>
  );
}
