import { toast } from "sonner";

/**
 * notify — the ONLY way to raise a toast in FlowDesk (FD7).
 *
 * Titles are fixed so the same outcome always reads the same way:
 *   sukses → "Sukses" · gagal → "Gagal" · peringatan → "Peringatan" · info → "Info"
 * Callers supply the DESCRIPTION (what happened), never the title.
 * Colour comes from the semantic feedback tokens wired in `ui/sonner.jsx`.
 *
 * Usage: notify.success("Profil diperbarui.") · notify.error(apiError(err))
 */
export const TOAST_TITLE = {
  success: "Sukses",
  error: "Gagal",
  warning: "Peringatan",
  info: "Info",
};

const make = (type) => (description, options = {}) =>
  toast[type](TOAST_TITLE[type], { description, ...options });

export const notify = {
  success: make("success"),
  error: make("error"),
  warning: make("warning"),
  info: make("info"),
  /** Escape hatch for promise/loading toasts — titles must stay from TOAST_TITLE. */
  raw: toast,
};

export default notify;
