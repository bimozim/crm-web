"use client";

import Link from "next/link";
import LoadingState from "@/components/LoadingState";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  activateCustomer,
  ApiRequestError,
  createCustomer,
  deactivateCustomer,
  getCustomers,
  updateCustomer,
} from "@/lib/api";
import type {
  CreateCustomerInput,
  Customer,
} from "@/types/customer";

const initialForm: CreateCustomerInput = {
  name: "",
  companyName: "",
  document: "",
  email: "",
  phone: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
      useState<Customer | null>(null);

  const [saving, setSaving] = useState(false);
  const [form, setForm] =
      useState<CreateCustomerInput>(initialForm);

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] =
      useState<Record<string, string>>({});

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await getCustomers(search);
      setCustomers(response.content);
    } catch {
      setPageError(
          "Não foi possível carregar os clientes. Verifique se a API está ligada.",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCustomers();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [loadCustomers]);

  const metrics = useMemo(() => {
    const active = customers.filter(
        (customer) => customer.status === "ACTIVE",
    ).length;

    return {
      total: customers.length,
      active,
      inactive: customers.length - active,
    };
  }, [customers]);

  function updateField(
      field: keyof CreateCustomerInput,
      value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));
  }

  function openCreateModal() {
    setEditingCustomer(null);
    setForm(initialForm);
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);

    setForm({
      name: customer.name,
      companyName: customer.companyName ?? "",
      document: customer.document ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    });

    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCustomer(null);
    setForm(initialForm);
    setFormError("");
    setFieldErrors({});
  }

  async function handleSubmit(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");
      setFieldErrors({});

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, form);
      } else {
        await createCustomer(form);
      }

      closeModal();
      await loadCustomers();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError(
            "Não foi possível salvar o cliente. Verifique a conexão.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(customer: Customer) {
    try {
      setPageError("");

      if (customer.status === "ACTIVE") {
        await deactivateCustomer(customer.id);
      } else {
        await activateCustomer(customer.id);
      }

      await loadCustomers();
    } catch {
      setPageError(
          "Não foi possível alterar o status do cliente.",
      );
    }
  }

  return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <aside className="!hidden">
          <div className="flex items-center justify-center gap-3 lg:justify-start lg:px-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)] font-bold text-[#06251a]">
              V
            </div>

            <div className="hidden lg:block">
              <strong className="block text-base">
                Vivemed CRM
              </strong>
              <span className="text-xs text-[var(--muted)]">
              Gestão comercial
            </span>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            <Link href="/" className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--muted)] transition hover:bg-white/5 hover:text-white lg:justify-start">
              <span>◫</span>
              <span className="hidden lg:inline">Visão geral</span>
            </Link>

            <Link href="/customers" className="flex w-full items-center justify-center gap-3 rounded-xl bg-[rgba(54,211,153,0.12)] px-3 py-3 text-left text-sm font-medium text-[var(--primary)] lg:justify-start">
              <span>◎</span>
              <span className="hidden lg:inline">Clientes</span>
            </Link>

            <Link href="/opportunities" className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--muted)] transition hover:bg-white/5 hover:text-white lg:justify-start">
              <span>◇</span>
              <span className="hidden lg:inline">Oportunidades</span>
            </Link>

            <Link href="/activities" className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--muted)] transition hover:bg-white/5 hover:text-white lg:justify-start">
              <span>✓</span>
              <span className="hidden lg:inline">Atividades</span>
            </Link>
          </nav>

          <div className="absolute bottom-5 left-5 right-5 hidden rounded-xl border border-[var(--border)] bg-white/[0.025] p-4 lg:block">
          <span className="text-xs text-[var(--muted)]">
            Ambiente
          </span>

            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              API conectada
            </div>
          </div>
        </aside>

        <main className="ml-20 min-h-screen lg:ml-64">
          <header className="border-b border-[var(--border)] bg-[rgba(8,11,18,0.72)] px-5 py-5 backdrop-blur-xl sm:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--primary)]">
                  Comercial
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  Gestão de clientes
                </h1>
              </div>

              <button
                  onClick={openCreateModal}
                  className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[#052117] transition hover:bg-[var(--primary-strong)]"
              >
                + Novo cliente
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
            <section className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-sm text-[var(--muted)]">
                  Clientes exibidos
                </p>
                <strong className="mt-3 block text-3xl">
                  {metrics.total}
                </strong>
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-sm text-[var(--muted)]">
                  Clientes ativos
                </p>
                <strong className="mt-3 block text-3xl text-[var(--primary)]">
                  {metrics.active}
                </strong>
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-sm text-[var(--muted)]">
                  Clientes inativos
                </p>
                <strong className="mt-3 block text-3xl text-[var(--danger)]">
                  {metrics.inactive}
                </strong>
              </article>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">
                    Base de clientes
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Consulte e acompanhe os contatos comerciais.
                  </p>
                </div>

                <input
                    value={search}
                    onChange={(event) =>
                        setSearch(event.target.value)
                    }
                    placeholder="Pesquisar por nome..."
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition placeholder:text-[#637086] focus:border-[var(--primary)] sm:w-72"
                />
              </div>

              {pageError && (
                  <div className="m-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-300">
                    {pageError}
                  </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted)]">
                    <th className="px-5 py-4 font-medium">
                      Cliente
                    </th>
                    <th className="px-5 py-4 font-medium">
                      Contato
                    </th>
                    <th className="px-5 py-4 font-medium">
                      Documento
                    </th>
                    <th className="px-5 py-4 font-medium">
                      Status
                    </th>
                    <th className="px-5 py-4 font-medium">
                      Atualização
                    </th>
                    <th className="px-5 py-4 font-medium">
                      Ações
                    </th>
                  </tr>
                  </thead>

                  <tbody>
                  {loading ? (
                      <tr>
                        <td
                            colSpan={6}
                            className="px-5 py-16 text-center text-sm text-[var(--muted)]"
                        >
                          <LoadingState compact label="Carregando clientes..." />
                        </td>
                      </tr>
                  ) : customers.length === 0 ? (
                      <tr>
                        <td
                            colSpan={6}
                            className="px-5 py-16 text-center text-sm text-[var(--muted)]"
                        >
                          Nenhum cliente encontrado.
                        </td>
                      </tr>
                  ) : (
                      customers.map((customer) => (
                          <tr
                              key={customer.id}
                              className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.025]"
                          >
                            <td className="px-5 py-4">
                              <strong className="block text-sm">
                                {customer.name}
                              </strong>

                              <span className="mt-1 block text-xs text-[var(--muted)]">
                            {customer.companyName ||
                                "Sem empresa informada"}
                          </span>
                            </td>

                            <td className="px-5 py-4">
                          <span className="block text-sm">
                            {customer.email || "Sem e-mail"}
                          </span>

                              <span className="mt-1 block text-xs text-[var(--muted)]">
                            {customer.phone || "Sem telefone"}
                          </span>
                            </td>

                            <td className="px-5 py-4 text-sm text-[var(--muted)]">
                              {customer.document || "Não informado"}
                            </td>

                            <td className="px-5 py-4">
                          <span
                              className={
                                customer.status === "ACTIVE"
                                    ? "rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300"
                                    : "rounded-full bg-red-400/10 px-3 py-1 text-xs font-medium text-red-300"
                              }
                          >
                            {customer.status === "ACTIVE"
                                ? "Ativo"
                                : "Inativo"}
                          </span>
                            </td>

                            <td className="px-5 py-4 text-sm text-[var(--muted)]">
                              {formatDate(customer.updatedAt)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <Link
                                    href={`/customers/${customer.id}`}
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                >
                                  Ver detalhes
                                </Link>

                                <button
                                    onClick={() =>
                                        openEditModal(customer)
                                    }
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium transition hover:border-blue-400 hover:text-blue-300"
                                >
                                  Editar
                                </button>

                                <button
                                    onClick={() =>
                                        void handleStatus(customer)
                                    }
                                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                >
                                  {customer.status === "ACTIVE"
                                      ? "Desativar"
                                      : "Ativar"}
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))
                  )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>

        {modalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {editingCustomer
                          ? "Editar cliente"
                          : "Novo cliente"}
                    </h2>

                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {editingCustomer
                          ? "Atualize os dados do contato comercial."
                          : "Adicione um contato à base comercial."}
                    </p>
                  </div>

                  <button
                      type="button"
                      onClick={closeModal}
                      disabled={saving}
                      className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-white disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 p-5"
                >
                  {formError && (
                      <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">
                        {formError}
                      </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm text-[var(--muted)]">
                      Nome *
                    </label>

                    <input
                        value={form.name}
                        onChange={(event) =>
                            updateField("name", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:border-[var(--primary)]"
                    />

                    {fieldErrors.name && (
                        <p className="mt-1 text-xs text-red-300">
                          {fieldErrors.name}
                        </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-[var(--muted)]">
                      Empresa
                    </label>

                    <input
                        value={form.companyName}
                        onChange={(event) =>
                            updateField(
                                "companyName",
                                event.target.value,
                            )
                        }
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-[var(--muted)]">
                        Documento
                      </label>

                      <input
                          value={form.document}
                          onChange={(event) =>
                              updateField(
                                  "document",
                                  event.target.value,
                              )
                          }
                          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:border-[var(--primary)]"
                      />

                      {fieldErrors.document && (
                          <p className="mt-1 text-xs text-red-300">
                            {fieldErrors.document}
                          </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-[var(--muted)]">
                        Telefone
                      </label>

                      <input
                          value={form.phone}
                          onChange={(event) =>
                              updateField("phone", event.target.value)
                          }
                          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:border-[var(--primary)]"
                      />

                      {fieldErrors.phone && (
                          <p className="mt-1 text-xs text-red-300">
                            {fieldErrors.phone}
                          </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-[var(--muted)]">
                      E-mail
                    </label>

                    <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                            updateField("email", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 outline-none focus:border-[var(--primary)]"
                    />

                    {fieldErrors.email && (
                        <p className="mt-1 text-xs text-red-300">
                          {fieldErrors.email}
                        </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-5">
                    <button
                        type="button"
                        onClick={closeModal}
                        disabled={saving}
                        className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[#052117] transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                          ? "Salvando..."
                          : editingCustomer
                              ? "Salvar alterações"
                              : "Cadastrar cliente"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}
