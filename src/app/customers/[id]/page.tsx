"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getActivities, getCustomer, getOpportunities } from "@/lib/api";
import type { Activity, ActivityType } from "@/types/activity";
import type { Customer } from "@/types/customer";
import type { Opportunity } from "@/types/opportunity";

const openStages = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION"];

const activityLabels: Record<ActivityType, string> = {
  CALL: "Ligação",
  MEETING: "Reunião",
  TASK: "Tarefa",
  FOLLOW_UP: "Acompanhamento",
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function date(value: string, withTime = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const [customerData, opportunityData, activityData] = await Promise.all([
          getCustomer(params.id),
          getOpportunities(),
          getActivities(),
        ]);
        setCustomer(customerData);
        setOpportunities(opportunityData.filter((item) => item.customerId === params.id));
        setActivities(activityData.filter((item) => item.customerId === params.id));
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Não foi possível carregar o cliente.");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.id]);

  const metrics = useMemo(() => {
    const open = opportunities.filter((item) => openStages.includes(item.stage));
    return {
      open: open.length,
      value: open.reduce((total, item) => total + item.value, 0),
      pending: activities.filter((item) => item.status === "PENDING").length,
    };
  }, [activities, opportunities]);

  return (
    <div className="min-h-screen bg-[#070a0d] text-white">
      <aside className="!hidden">
        <div className="flex h-20 items-center justify-center border-b border-white/10 lg:justify-start lg:px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 font-bold text-black">V</div>
          <div className="ml-3 hidden lg:block"><p className="font-semibold">Vivemed CRM</p><p className="text-xs text-white/40">Gestão comercial</p></div>
        </div>
        <nav className="space-y-2 p-3 lg:p-4">
          <Menu href="/" icon="◉" label="Visão geral" />
          <Menu href="/customers" icon="♙" label="Clientes" active />
          <Menu href="/opportunities" icon="◫" label="Oportunidades" />
          <Menu href="/activities" icon="✓" label="Atividades" />
        </nav>
      </aside>

      <main className="ml-20 min-h-screen lg:ml-64">
        <header className="border-b border-white/10 bg-[#090d12]/90 px-5 py-6 backdrop-blur-xl md:px-8">
          <Link href="/customers" className="text-sm text-emerald-400 hover:text-emerald-300">← Voltar para clientes</Link>
          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm text-white/45">Visão 360º do relacionamento</p>
              <h1 className="mt-1 text-3xl font-semibold">{loading ? "Carregando..." : customer?.name ?? "Cliente"}</h1>
              <p className="mt-2 text-sm text-white/45">{customer?.companyName || "Sem empresa informada"}</p>
            </div>
            <div className="flex gap-3">
              <Link href={`/activities?new=1&customerId=${params.id}`} className="rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5">Nova atividade</Link>
              <Link href={`/opportunities?new=1&customerId=${params.id}`} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400">Nova oportunidade</Link>
            </div>
          </div>
        </header>

        <section className="space-y-6 p-5 md:p-8">
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card label="Status" value={customer?.status === "INACTIVE" ? "Inativo" : "Ativo"} />
            <Card label="Negócios abertos" value={String(metrics.open)} />
            <Card label="Valor em negociação" value={money(metrics.value)} />
            <Card label="Atividades pendentes" value={String(metrics.pending)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-2xl border border-white/10 bg-[#0d1218] p-5">
              <h2 className="font-semibold">Dados do cliente</h2>
              <div className="mt-5 space-y-4 text-sm">
                <Info label="Empresa" value={customer?.companyName} />
                <Info label="Documento" value={customer?.document} />
                <Info label="E-mail" value={customer?.email} />
                <Info label="Telefone" value={customer?.phone} />
                <Info label="Cliente desde" value={customer ? date(customer.createdAt) : null} />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0d1218]">
              <div className="flex items-center justify-between border-b border-white/10 p-5"><div><h2 className="font-semibold">Oportunidades</h2><p className="mt-1 text-xs text-white/40">Negócios relacionados ao cliente</p></div><Link href="/opportunities" className="text-sm text-emerald-400">Ver funil →</Link></div>
              <div className="divide-y divide-white/10">
                {!loading && opportunities.length === 0 && <p className="p-8 text-center text-sm text-white/40">Nenhuma oportunidade relacionada.</p>}
                {opportunities.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 p-5"><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-white/40">{stage(item.stage)}</p></div><strong className="text-sm text-emerald-400">{money(item.value)}</strong></div>)}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-white/10 bg-[#0d1218]">
            <div className="flex items-center justify-between border-b border-white/10 p-5"><div><h2 className="font-semibold">Histórico de atividades</h2><p className="mt-1 text-xs text-white/40">Interações e próximos contatos</p></div><Link href="/activities" className="text-sm text-emerald-400">Ver atividades →</Link></div>
            <div className="divide-y divide-white/10">
              {!loading && activities.length === 0 && <p className="p-8 text-center text-sm text-white/40">Nenhuma atividade relacionada.</p>}
              {activities.map((item) => <div key={item.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-medium">{item.title || activityLabels[item.type]}</p><p className="mt-1 text-xs text-white/40">{activityLabels[item.type]} · {item.description || "Sem descrição"}</p></div><div className="sm:text-right"><p className="text-sm">{date(item.scheduledAt, item.hasTime)}</p><p className="mt-1 text-xs text-white/40">{status(item.status)}</p></div></div>)}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function Menu({ href, icon, label, active = false }: { href: string; icon: string; label: string; active?: boolean }) {
  return <Link href={href} title={label} className={`flex justify-center rounded-xl px-3 py-3 text-sm transition lg:justify-start lg:px-4 ${active ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "text-white/60 hover:bg-white/5 hover:text-white"}`}><span>{icon}</span><span className="ml-2 hidden lg:inline">{label}</span></Link>;
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#0d1218] p-5"><p className="text-sm text-white/45">{label}</p><p className="mt-3 truncate text-2xl font-semibold">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><p className="text-xs text-white/35">{label}</p><p className="mt-1 text-white/80">{value || "Não informado"}</p></div>;
}

function stage(value: string) {
  return ({ LEAD: "Novo lead", CONTACTED: "Contato realizado", PROPOSAL: "Proposta", NEGOTIATION: "Negociação", WON: "Ganho", LOST: "Perdido" } as Record<string, string>)[value] ?? value;
}

function status(value: string) {
  return ({ PENDING: "Pendente", COMPLETED: "Concluída", CANCELED: "Cancelada" } as Record<string, string>)[value] ?? value;
}
