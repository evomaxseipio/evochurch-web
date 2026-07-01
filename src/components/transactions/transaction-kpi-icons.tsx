import type { ReactNode } from "react";
import { FaCircleCheck, FaMoneyBillWave } from "react-icons/fa6";
import { MdHourglassEmpty, MdPendingActions } from "react-icons/md";

/** Íconos semánticos para KPIs de transacciones (Material Design + Font Awesome). */
export const TransactionKpiIcons = {
  /** Monto total (pendientes + aprobadas) */
  total: (size = 16): ReactNode => <FaMoneyBillWave size={size} aria-hidden />,
  /** Monto ya autorizado */
  approved: (size = 16): ReactNode => <FaCircleCheck size={size} aria-hidden />,
  /** Monto en espera de autorización */
  pendingAmount: (size = 16): ReactNode => (
    <MdHourglassEmpty size={size} aria-hidden />
  ),
  /** Cantidad pendiente por autorizar */
  pendingCount: (size = 16): ReactNode => (
    <MdPendingActions size={size} aria-hidden />
  ),
} as const;
