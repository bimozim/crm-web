"use client";

import Link from "next/link";
import { BadgeDollarSign, Building2, CalendarDays, Eye, GripVertical, Pencil, StickyNote, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import LoadingState from "@/components/LoadingState";
import {
    DragEvent,
    FormEvent,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ApiRequestError,
    createOpportunity,
    getCustomers,
    getOpportunities,
    moveOpportunity,
    updateOpportunity,
} from "@/lib/api";
import type { Customer } from "@/types/customer";
import type {
    CreateOpportunityInput,
    Opportunity,
    OpportunityStage,
} from "@/types/opportunity";

const stages: Array<{
    value: OpportunityStage;
    label: string;
    color: string;
}> = [
    { value: "LEAD", label: "Novos leads", color: "#3b82f6" },
    { value: "CONTACTED", label: "Contato realizado", color: "#8b5cf6" },
    { value: "PROPOSAL", label: "Proposta", color: "#f59e0b" },
    { value: "NEGOTIATION", label: "Negociação", color: "#f97316" },
    { value: "WON", label: "Ganho", color: "#22c55e" },
    { value: "LOST", label: "Perdido", color: "#ef4444" },
];

const initialForm: CreateOpportunityInput = {
    customerId: "",
    title: "",
    value: 0,
    expectedCloseDate: null,
    notes: "",
};

function formatMoney(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

function formatDate(value: string | null) {
    if (!value) {
        return "Sem previsão";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatDocument(value: string | null) {
    if (!value) return "Não informado";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    return value;
}

function OpportunitiesPageContent() {
    const searchParams = useSearchParams();
    const requestedCustomerId = searchParams.get("customerId") ?? "";
    const shouldOpenNewOpportunity = searchParams.get("new") === "1";
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [form, setForm] = useState<CreateOpportunityInput>(() => ({
        ...initialForm,
        customerId: requestedCustomerId,
    }));
    const [estimatedValue, setEstimatedValue] = useState("0");
    const [estimatedValueError, setEstimatedValueError] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [movingId, setMovingId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<OpportunityStage | null>(null);
    const [modalOpen, setModalOpen] = useState(shouldOpenNewOpportunity);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [opportunityData, customerData] = await Promise.all([
                getOpportunities(),
                getCustomers(),
            ]);

            setOpportunities(opportunityData);
            setCustomers(
                customerData.content.filter(
                    (customer) => customer.status === "ACTIVE",
                ),
            );
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Não foi possível carregar o funil.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadTimer = window.setTimeout(() => {
            void loadData();
        }, 0);

        return () => window.clearTimeout(loadTimer);
    }, [loadData]);

    const metrics = useMemo(() => {
        const openStages: OpportunityStage[] = [
            "LEAD",
            "CONTACTED",
            "PROPOSAL",
            "NEGOTIATION",
        ];

        const openOpportunities = opportunities.filter((opportunity) =>
            openStages.includes(opportunity.stage),
        );

        const wonOpportunities = opportunities.filter(
            (opportunity) => opportunity.stage === "WON",
        );

        return {
            total: opportunities.length,
            open: openOpportunities.length,
            pipelineValue: openOpportunities.reduce(
                (total, opportunity) => total + opportunity.value,
                0,
            ),
            wonValue: wonOpportunities.reduce(
                (total, opportunity) => total + opportunity.value,
                0,
            ),
        };
    }, [opportunities]);

    const selectedCustomer = selectedOpportunity
        ? customers.find((customer) => customer.id === selectedOpportunity.customerId) ?? null
        : null;

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!form.customerId) {
            setError("Selecione um cliente.");
            return;
        }

        if (!form.title.trim()) {
            setError("Informe o título da oportunidade.");
            return;
        }

        if (estimatedValue.trim() === "") {
            setEstimatedValueError(true);
            setError("Digite um valor.");
            return;
        }

        const parsedValue = Number(estimatedValue);

        if (!Number.isFinite(parsedValue) || parsedValue < 0) {
            setEstimatedValueError(true);
            setError("Digite um valor válido.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");
            const isEditing = Boolean(editingId);

            const saved = await (editingId ? updateOpportunity(editingId, {
                ...form,
                title: form.title.trim(),
                value: parsedValue,
                expectedCloseDate: form.expectedCloseDate || null,
                notes: form.notes.trim(),
            }) : createOpportunity({
                ...form,
                title: form.title.trim(),
                value: parsedValue,
                expectedCloseDate: form.expectedCloseDate || null,
                notes: form.notes.trim(),
            }));

            setOpportunities((current) => editingId
                ? current.map((item) => item.id === editingId ? saved : item)
                : [saved, ...current]);
            setForm(initialForm);
            setEstimatedValue("0");
            setEstimatedValueError(false);
            setModalOpen(false);
            setEditingId(null);
            setSuccess(isEditing ? "Oportunidade atualizada com sucesso." : "Oportunidade criada com sucesso.");
        } catch (caughtError) {
            if (caughtError instanceof ApiRequestError) {
                setError(caughtError.message);
            } else {
                setError(editingId ? "Não foi possível atualizar a oportunidade." : "Não foi possível criar a oportunidade.");
            }
        } finally {
            setSaving(false);
        }
    }

    function closeFormModal() {
        setModalOpen(false);
        setEditingId(null);
        setError("");
        setEstimatedValueError(false);
    }

    async function handleMove(
        opportunityId: string,
        newStage: OpportunityStage,
    ) {
        const currentOpportunity = opportunities.find(
            (opportunity) => opportunity.id === opportunityId,
        );

        if (!currentOpportunity || currentOpportunity.stage === newStage) {
            setDraggedId(null);
            return;
        }

        const previousOpportunities = opportunities;

        setOpportunities((current) =>
            current.map((opportunity) =>
                opportunity.id === opportunityId
                    ? { ...opportunity, stage: newStage }
                    : opportunity,
            ),
        );

        try {
            setMovingId(opportunityId);
            setError("");

            const updated = await moveOpportunity(
                opportunityId,
                newStage,
            );

            setOpportunities((current) =>
                current.map((opportunity) =>
                    opportunity.id === opportunityId
                        ? updated
                        : opportunity,
                ),
            );
        } catch (caughtError) {
            setOpportunities(previousOpportunities);
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Não foi possível mover a oportunidade.",
            );
        } finally {
            setMovingId(null);
            setDraggedId(null);
        }
    }

    function handleDrop(
        event: DragEvent<HTMLDivElement>,
        stage: OpportunityStage,
    ) {
        event.preventDefault();
        setDragOverStage(null);

        if (draggedId) {
            void handleMove(draggedId, stage);
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
                        <p className="text-xs text-white/40">
                            Gestão comercial
                        </p>
                    </div>
                </div>

                <nav className="space-y-2 p-3 lg:p-4">
                    <Link
                        href="/"
                        className="flex justify-center rounded-xl px-3 py-3 text-sm text-white/60 transition hover:bg-white/5 hover:text-white lg:justify-start lg:px-4"
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
                        className="flex justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm font-medium text-emerald-400 lg:justify-start lg:px-4"
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
                <header className="border-b border-white/10 bg-[#090d12]/90 px-4 py-5 backdrop-blur-xl sm:px-6 md:px-8">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <p className="text-sm font-medium text-emerald-400">
                                Pipeline comercial
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold">
                                Funil de oportunidades
                            </h1>
                            <p className="mt-1 text-sm text-white/45">
                                Arraste os negócios entre as etapas do funil.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setError("");
                                setEditingId(null);
                                setForm(initialForm);
                                setEstimatedValue("0");
                                setModalOpen(true);
                            }}
                            className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 md:w-auto"
                        >
                            + Nova oportunidade
                        </button>
                    </div>
                </header>

                <section className="min-w-0 p-4 sm:p-6 md:p-8">
                    {success && (
                        <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                            <span>{success}</span>
                            <button type="button" onClick={() => setSuccess("")} className="ml-4 text-lg" aria-label="Fechar mensagem">×</button>
                        </div>
                    )}
                    {error && (
                        <div className="mb-5 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            <span>{error}</span>

                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setError("")}
                                    className="ml-4 text-lg"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            label="Oportunidades"
                            value={loading ? "—" : <AnimatedNumber value={metrics.total} />}
                            detail="Total cadastrado"
                        />
                        <MetricCard
                            label="Negócios abertos"
                            value={loading ? "—" : <AnimatedNumber value={metrics.open} />}
                            detail="Em andamento"
                        />
                        <MetricCard
                            label="Valor do pipeline"
                            value={loading ? "—" : <AnimatedMoney value={metrics.pipelineValue} />}
                            detail="Potencial em aberto"
                        />
                        <MetricCard
                            label="Receita conquistada"
                            value={loading ? "—" : <AnimatedMoney value={metrics.wonValue} />}
                            detail="Negócios ganhos"
                            highlight
                        />
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
                            <LoadingState label="Carregando oportunidades..." />
                        </div>
                    ) : (
                        <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain pb-5">
                            <div className="grid min-w-[1080px] grid-cols-6 gap-3 lg:min-w-0 xl:gap-4">
                                {stages.map((stage) => {
                                    const stageOpportunities =
                                        opportunities.filter(
                                            (opportunity) =>
                                                opportunity.stage ===
                                                stage.value,
                                        );

                                    const stageTotal =
                                        stageOpportunities.reduce(
                                            (total, opportunity) =>
                                                total + opportunity.value,
                                            0,
                                        );

                                    return (
                                        <div
                                            key={stage.value}
                                            onDragOver={(event) => {
                                                event.preventDefault();
                                                setDragOverStage(stage.value);
                                            }}
                                            onDragLeave={(event) => {
                                                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                                                    setDragOverStage(null);
                                                }
                                            }}
                                            onDrop={(event) =>
                                                handleDrop(event, stage.value)
                                            }
                                            className={`min-h-[540px] min-w-0 rounded-2xl border p-2.5 transition duration-200 xl:p-3 ${
                                                dragOverStage === stage.value
                                                    ? "border-emerald-400/35 bg-emerald-400/[0.045] shadow-[inset_0_0_35px_rgba(52,211,153,0.035)]"
                                                    : "border-white/[0.065] bg-[#0b1016]"
                                            }`}
                                        >
                                            <div className="relative mb-4 px-1 pb-4 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-white/[0.08] after:to-transparent">
                                                <div className="flex min-w-0 items-center justify-between gap-1.5">
                                                    <div className="flex min-w-0 items-center gap-1.5 xl:gap-2">
                                                        <span
                                                            className="h-1.5 w-1.5 rounded-full opacity-80"
                                                            style={{
                                                                backgroundColor:
                                                                stage.color,
                                                            }}
                                                        />
                                                        <h2 className="truncate text-xs font-semibold xl:text-sm" title={stage.label}>
                                                            {stage.label}
                                                        </h2>
                                                    </div>

                                                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/50">
                                                        {
                                                            stageOpportunities.length
                                                        }
                                                    </span>
                                                </div>

                                                <p className="mt-2 text-xs text-white/40">
                                                    {formatMoney(stageTotal)}
                                                </p>
                                            </div>

                                            <div className="space-y-3">
                                                {stageOpportunities.map(
                                                    (opportunity) => (
                                                        <article
                                                            key={
                                                                opportunity.id
                                                            }
                                                            draggable={
                                                                movingId !==
                                                                opportunity.id
                                                            }
                                                            onDragStart={() =>
                                                                setDraggedId(
                                                                    opportunity.id,
                                                                )
                                                            }
                                                            onDragEnd={() =>
                                                                setDraggedId(
                                                                    null,
                                                                )
                                                            }
                                                            onClick={() => {
                                                                if (!draggedId) {
                                                                    setSelectedOpportunity(opportunity);
                                                                }
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter" || event.key === " ") {
                                                                    event.preventDefault();
                                                                    setSelectedOpportunity(opportunity);
                                                                }
                                                            }}
                                                            role="button"
                                                            tabIndex={0}
                                                            style={{ borderLeftColor: stage.color }}
                                                            className={`group min-w-0 cursor-pointer rounded-xl border border-l-2 bg-gradient-to-br from-[#151c25] to-[#10161e] p-3 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:border-white/20 active:cursor-grabbing xl:rounded-2xl xl:p-4 ${
                                                                draggedId ===
                                                                opportunity.id
                                                                    ? "border-emerald-500/50 opacity-50"
                                                                    : "border-white/10"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="line-clamp-2 text-sm font-semibold leading-5 text-white/90">{opportunity.title}</p>
                                                                <div className="flex shrink-0 items-center gap-0.5">
                                                                    <button
                                                                        type="button"
                                                                        draggable={false}
                                                                        onPointerDown={(event) => event.stopPropagation()}
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            setSelectedOpportunity(opportunity);
                                                                        }}
                                                                        className="grid h-7 w-7 place-items-center rounded-lg text-white/25 transition hover:bg-white/[0.07] hover:text-emerald-300"
                                                                        aria-label={`Ver detalhes de ${opportunity.title}`}
                                                                        title="Ver detalhes"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <GripVertical className="text-white/20 transition group-hover:text-white/45" size={14} />
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 flex items-center gap-2">
                                                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-white/55">{opportunity.customerName.charAt(0).toUpperCase()}</span>
                                                                <p className="truncate text-xs text-white/45">{opportunity.customerName}</p>
                                                            </div>

                                                            <p className="mt-4 text-base font-semibold text-emerald-400">
                                                                {formatMoney(
                                                                    opportunity.value,
                                                                )}
                                                            </p>

                                                            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-white/40">
                                                                <span className="flex items-center gap-1.5">
                                                                    <CalendarDays size={12} />
                                                                    {formatDate(
                                                                        opportunity.expectedCloseDate,
                                                                    )}
                                                                </span>

                                                                {movingId ===
                                                                    opportunity.id && (
                                                                        <span className="text-emerald-400">
                                                                        Salvando...
                                                                    </span>
                                                                    )}
                                                            </div>

                                                        </article>
                                                    ),
                                                )}

                                                {stageOpportunities.length ===
                                                    0 && (
                                                        <div className={`flex h-28 items-center justify-center rounded-xl text-center text-xs transition ${
                                                            dragOverStage === stage.value
                                                                ? "bg-emerald-400/[0.07] text-emerald-300"
                                                                : "bg-white/[0.018] text-white/25"
                                                        }`}>
                                                            {dragOverStage === stage.value ? (
                                                                "Solte a oportunidade aqui"
                                                            ) : (
                                                                <span>Arraste uma<br />oportunidade para cá</span>
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            {selectedOpportunity && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedOpportunity(null);
                        }
                    }}
                >
                    <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#10151c] shadow-2xl">
                        <header className="flex items-start justify-between gap-5 border-b border-white/10 p-6">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                                    Detalhes da oportunidade
                                </p>
                                <h2 className="mt-2 break-words text-xl font-semibold">
                                    {selectedOpportunity.title}
                                </h2>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingId(selectedOpportunity.id);
                                        setForm({
                                            customerId: selectedOpportunity.customerId,
                                            title: selectedOpportunity.title,
                                            value: selectedOpportunity.value,
                                            expectedCloseDate: selectedOpportunity.expectedCloseDate,
                                            notes: selectedOpportunity.notes ?? "",
                                        });
                                        setEstimatedValue(String(selectedOpportunity.value));
                                        setSelectedOpportunity(null);
                                        setModalOpen(true);
                                    }}
                                    className="grid h-9 w-9 place-items-center rounded-xl text-white/40 transition hover:bg-white/5 hover:text-emerald-300"
                                    aria-label="Editar oportunidade"
                                    title="Editar oportunidade"
                                >
                                    <Pencil size={17} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedOpportunity(null)}
                                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/40 transition hover:bg-white/5 hover:text-white"
                                    aria-label="Fechar detalhes"
                                >
                                    <X size={19} />
                                </button>
                            </div>
                        </header>

                        <div className="space-y-6 p-6">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <DetailCard
                                    icon={<Building2 size={17} />}
                                    label="Cliente"
                                    value={selectedOpportunity.customerName}
                                />
                                <DetailCard
                                    icon={<BadgeDollarSign size={17} />}
                                    label="Valor estimado"
                                    value={formatMoney(selectedOpportunity.value)}
                                    highlight
                                />
                                <DetailCard
                                    icon={<CalendarDays size={17} />}
                                    label="Previsão"
                                    value={formatDate(selectedOpportunity.expectedCloseDate)}
                                />
                            </div>

                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="text-sm text-white/45">Etapa atual</span>
                                    <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                                        {stages.find((stage) => stage.value === selectedOpportunity.stage)?.label}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <div className="mb-3 flex items-center gap-2 text-sm text-white/55">
                                    <Building2 size={17} />
                                    <span>Dados do cliente</span>
                                </div>
                                <div className="grid overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0f15] sm:grid-cols-2">
                                    <CustomerField label="Nome completo" value={selectedCustomer?.name ?? selectedOpportunity.customerName} />
                                    <CustomerField label="Empresa" value={selectedCustomer?.companyName || "Não informada"} />
                                    <CustomerField label="CPF/CNPJ" value={formatDocument(selectedCustomer?.document ?? null)} />
                                    <CustomerField label="E-mail" value={selectedCustomer?.email || "Não informado"} />
                                    <CustomerField label="Telefone" value={selectedCustomer?.phone || "Não informado"} />
                                    <CustomerField label="Situação do cliente" value={selectedCustomer?.status === "INACTIVE" ? "Inativo" : "Ativo"} />
                                </div>
                            </div>

                            <div>
                                <div className="mb-3 flex items-center gap-2 text-sm text-white/55">
                                    <StickyNote size={17} />
                                    <span>Observações</span>
                                </div>
                                <p className="min-h-24 whitespace-pre-wrap rounded-2xl border border-white/[0.07] bg-[#0a0f15] p-4 text-sm leading-6 text-white/65">
                                    {selectedOpportunity.notes?.trim() || "Nenhuma observação cadastrada."}
                                </p>
                            </div>

                            <div className="grid gap-3 border-t border-white/[0.07] pt-5 text-xs text-white/35 sm:grid-cols-2">
                                <p>Criada em {formatDateTime(selectedOpportunity.createdAt)}</p>
                                <p className="sm:text-right">Atualizada em {formatDateTime(selectedOpportunity.updatedAt)}</p>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#10151c] shadow-2xl">
                        <div className="flex items-start justify-between border-b border-white/10 p-6">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {editingId ? "Editar oportunidade" : "Nova oportunidade"}
                                </h2>
                                <p className="mt-1 text-sm text-white/45">
                                    {editingId ? "Atualize os dados desta negociação." : "Cadastre um novo negócio no funil."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeFormModal}
                                className="text-2xl text-white/40 hover:text-white"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleCreate}
                            className="space-y-5 p-6"
                        >
                            <label className="block">
                                <span className="mb-2 block text-sm text-white/65">
                                    Cliente *
                                </span>

                                <select
                                    required
                                    value={form.customerId}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            customerId: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-[#080c11] px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                                >
                                    <option value="">
                                        Selecione um cliente
                                    </option>

                                    {customers.map((customer) => (
                                        <option
                                            key={customer.id}
                                            value={customer.id}
                                        >
                                            {customer.name}
                                            {customer.companyName
                                                ? ` — ${customer.companyName}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm text-white/65">
                                    Título da oportunidade *
                                </span>

                                <input
                                    required
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            title: event.target.value,
                                        }))
                                    }
                                    placeholder="Ex.: Proposta comercial"
                                    className="w-full rounded-xl border border-white/10 bg-[#080c11] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-emerald-500"
                                />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm text-white/65">
                                        Valor estimado *
                                    </span>

                                    <input
                                        min="0"
                                        step="0.01"
                                        type="number"
                                        value={estimatedValue}
                                        onChange={(event) => {
                                            setEstimatedValue(
                                                event.target.value,
                                            );
                                            setEstimatedValueError(false);
                                        }}
                                        className={`w-full rounded-xl border bg-[#080c11] px-4 py-3 text-sm outline-none transition ${
                                            estimatedValueError
                                                ? "border-red-500 focus:border-red-500"
                                                : "border-white/10 focus:border-emerald-500"
                                        }`}
                                    />
                                    {estimatedValueError && (
                                        <span className="mt-2 block text-sm text-red-400">
                                            Digite um valor.
                                        </span>
                                    )}
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm text-white/65">
                                        Previsão de fechamento
                                    </span>

                                    <input
                                        type="date"
                                        value={
                                            form.expectedCloseDate ?? ""
                                        }
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                expectedCloseDate:
                                                    event.target.value ||
                                                    null,
                                            }))
                                        }
                                        className="w-full rounded-xl border border-white/10 bg-[#080c11] px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                                    />
                                </label>
                            </div>

                            <label className="block">
                                <span className="mb-2 block text-sm text-white/65">
                                    Observações
                                </span>

                                <textarea
                                    rows={4}
                                    value={form.notes}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            notes: event.target.value,
                                        }))
                                    }
                                    placeholder="Informações importantes sobre a negociação..."
                                    className="w-full resize-none rounded-xl border border-white/10 bg-[#080c11] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-emerald-500"
                                />
                            </label>

                            {error && (
                                <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                                    {error}
                                </p>
                            )}

                            <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
                                <button
                                    type="button"
                                    onClick={closeFormModal}
                                    className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/65 hover:bg-white/5"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving
                                        ? "Salvando..."
                                        : editingId ? "Salvar alterações" : "Criar oportunidade"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OpportunitiesPage() {
    return (
        <Suspense fallback={<LoadingState label="Carregando oportunidades..." />}>
            <OpportunitiesPageContent />
        </Suspense>
    );
}

function DetailCard({
                        icon,
                        label,
                        value,
                        highlight = false,
                    }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-white/35">
                {icon}
                <span className="text-xs">{label}</span>
            </div>
            <p className={`mt-3 break-words text-sm font-semibold ${highlight ? "text-emerald-400" : "text-white/85"}`}>
                {value}
            </p>
        </div>
    );
}

function CustomerField({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 border-b border-white/[0.06] p-4 odd:sm:border-r">
            <p className="text-xs text-white/35">{label}</p>
            <p className="mt-1.5 break-words text-sm text-white/75">{value}</p>
        </div>
    );
}

function useAnimatedValue(value: number, duration = 2500) {
    const [displayedValue, setDisplayedValue] = useState(0);

    useEffect(() => {
        const startedAt = performance.now();
        let frame = 0;

        const animate = (time: number) => {
            const progress = Math.min((time - startedAt) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayedValue(value * eased);

            if (progress < 1) {
                frame = window.requestAnimationFrame(animate);
            }
        };

        frame = window.requestAnimationFrame(animate);
        return () => window.cancelAnimationFrame(frame);
    }, [duration, value]);

    return displayedValue;
}

function AnimatedNumber({ value }: { value: number }) {
    return <>{Math.round(useAnimatedValue(value))}</>;
}

function AnimatedMoney({ value }: { value: number }) {
    return <>{formatMoney(useAnimatedValue(value))}</>;
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
                className={`mt-3 text-2xl font-semibold ${
                    highlight ? "text-emerald-400" : "text-white"
                }`}
            >
                {value}
            </p>
            <p className="mt-2 text-xs text-white/35">{detail}</p>
        </div>
    );
}
