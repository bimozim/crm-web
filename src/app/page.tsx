"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadingState from "@/components/LoadingState";

import { getActivities, getCustomers, getOpportunities } from "@/lib/api";
import type { Activity, ActivityType } from "@/types/activity";
import type { Customer } from "@/types/customer";
import type { Opportunity } from "@/types/opportunity";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatActivityDate(activity: Activity) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(activity.hasTime
      ? { hour: "2-digit", minute: "2-digit" }
      : {}),
  }).format(new Date(activity.scheduledAt));
}

const activityTypeLabels: Record<ActivityType, string> = {
  CALL: "Ligação",
  MEETING: "Reunião",
  TASK: "Tarefa",
  FOLLOW_UP: "Acompanhamento",
};

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTimer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const [customerPage, opportunityList, activityList] = await Promise.all([
          getCustomers(),
          getOpportunities(),
          getActivities(),
        ]);

        setCustomers(customerPage.content);
        setOpportunities(opportunityList);
        setActivities(activityList);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Não foi possível carregar o dashboard.",
        );
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  const metrics = useMemo(() => {
    const openStages = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION"];
    const openOpportunities = opportunities.filter((opportunity) =>
      openStages.includes(opportunity.stage),
    );
    const wonOpportunities = opportunities.filter(
      (opportunity) => opportunity.stage === "WON",
    );

    return {
      customers: customers.length,
      activeCustomers: customers.filter(
        (customer) => customer.status === "ACTIVE",
      ).length,
      openDeals: openOpportunities.length,
      pipelineValue: openOpportunities.reduce(
        (total, opportunity) => total + opportunity.value,
        0,
      ),
      wonValue: wonOpportunities.reduce(
        (total, opportunity) => total + opportunity.value,
        0,
      ),
      pendingActivities: activities.filter(
        (activity) => activity.status === "PENDING",
      ).length,
    };
  }, [activities, customers, opportunities]);

  const recentOpportunities = opportunities.slice(0, 5);
  const upcomingActivities = activities
    .filter((activity) => activity.status === "PENDING")
    .sort(
      (first, second) =>
        new Date(first.scheduledAt).getTime() -
        new Date(second.scheduledAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#070a0d] text-white">
      <aside className="!hidden">
        <div className="flex h-20 items-center justify-center border-b border-white/10 lg:justify-start lg:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 font-bold text-black">
            V
          </div>
          <div className="ml-3 hidden lg:block">
            <p className="font-semibold">Vivemed CRM</p>
            <p className="text-xs text-white/40">Gestão comercial</p>
          </div>
        </div>

        <nav className="space-y-2 p-3 lg:p-4">
          <Link
            href="/"
            className="flex justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm font-medium text-emerald-400 lg:justify-start lg:px-4"
          >
            <span>◉</span><span className="ml-2 hidden lg:inline">Visão geral</span>
          </Link>
          <Link
            href="/customers"
            className="flex justify-center rounded-xl px-3 py-3 text-sm text-white/60 transition hover:bg-white/5 hover:text-white lg:justify-start lg:px-4"
          >
            <span>♙</span><span className="ml-2 hidden lg:inline">Clientes</span>
          </Link>
          <Link
            href="/opportunities"
            className="flex justify-center rounded-xl px-3 py-3 text-sm text-white/60 transition hover:bg-white/5 hover:text-white lg:justify-start lg:px-4"
          >
            <span>◫</span><span className="ml-2 hidden lg:inline">Oportunidades</span>
          </Link>
          <Link
            href="/activities"
            className="flex justify-center rounded-xl px-3 py-3 text-sm text-white/60 transition hover:bg-white/5 hover:text-white lg:justify-start lg:px-4"
          >
            <span>✓</span><span className="ml-2 hidden lg:inline">Atividades</span>
          </Link>
        </nav>

        <div className="absolute bottom-5 left-4 right-4 hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:block">
          <p className="text-xs text-white/40">Ambiente</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm">Sistema conectado</span>
          </div>
        </div>
      </aside>

      <main className="ml-20 min-h-screen lg:ml-64">
        <header className="border-b border-white/10 bg-[#090d12]/90 px-5 py-6 backdrop-blur-xl md:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Central de resultados
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                Visão geral comercial
              </h1>
              <p className="mt-1 text-sm text-white/45">
                Acompanhe clientes, oportunidades e resultados em um só lugar.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/customers"
                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:bg-white/5"
              >
                Ver clientes
              </Link>
              <Link
                href="/opportunities"
                className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Abrir funil
              </Link>
            </div>
          </div>
        </header>

        <section className="p-5 md:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Clientes ativos" value={loading ? "—" : String(metrics.activeCustomers)} detail="Relacionamentos ativos" />
            <MetricCard label="Negócios abertos" value={loading ? "—" : String(metrics.openDeals)} detail="Em andamento" />
            <MetricCard label="Valor do pipeline" value={loading ? "—" : <AnimatedMoney value={metrics.pipelineValue} />} detail="Potencial comercial" />
            <MetricCard label="Atividades pendentes" value={loading ? "—" : String(metrics.pendingActivities)} detail="Próximas ações" />
            <MetricCard label="Receita conquistada" value={loading ? "—" : <AnimatedMoney value={metrics.wonValue} />} detail="Oportunidades ganhas" highlight />
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-[#0d1218]">
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <h2 className="font-semibold">Oportunidades recentes</h2>
                  <p className="mt-1 text-xs text-white/40">
                    Últimos negócios presentes no funil
                  </p>
                </div>
                <Link
                  href="/opportunities"
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  Ver funil →
                </Link>
              </div>

              <div className="divide-y divide-white/10">
                {loading && (
                  <LoadingState compact label="Carregando oportunidades..." />
                )}

                {!loading && recentOpportunities.length === 0 && (
                  <p className="p-8 text-center text-sm text-white/40">
                    Nenhuma oportunidade cadastrada.
                  </p>
                )}

                {recentOpportunities.map((opportunity) => (
                  <div
                    key={opportunity.id}
                    className="flex flex-col justify-between gap-3 p-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium">{opportunity.title}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {opportunity.customerName}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm font-semibold text-emerald-400">
                        {formatMoney(opportunity.value)}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {stageLabel(opportunity.stage)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1218]">
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <h2 className="font-semibold">Próximas atividades</h2>
                  <p className="mt-1 text-xs text-white/40">Sua agenda comercial</p>
                </div>
                <Link href="/activities" className="text-sm text-emerald-400 hover:text-emerald-300">
                  Ver agenda →
                </Link>
              </div>

              <div className="divide-y divide-white/10">
                {loading && <LoadingState compact label="Carregando atividades..." />}
                {!loading && upcomingActivities.length === 0 && (
                  <p className="p-8 text-center text-sm text-white/40">Nenhuma atividade pendente.</p>
                )}
                {upcomingActivities.map((activity) => (
                  <div key={activity.id} className="p-5 transition hover:bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {activity.title?.trim() || activityTypeLabels[activity.type]}
                        </p>
                        <p className="mt-1 truncate text-xs text-white/40">
                          {activity.customerName || "Sem cliente relacionado"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                        {formatActivityDate(activity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <QuickLink href="/customers" icon="♙" title="Gerenciar clientes" description="Cadastre, edite e consulte sua carteira." />
            <QuickLink href="/opportunities" icon="◫" title="Acompanhar oportunidades" description="Visualize e mova negócios no funil." />
            <QuickLink href="/activities" icon="✓" title="Organizar atividades" description="Planeje ligações, reuniões e tarefas." />
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1218] p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p
        className={`mt-3 truncate text-2xl font-semibold ${
          highlight ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-white/35">{detail}</p>
    </div>
  );
}

function AnimatedMoney({ value }: { value: number }) {
  const [displayedValue, setDisplayedValue] = useState(0);

  useEffect(() => {
    const duration = 2500;
    const startedAt = performance.now();
    let frame = 0;

    const animate = (time: number) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedValue(value * eased);
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{formatMoney(displayedValue)}</>;
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-emerald-500/30 hover:bg-emerald-500/[0.05]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
        {icon}
      </span>
      <span>
        <strong className="block text-sm font-medium">{title}</strong>
        <span className="mt-1 block text-xs leading-5 text-white/40">
          {description}
        </span>
      </span>
    </Link>
  );
}

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    LEAD: "Novo lead",
    CONTACTED: "Contato realizado",
    PROPOSAL: "Proposta",
    NEGOTIATION: "Negociação",
    WON: "Ganho",
    LOST: "Perdido",
  };

  return labels[stage] ?? stage;
}
