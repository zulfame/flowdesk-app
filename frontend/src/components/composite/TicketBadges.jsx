import { StateChip } from "@/components/composite/StateChip";

/** Status tiket bantuan (E9: badge status boleh berwarna, hue lewat token). */
export const TICKET_STATUS_META = {
  Baru: { label: "Baru", chip: "--st-draft" },
  Ditugaskan: { label: "Ditugaskan", chip: "--st-pending" },
  Diproses: { label: "Diproses", chip: "--st-progress" },
  "Menunggu Info": { label: "Menunggu Info", chip: "--st-overdue" },
  Selesai: { label: "Selesai", chip: "--st-done" },
  Ditutup: { label: "Ditutup", chip: "--st-archived" },
};

export function TicketStatusBadge({ status }) {
  const meta = TICKET_STATUS_META[status] || { label: status, chip: "--st-draft" };
  return <StateChip label={meta.label} chip={meta.chip} testid="ticket-status-badge" />;
}
