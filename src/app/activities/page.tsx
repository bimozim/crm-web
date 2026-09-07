"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import LoadingState from "@/components/LoadingState";

import {
  ApiRequestError,
  cancelActivity,
  completeActivity,
  createActivity,
  getActivities,
  getCustomers,
  getOpportunities,
  reopenActivity,
} from "@/lib/api";
import type {
  Activity,
  ActivityStatus,
  ActivityType,
  CreateActivityInput,
} from "@/types/activity";
import type { Customer } from "@/types/customer";
import type { Opportunity } from "@/types/opportunity";

const initialForm: CreateActivityInput = {
  customerId: null,
  opportunityId: null,
  title: "",
  description: "",
  type: "TASK",
  scheduledAt: "",
  hasTime: false,
};

const typeLabels: Record<ActivityType, string> = {
  CALL: "Ligação",
  MEETING: "Reunião",
  TASK: "Tarefa",
  FOLLOW_UP: "Acompanhamento",
};

const typeIcons: Record<ActivityType, string> = {
  CALL: "☎",
  MEETING: "◉",
  TASK: "✓",
  FOLLOW_UP: "↻",
};

const statusLabels: Record<ActivityStatus, string> = {
  PENDING: "Pendente",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
};

function formatDate(value: string, hasTime: boolean) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(hasTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function ActivitiesPageContent() {
  const searchParams = useSearchParams();
  const requestedCustomerId = searchParams.get("customerId");
  const shouldOpenNewActivity = searchParams.get("new") === "1";
  const [activities, setActivities] = useState<Activity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [form, setForm] = useState<CreateActivityInput>(() => ({
    ...initialForm,
    customerId: requestedCustomerId,
  }));
  const [activityDate, setActivityDate] = useState("");
  const [activityTime, setActivityTime] = useState("");
  const [filter, setFilter] = useState<ActivityStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(shouldOpenNewActivity);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTimer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const [activityList, customerPage, opportunityList] =
          await Promise.all([
            getActivities(),
            getCustomers(),
            getOpportunities(),
          ]);

        setActivities(activityList);
        setCustomers(
          customerPage.content.filter(
            (customer) => customer.status === "ACTIVE",
          ),
        );
        setOpportunities(opportunityList);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Não foi possível carregar as atividades.",
        );
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  const visibleActivities = useMemo(() => {
    if (filter === "ALL") {
      return activities;
    }

    return activities.filter((activity) => activity.status === filter);
  }, [activities, filter]);

  const metrics = useMemo(
    () => ({
      total: activities.length,
      pending: activities.filter(
        (activity) => activity.status === "PENDING",
      ).length,
      completed: activities.filter(
        (activity) => activity.status === "COMPLETED",
      ).length,
      canceled: activities.filter(
        (activity) => activity.status === "CANCELED",
      ).length,
    }),
    [activities],
  );

  const availableOpportunities = useMemo(
    () =>
      opportunities.filter(
        (opportunity) => opportunity.customerId === form.customerId,
      ),
    [form.customerId, opportunities],
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activityDate) {
      setError("Informe a data da atividade.");
      return;
    }

    if (
      activityTime &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(activityTime)
    ) {
      setError("Informe um horário válido no formato HH:mm.");
      return;
    }

    const scheduledDate = new Date(
      `${activityDate}T${activityTime || "23:59"}:00`,
    );

    if (Number.isNaN(scheduledDate.getTime())) {
      setError("A data ou o horário informado não é válido.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const created = await createActivity({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        scheduledAt: scheduledDate.toISOString(),
        hasTime: Boolean(activityTime),
      });

      setActivities((current) =>
        [...current, created].sort(
          (first, second) =>
            new Date(first.scheduledAt).getTime() -
            new Date(second.scheduledAt).getTime(),
        ),
      );
      setForm(initialForm);
      setActivityDate("");
      setActivityTime("");
      setModalOpen(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiRequestError
          ? caughtError.message
          : "Não foi possível criar a atividade.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    id: string,
    action: "complete" | "cancel" | "reopen",
  ) {
    try {
      setUpdatingId(id);
      setError("");

      const updated =
        action === "complete"
          ? await completeActivity(id)
          : action === "cancel"
            ? await cancelActivity(id)
            : await reopenActivity(id);

      setActivities((current) =>
        current.map((activity) =>
          activity.id === updated.id ? updated : activity,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível atualizar a atividade.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

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
          <MenuLink href="/" icon="◉" label="Visão geral" />
          <MenuLink href="/customers" icon="♙" label="Clientes" />
          <MenuLink href="/opportunities" icon="◫" label="Oportunidades" />
          <MenuLink href="/activities" icon="✓" label="Atividades" active />
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
                Agenda comercial
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Atividades</h1>
              <p className="mt-1 text-sm text-white/45">
                Organize ligações, reuniões, tarefas e acompanhamentos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setModalOpen(true);
              }}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              + Nova atividade
            </button>
          </div>
        </header>

        <section className="p-5 md:p-8">
          {error && (
            <div className="mb-5 flex justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total" value={metrics.total} />
            <MetricCard label="Pendentes" value={metrics.pending} color="amber" />
            <MetricCard
              label="Concluídas"
              value={metrics.completed}
              color="emerald"
            />
            <MetricCard
              label="Canceladas"
              value={metrics.canceled}
              color="red"
            />
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-[#0d1218]">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 md:flex-row md:items-center">
              <div>
                <h2 className="font-semibold">Agenda de atividades</h2>
                <p className="mt-1 text-xs text-white/40">
                  Compromissos ordenados pela data agendada
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["ALL", "PENDING", "COMPLETED", "CANCELED"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFilter(status)}
                      className={`rounded-lg px-3 py-2 text-xs transition ${
                        filter === status
                          ? "bg-emerald-500 text-black"
                          : "bg-white/5 text-white/50 hover:text-white"
                      }`}
                    >
                      {status === "ALL" ? "Todas" : statusLabels[status]}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {loading && (
                <LoadingState compact label="Carregando atividades..." />
              )}

              {!loading && visibleActivities.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-3xl text-white/20">✓</p>
                  <p className="mt-3 text-sm text-white/45">
                    Nenhuma atividade encontrada.
                  </p>
                </div>
              )}

              {visibleActivities.map((activity) => (
                <article
                  key={activity.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.02] xl:flex-row xl:items-center"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-lg text-emerald-400">
                    {typeIcons[activity.type]}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">
                        {activity.title || typeLabels[activity.type]}
                      </h3>
                      <StatusBadge status={activity.status} />
                    </div>
                    <p className="mt-1 text-sm text-white/45">
                      {activity.customerName ?? "Sem cliente relacionado"}
                      {activity.opportunityTitle
                        ? ` • ${activity.opportunityTitle}`
                        : ""}
                    </p>
                    {activity.description && (
                      <p className="mt-2 line-clamp-1 text-xs text-white/35">
                        {activity.description}
                      </p>
                    )}
                  </div>

                  <div className="w-44 shrink-0">
                    <p className="text-xs text-white/35">
                      {typeLabels[activity.type]}
                    </p>
                    <p className="mt-1 text-sm">
                      {formatDate(activity.scheduledAt, activity.hasTime)}
                    </p>
                  </div>

                  <div className="flex min-w-48 justify-end gap-2">
                    {activity.status === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          disabled={updatingId === activity.id}
                          onClick={() => void changeStatus(activity.id, "cancel")}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-40"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === activity.id}
                          onClick={() =>
                            void changeStatus(activity.id, "complete")
                          }
                          className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
                        >
                          Concluir
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={updatingId === activity.id}
                        onClick={() => void changeStatus(activity.id, "reopen")}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-40"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#10151c]">
            <div className="flex justify-between border-b border-white/10 p-6">
              <div>
                <h2 className="text-xl font-semibold">Nova atividade</h2>
                <p className="mt-1 text-sm text-white/45">
                  Programe a próxima ação comercial.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-2xl text-white/40 hover:text-white"
              >
                ×
              </button>
            </div>

            <form
              noValidate
              onSubmit={handleCreate}
              className="space-y-5 p-6"
            >
              <Field label="Cliente">
                <select
                  value={form.customerId ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customerId: event.target.value || null,
                      opportunityId: null,
                    }))
                  }
                  className="input"
                >
                  <option value="">Selecione um cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Oportunidade relacionada">
                <select
                  value={form.opportunityId ?? ""}
                  disabled={!form.customerId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      opportunityId: event.target.value || null,
                    }))
                  }
                  className="input disabled:opacity-40"
                >
                  <option value="">Nenhuma oportunidade</option>
                  {availableOpportunities.map((opportunity) => (
                    <option key={opportunity.id} value={opportunity.id}>
                      {opportunity.title}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tipo">
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value as ActivityType,
                      }))
                    }
                    className="input"
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Data">
                  <input
                    type="date"
                    value={activityDate}
                    onChange={(event) => setActivityDate(event.target.value)}
                    className="input"
                  />
                </Field>

                <Field label="Horário">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="HH:mm"
                    value={activityTime}
                    onChange={(event) =>
                      setActivityTime(formatTimeInput(event.target.value))
                    }
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Título">
                <input
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Retornar contato sobre a proposta"
                  className="input"
                />
              </Field>

              <Field label="Descrição">
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Detalhes importantes da atividade..."
                  className="input resize-none"
                />
              </Field>

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
                >
                  {saving ? "Salvando..." : "Criar atividade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          background: #080c11;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 150ms;
        }
        .input:focus {
          border-color: #10b981;
        }
        .input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<LoadingState label="Carregando atividades..." />}>
      <ActivitiesPageContent />
    </Suspense>
  );
}

function MenuLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex justify-center rounded-xl px-3 py-3 text-sm transition lg:justify-start lg:px-4 ${
        active
          ? "border border-emerald-500/20 bg-emerald-500/10 font-medium text-emerald-400"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span>{icon}</span><span className="ml-2 hidden lg:inline">{label}</span>
    </Link>
  );
}

function MetricCard({
  label,
  value,
  color = "white",
}: {
  label: string;
  value: number;
  color?: "white" | "amber" | "emerald" | "red";
}) {
  const colors = {
    white: "text-white",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    red: "text-red-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1218] p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${colors[color]}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  const colors: Record<ActivityStatus, string> = {
    PENDING: "bg-amber-500/10 text-amber-300",
    COMPLETED: "bg-emerald-500/10 text-emerald-300",
    CANCELED: "bg-red-500/10 text-red-300",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-[10px] ${colors[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/65">{label}</span>
      {children}
    </label>
  );
}
