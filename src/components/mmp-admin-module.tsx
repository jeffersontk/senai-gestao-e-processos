"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Image from "next/image";
import {
  CheckCircle2,
  Download,
  FileSignature,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { MmpItem, MmpMovementType, MmpRecord, StoreData } from "@/lib/types";

type MutationOptions = {
  method?: "POST" | "PUT";
  successMessage?: string;
  silent?: boolean;
};

type MmpAdminModuleProps = {
  store: StoreData;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
  onStoreChange: (store: StoreData) => void;
};

type MmpForm = Omit<
  MmpRecord,
  | "createdAt"
  | "updatedAt"
  | "sentToSignatureAt"
  | "signedFileName"
  | "signedFileOriginalName"
  | "signedFilePath"
  | "signedAt"
>;
type PdfOrientation = "landscape" | "portrait";

const movementTypes: MmpMovementType[] = [
  "Transferência",
  "Empréstimo",
  "Cessão",
  "Utilização fora das Dependências da Entidade",
  "Disponibilidade",
];

const inputClass =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const textareaClass =
  "min-h-20 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-zinc-500";
const mmpTableCellStyle = {
  lineHeight: "13px",
  minHeight: 24,
} as const;
const mmpTableHeaderStyle = {
  lineHeight: "13px",
  minHeight: 22,
} as const;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(): MmpForm {
  return {
    id: "",
    numero: "MAT-002",
    unidadeOrigem: "HOME OFFICE",
    unidadeDestino: "SUPORTE TI - TIJUCA",
    dataEmissao: today(),
    tipoMovimentacao: "Transferência",
    observacoes:
      "ENCAMINHAMENTO DO EQUIPAMENTO PARA EQUIPE DE TI A FIM DE CONFIGURAR O ANDROID STUDIO",
    dataRecebimento: "",
    responsavelRecebimento: "",
    responsavelGuarda: "",
    gestor: "",
    status: "rascunho",
    items: [
      {
        id: crypto.randomUUID(),
        item: 1,
        numeroPatrimonial: "SEN9383",
        descricao: "Workstation",
        valor: 10000,
      },
    ],
  };
}

function recordToForm(record: MmpRecord): MmpForm {
  return {
    id: record.id,
    numero: record.numero,
    unidadeOrigem: record.unidadeOrigem,
    unidadeDestino: record.unidadeDestino,
    dataEmissao: record.dataEmissao,
    tipoMovimentacao: record.tipoMovimentacao,
    observacoes: record.observacoes,
    dataRecebimento: record.dataRecebimento,
    responsavelRecebimento: record.responsavelRecebimento,
    responsavelGuarda: record.responsavelGuarda,
    gestor: record.gestor,
    status: record.status,
    items: record.items.map((item) => ({ ...item })),
  };
}

function formatDate(value: string) {
  if (!value) return "        /        /";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function statusLabel(status: MmpRecord["status"]) {
  const labels: Record<MmpRecord["status"], string> = {
    rascunho: "Rascunho",
    gerado: "PDF gerado",
    enviado_assinatura: "Enviado para assinatura",
    assinado: "Assinado",
  };
  return labels[status];
}

export default function MmpAdminModule({
  store,
  onMutate,
  onStoreChange,
}: MmpAdminModuleProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<MmpForm>(() => createEmptyForm());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>("landscape");
  const [uploadingId, setUploadingId] = useState("");
  const total = useMemo(
    () => form.items.reduce((sum, item) => sum + (Number(item.valor) || 0), 0),
    [form.items],
  );

  async function saveForm(options: MutationOptions = {}) {
    const body = {
      ...form,
      items: form.items.map((item, index) => ({
        ...item,
        item: index + 1,
        valor: Number(item.valor) || 0,
      })),
    };
    const response = await onMutate("/api/mmp", body, {
      method: form.id ? "PUT" : "POST",
      successMessage: form.id ? "MMP atualizada." : "MMP criada.",
      ...options,
    });
    const latest = response.mmpRecords.at(-1);
    const current = form.id
      ? response.mmpRecords.find((record) => record.id === form.id)
      : latest;
    if (current) {
      setForm(recordToForm(current));
      setDetailsOpen(true);
    }
    return current;
  }

  async function generatePdf() {
    setGenerating(true);
    try {
      const record = form.id ? await saveForm({ silent: true }) : await saveForm({ silent: true });
      if (!record || !printRef.current) return;

      const pages = Array.from(printRef.current.querySelectorAll<HTMLElement>("[data-mmp-page]"));
      const pdf = new jsPDF({ orientation: pdfOrientation, unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (const [index, page] of pages.entries()) {
        const canvas = await html2canvas(page, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const image = canvas.toDataURL("image/png");
        if (index > 0) pdf.addPage("a4", pdfOrientation);
        pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);
      }

      pdf.save(`${record.numero || "MMP"}-${record.id.slice(0, 8)}.pdf`);
      const nextStore = await onMutate(
        "/api/mmp",
        { id: record.id, action: "mark-generated" },
        { method: "PUT", successMessage: "PDF gerado." },
      );
      const updated = nextStore.mmpRecords.find((item) => item.id === record.id);
      if (updated) setForm(recordToForm(updated));
    } finally {
      setGenerating(false);
    }
  }

  async function uploadSigned(recordId: string, file?: File) {
    if (!file) return;

    setUploadingId(recordId);
    try {
      const payload = new FormData();
      payload.append("file", file);
      const response = await fetch(`/api/mmp/${recordId}/signed`, {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as { store?: StoreData; message?: string };
      if (!response.ok || !data.store) {
        throw new Error(data.message ?? "Não foi possível guardar o arquivo assinado.");
      }
      onStoreChange(data.store);
      const updated = data.store.mmpRecords.find((record) => record.id === recordId);
      if (updated && form.id === recordId) setForm(recordToForm(updated));
    } finally {
      setUploadingId("");
    }
  }

  function openDetails(record: MmpRecord) {
    setForm(recordToForm(record));
    setDetailsOpen(true);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Movimentação de Material Permanente - MMP
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Gere o formulário no padrão do anexo, envie para assinatura e guarde o PDF assinado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              type="button"
              onClick={() => {
                setForm(createEmptyForm());
                setDetailsOpen(true);
              }}
            >
              <Plus size={16} />
              Nova MMP
            </button>
            {detailsOpen && (
              <>
                <div className="flex h-10 overflow-hidden rounded-md border border-zinc-200 bg-white p-1">
                  {([
                    ["landscape", "Horizontal"],
                    ["portrait", "Vertical"],
                  ] as const).map(([orientation, label]) => (
                    <button
                      aria-pressed={pdfOrientation === orientation}
                      className={classNames(
                        "rounded px-3 text-sm font-semibold transition",
                        pdfOrientation === orientation
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-zinc-100",
                      )}
                      key={orientation}
                      type="button"
                      onClick={() => setPdfOrientation(orientation)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  type="button"
                  onClick={() => saveForm()}
                >
                  <Save size={16} />
                  Salvar
                </button>
                <button
                  className="flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  disabled={generating}
                  type="button"
                  onClick={generatePdf}
                >
                  <Download size={16} />
                  {generating ? "Gerando..." : "Gerar PDF"}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <MmpRecordsList
        records={store.mmpRecords}
        uploadingId={uploadingId}
        onSelect={openDetails}
        onUploadSigned={uploadSigned}
      />

      {detailsOpen ? (
        <>
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-950">
                  Detalhes da MMP {form.numero}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Origem {form.unidadeOrigem || "—"} para {form.unidadeDestino || "—"}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MmpStatusBadge status={form.status} />
                <button
                  className="flex h-9 items-center rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                >
                  Fechar detalhes
                </button>
              </div>
            </div>
          </section>
      <div className="grid gap-5 xl:grid-cols-[440px_1fr]">
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-950">Dados da MMP</h3>
          <form className="mt-4 space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Número" value={form.numero} onChange={(value) => setForm({ ...form, numero: value })} />
              <TextField label="Data de emissão" type="date" value={form.dataEmissao} onChange={(value) => setForm({ ...form, dataEmissao: value })} />
            </div>
            <TextField label="Unidade de origem" value={form.unidadeOrigem} onChange={(value) => setForm({ ...form, unidadeOrigem: value })} />
            <TextField label="Unidade de destino" value={form.unidadeDestino} onChange={(value) => setForm({ ...form, unidadeDestino: value })} />
            <SelectField
              label="Tipo de movimentação"
              value={form.tipoMovimentacao}
              onChange={(value) =>
                setForm({ ...form, tipoMovimentacao: value as MmpMovementType })
              }
            >
              {movementTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectField>
            <label className="block">
              <span className={labelClass}>Observações</span>
              <textarea
                className={classNames(textareaClass, "mt-1")}
                value={form.observacoes}
                onChange={(event) => setForm({ ...form, observacoes: event.target.value })}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Responsável pela guarda" value={form.responsavelGuarda} onChange={(value) => setForm({ ...form, responsavelGuarda: value })} />
              <TextField label="Gestor" value={form.gestor} onChange={(value) => setForm({ ...form, gestor: value })} />
              <TextField label="Data de recebimento" type="date" value={form.dataRecebimento} onChange={(value) => setForm({ ...form, dataRecebimento: value })} />
              <TextField label="Responsável pelo recebimento" value={form.responsavelRecebimento} onChange={(value) => setForm({ ...form, responsavelRecebimento: value })} />
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-950">Itens</h3>
            <button
              className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 px-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  items: [
                    ...form.items,
                    {
                      id: crypto.randomUUID(),
                      item: form.items.length + 1,
                      numeroPatrimonial: "",
                      descricao: "",
                      valor: 0,
                    },
                  ],
                })
              }
            >
              <Plus size={14} />
              Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                  <th className="py-3 pr-3">Item</th>
                  <th className="px-3 py-3">Nº patrimonial</th>
                  <th className="px-3 py-3">Descrição</th>
                  <th className="px-3 py-3 text-right">Valor</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, index) => (
                  <tr className="border-b border-zinc-100 last:border-0" key={item.id}>
                    <td className="py-3 pr-3 font-medium text-zinc-950">{index + 1}</td>
                    <td className="px-3 py-3">
                      <input
                        className={inputClass}
                        value={item.numeroPatrimonial}
                        onChange={(event) => updateItem(index, { numeroPatrimonial: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className={inputClass}
                        value={item.descricao}
                        onChange={(event) => updateItem(index, { descricao: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className={classNames(inputClass, "text-right")}
                        min={0}
                        step="0.01"
                        type="number"
                        value={item.valor}
                        onChange={(event) => updateItem(index, { valor: Number(event.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
                        disabled={form.items.length === 1}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            items: form.items.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-right text-sm font-semibold text-zinc-950">
            Total: {formatCurrency(total)}
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold text-zinc-950">Prévia do documento</h3>
        <div className="overflow-x-auto rounded-md bg-zinc-100 p-4">
          <div ref={printRef} className="mmp-print-root">
            <MmpPrintableDocument form={form} orientation={pdfOrientation} total={total} />
          </div>
        </div>
      </section>
        </>
      ) : (
        <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
          <h3 className="text-base font-semibold text-zinc-950">
            Selecione uma MMP para visualizar os detalhes
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Clique em uma linha da lista acima ou crie uma nova MMP.
          </p>
        </section>
      )}

      <section className="hidden" aria-hidden="true">
        <h3 className="mb-4 text-sm font-semibold text-zinc-950">MMPs salvas e arquivo assinado</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                <th className="py-3 pr-4">Número</th>
                <th className="px-3 py-3">Origem</th>
                <th className="px-3 py-3">Destino</th>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Assinado</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {store.mmpRecords.map((record) => (
                <tr className="border-b border-zinc-100 last:border-0" key={record.id}>
                  <td className="py-3 pr-4 font-medium text-zinc-950">{record.numero}</td>
                  <td className="px-3 py-3 text-zinc-600">{record.unidadeOrigem}</td>
                  <td className="px-3 py-3 text-zinc-600">{record.unidadeDestino}</td>
                  <td className="px-3 py-3 text-zinc-600">{formatDate(record.dataEmissao)}</td>
                  <td className="px-3 py-3">
                    <MmpStatusBadge status={record.status} />
                  </td>
                  <td className="px-3 py-3 text-zinc-600">
                    {record.signedFileOriginalName ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                        type="button"
                        onClick={() => {
                          setForm(recordToForm(record));
                        }}
                      >
                        Editar
                      </button>
                      <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                        <Upload size={15} />
                        {uploadingId === record.id ? "Enviando..." : "Guardar assinado"}
                        <input
                          accept="application/pdf"
                          className="hidden"
                          type="file"
                          onChange={(event) => uploadSigned(record.id, event.target.files?.[0])}
                        />
                      </label>
                      {record.signedFileName && (
                        <a
                          className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                          href={`/api/mmp/${record.id}/signed`}
                        >
                          <Download size={15} />
                          Baixar
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!store.mmpRecords.length && (
                <tr>
                  <td className="py-6 text-center text-zinc-500" colSpan={7}>
                    Nenhuma MMP cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

function updateItem(index: number, patch: Partial<MmpItem>) {
    const next = [...form.items];
    next[index] = { ...next[index], ...patch };
    setForm({ ...form, items: next });
  }
}

function MmpRecordsList({
  records,
  uploadingId,
  onSelect,
  onUploadSigned,
}: {
  records: MmpRecord[];
  uploadingId: string;
  onSelect: (record: MmpRecord) => void;
  onUploadSigned: (recordId: string, file?: File) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">Todas as MMPs</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Clique em uma MMP para visualizar os detalhes do documento.
          </p>
        </div>
        <span className="text-sm font-medium text-zinc-500">
          {records.length} registro{records.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4">Número</th>
              <th className="px-3 py-3">Origem</th>
              <th className="px-3 py-3">Destino</th>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Arquivo assinado</th>
              <th className="px-3 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                className="cursor-pointer border-b border-zinc-100 transition last:border-0 hover:bg-blue-50"
                key={record.id}
                onClick={() => onSelect(record)}
              >
                <td className="py-3 pr-4 font-semibold text-zinc-950">{record.numero}</td>
                <td className="px-3 py-3 text-zinc-600">{record.unidadeOrigem}</td>
                <td className="px-3 py-3 text-zinc-600">{record.unidadeDestino}</td>
                <td className="px-3 py-3 text-zinc-600">{formatDate(record.dataEmissao)}</td>
                <td className="px-3 py-3 text-right font-medium text-zinc-900">
                  {formatCurrency(
                    record.items.reduce((sum, item) => sum + (Number(item.valor) || 0), 0),
                  )}
                </td>
                <td className="px-3 py-3">
                  <MmpStatusBadge status={record.status} />
                </td>
                <td className="px-3 py-3 text-zinc-600">
                  {record.signedFileOriginalName ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <div
                    className="flex justify-end gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-white"
                      type="button"
                      onClick={() => onSelect(record)}
                    >
                      Visualizar
                    </button>
                    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-white">
                      <Upload size={15} />
                      {uploadingId === record.id ? "Enviando..." : "Guardar assinado"}
                      <input
                        accept="application/pdf"
                        className="hidden"
                        type="file"
                        onChange={(event) => onUploadSigned(record.id, event.target.files?.[0])}
                      />
                    </label>
                    {record.signedFileName && (
                      <a
                        className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-white"
                        href={`/api/mmp/${record.id}/signed`}
                      >
                        <Download size={15} />
                        Baixar
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td className="py-8 text-center text-zinc-500" colSpan={8}>
                  Nenhuma MMP cadastrada. Clique em Nova MMP para criar o primeiro documento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MmpPrintableDocument({
  form,
  orientation,
  total,
}: {
  form: MmpForm;
  orientation: PdfOrientation;
  total: number;
}) {
  return (
    <div>
      <MmpPageOne form={form} orientation={orientation} total={total} />
    </div>
  );
}

function MmpPageOne({
  form,
  orientation,
  total,
}: {
  form: MmpForm;
  orientation: PdfOrientation;
  total: number;
}) {
  const rows = form.items;
  const isPortrait = orientation === "portrait";

  return (
    <div
      className="relative mx-auto flex flex-col bg-white text-black"
      data-mmp-page
      style={{
        width: isPortrait ? 794 : 1123,
        height: isPortrait ? 1123 : 794,
        padding: isPortrait ? "34px 54px 34px 54px" : "34px 78px 30px 78px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div className="flex items-end justify-between">
        <FirjanLogo />
        <h1 className="mb-1 text-right text-[18px] font-bold italic leading-[18px]">
          Movimentação de Material
          <br />
          Permanente - MMP
        </h1>
      </div>

      <div className="mt-1 border-t-2 border-black text-[12px] italic">
        <div className="grid grid-cols-[1fr_1fr_170px] border-b border-black">
          <PrintCell label="Unidade de Origem" value={form.unidadeOrigem} />
          <PrintCell label="Unidade de Destino" value={form.unidadeDestino} />
          <PrintCell label="Data de Emissão" value={formatDate(form.dataEmissao)} />
        </div>
      </div>

      <div className="border-b border-black pb-2 pt-2 text-[12px]">
        <p className="mb-2 leading-4 italic">Tipos de Movimentação</p>
        <div
          className={classNames(
            "grid items-center gap-x-4 gap-y-2",
            isPortrait ? "grid-cols-2" : "grid-cols-[1fr_1fr_1fr_2.1fr_1.2fr]",
          )}
        >
          {movementTypes.map((type) => (
            <div className="grid grid-cols-[18px_auto] items-center gap-1" key={type}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-black">
                {form.tipoMovimentacao === type && (
                  <span className="h-2.5 w-2.5 rounded-full bg-black" />
                )}
              </span>
              <span className={classNames("block leading-[16px]", !isPortrait && "whitespace-nowrap")}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      <MmpItemsTable items={rows} orientation={orientation} total={total} />

      <div className="border-b border-black py-1 text-[12px] font-bold italic leading-4">
        <p>IMUNIDADE FISCAL:</p>
        <p className="text-center">
          Art. 150 - Inciso VI - Alínea &quot;C&quot; da Constituição Federal de 05.10.88 e Art. 12 e 13 da Lei Federal Nº 2.613, de 23/09/55.
        </p>
      </div>

      <div className={classNames("border-b border-black px-1 py-1 text-[12px]", isPortrait ? "min-h-[92px]" : "min-h-[70px]")}>
        <p className="italic">Observações</p>
        <p className="mt-4 text-center text-[12px] leading-[15px] uppercase">{form.observacoes}</p>
      </div>

      <div className={classNames("grid border-b border-black text-[12px] italic", isPortrait ? "min-h-[82px] grid-cols-[126px_1fr_1fr]" : "min-h-[64px] grid-cols-[130px_1fr_1fr]")}>
        <div className="flex flex-col justify-between border-r border-black px-1 py-1">
          <p>Data da Emissão</p>
          <p className="text-right text-[15px] not-italic">{formatDate(form.dataEmissao)}</p>
        </div>
        <div className="flex flex-col justify-between border-r border-black px-1 py-1">
          <p>Ass./Carimbo do Responsável pela Guarda</p>
          <p className="text-center text-[15px] not-italic">{form.responsavelGuarda}</p>
        </div>
        <div className="flex flex-col justify-between px-1 py-1">
          <p>Ass./Carimbo do Gestor</p>
          <p className="text-center text-[15px] not-italic">{form.gestor || "/        /"}</p>
        </div>
      </div>

      <div className={classNames("grid border-b border-black text-[12px] italic", isPortrait ? "min-h-[82px] grid-cols-[126px_1fr]" : "min-h-[66px] grid-cols-[130px_1fr]")}>
        <div className="flex flex-col border-r border-black px-1 py-1">
          <p>Recebemos as mercadorias constantes desta nota</p>
          <p className="mt-auto">Data</p>
          <p className="text-right text-[15px] leading-[16px] not-italic">
            {form.dataRecebimento ? formatDate(form.dataRecebimento) : ""}
          </p>
        </div>
        <div className="flex flex-col px-1 py-1">
          <p className="mt-auto">Responsável</p>
          <p className="text-[15px] not-italic">{form.responsavelRecebimento}</p>
        </div>
      </div>

      <div className="mt-auto border-t border-black pt-2 text-right text-[12px] font-bold italic">
        {form.numero}
      </div>
    </div>
  );
}

function MmpItemsTable({
  items,
  orientation,
  total,
}: {
  items: MmpItem[];
  orientation: PdfOrientation;
  total: number;
}) {
  const columns =
    orientation === "portrait"
      ? "grid-cols-[46px_112px_1fr_104px]"
      : "grid-cols-[64px_150px_1fr_145px]";

  return (
    <div className="border-b border-black text-[12px] italic">
      <div className={classNames("grid border-b border-black", columns)}>
        <div className="flex items-center justify-center border-r border-black font-normal" style={mmpTableHeaderStyle}>
          Item
        </div>
        <div className="flex items-center justify-center border-r border-black font-normal" style={mmpTableHeaderStyle}>
          Nº Patrimonial
        </div>
        <div className="flex items-center justify-center border-r border-black font-normal" style={mmpTableHeaderStyle}>
          Descrição
        </div>
        <div className="flex items-center justify-center font-normal" style={mmpTableHeaderStyle}>
          Valor (R$)
        </div>
      </div>

      {items.map((item, index) => (
        <div className={classNames("grid border-b border-black last:border-b-0", columns)} key={item.id}>
          <div className="flex items-center border-r border-black px-1" style={mmpTableCellStyle}>
            {index + 1}
          </div>
          <div className="flex items-center border-r border-black px-1" style={mmpTableCellStyle}>
            {item.numeroPatrimonial}
          </div>
          <div className="flex items-center border-r border-black px-1" style={mmpTableCellStyle}>
            {item.descricao}
          </div>
          <div className="flex items-center justify-end px-1" style={mmpTableCellStyle}>
            {Number(item.valor || 0).toLocaleString("pt-BR")}
          </div>
        </div>
      ))}

      <div className={classNames("grid border-t border-black", columns)}>
        <div className="col-span-3 flex items-center justify-end border-r border-black px-1 py-2 font-bold">
          Total
        </div>
        <div className="flex items-center justify-end px-1 py-2">{formatCurrency(total)}</div>
      </div>
    </div>
  );
}

function FirjanLogo() {
  return (
    <div>
      <Image
        alt="Firjan SENAI SESI IEL CIRJ"
        height={89}
        priority
        src="/logo firjan.png"
        unoptimized
        width={150}
      />
    </div>
  );
}

function PrintCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-black px-1 py-1 last:border-r-0">
      <p>{label}</p>
      <p className="mt-5 uppercase">{value}</p>
    </div>
  );
}

function MmpStatusBadge({ status }: { status: MmpRecord["status"] }) {
  const tone =
    status === "assinado"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "enviado_assinatura"
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : status === "gerado"
          ? "border-violet-200 bg-violet-50 text-violet-800"
          : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold", tone)}>
      {status === "assinado" ? <CheckCircle2 size={13} /> : <FileSignature size={13} />}
      {statusLabel(status)}
    </span>
  );
}

function TextField({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        className={classNames(inputClass, "mt-1")}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  children,
  label,
  value,
  onChange,
}: {
  children: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select
        className={classNames(inputClass, "mt-1")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
