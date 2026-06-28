import { useState, useEffect, useCallback } from "react";
import logo from "../../assets/logo.png";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, CheckCircle2, XCircle, Printer, RefreshCcw, Clock, User, FileText, DollarSign, Upload, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  getPreSales,
  confirmPreSale,
  cancelPreSale,
  PreSaleTicket,
  ConfirmPreSaleDto,
} from "../services/pre-sales.service";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../config/api";
import { uploadsService } from "../services/uploads.service";

type PaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CREDITO";

const PAYMENT_METHODS: PaymentMethod[] = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CREDITO"];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CREDITO: "Crédito",
};

function _enteroALetras(n: number): string {
  if (n === 0) return "Cero";
  const w29 = ["","Uno","Dos","Tres","Cuatro","Cinco","Seis","Siete","Ocho","Nueve",
    "Diez","Once","Doce","Trece","Catorce","Quince","Dieciséis","Diecisiete","Dieciocho","Diecinueve",
    "Veinte","Veintiuno","Veintidós","Veintitrés","Veinticuatro","Veinticinco",
    "Veintiséis","Veintisiete","Veintiocho","Veintinueve"];
  const dec = ["","","Veinte","Treinta","Cuarenta","Cincuenta","Sesenta","Setenta","Ochenta","Noventa"];
  const cen = ["","Ciento","Doscientos","Trescientos","Cuatrocientos","Quinientos",
    "Seiscientos","Setecientos","Ochocientos","Novecientos"];
  const w1  = ["","Uno","Dos","Tres","Cuatro","Cinco","Seis","Siete","Ocho","Nueve"];
  if (n <= 29) return w29[n];
  if (n < 100) return dec[Math.floor(n / 10)] + (n % 10 ? " Y " + w1[n % 10] : "");
  if (n === 100) return "Cien";
  if (n < 1000) return cen[Math.floor(n / 100)] + (n % 100 ? " " + _enteroALetras(n % 100) : "");
  if (n < 2000) return "Mil" + (n % 1000 ? " " + _enteroALetras(n % 1000) : "");
  if (n < 1_000_000) return _enteroALetras(Math.floor(n / 1000)) + " Mil" + (n % 1000 ? " " + _enteroALetras(n % 1000) : "");
  return n.toString();
}

function numerosALetras(n: number): string {
  const intPart = Math.floor(n);
  const cents = Math.round((n - intPart) * 100);
  return `${_enteroALetras(intPart)} dólares${cents > 0 ? ` con ${cents}/100` : ""}`;
}

export function Caja() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<PreSaleTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<PreSaleTicket | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmedData, setConfirmedData] = useState<{ ticket: PreSaleTicket; sale: any } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [dueDate, setDueDate] = useState("");
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [branchPaymentConfig, setBranchPaymentConfig] = useState<any>(null);
  const [sysConfig, setSysConfig] = useState<any>(null);
  const [transferReceiptUrl, setTransferReceiptUrl] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPreSales({ status: "PENDIENTE", limit: 100 });
      setTickets(res.data);
    } catch {
      toast.error("Error al cargar los tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 30000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  useEffect(() => {
    apiRequest<any[]>("/branches").then((branches) => {
      const current = branches.find((b: any) => b.name === user?.branch);
      if (current) setBranchPaymentConfig(current);
    }).catch(() => {});
    apiRequest<any>("/system-config").then(setSysConfig).catch(() => {});
  }, [user]);

  const filtered = tickets.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      (t.customer?.name?.toLowerCase().includes(q) ?? false) ||
      (t.user?.fullName?.toLowerCase().includes(q) ?? false) ||
      (t.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleReceiptUpload = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const { url } = await uploadsService.uploadReceipt(file);
      setTransferReceiptUrl(url);
      toast.success("Comprobante subido correctamente");
    } catch {
      toast.error("Error al subir el comprobante");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const openConfirm = (ticket: PreSaleTicket) => {
    setSelectedTicket(ticket);
    setPaymentMethod("EFECTIVO");
    setDueDate("");
    setTransferReceiptUrl(null);
    setShowConfirmModal(true);
  };

  const openCancel = (ticket: PreSaleTicket) => {
    setSelectedTicket(ticket);
    setShowCancelModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedTicket) return;
    if (paymentMethod === "TRANSFERENCIA" && !transferReceiptUrl) {
      toast.error("Debes subir el comprobante de transferencia");
      return;
    }
    setProcessing(true);
    try {
      const totalNum = Number(selectedTicket.totalAmount);
      const payload: ConfirmPreSaleDto = {
        paymentMethod,
        payments: [{
          paymentMethod,
          amount: totalNum,
          ...(paymentMethod === "TRANSFERENCIA" && transferReceiptUrl ? { transferReceiptUrl } : {}),
        }],
      };
      if (paymentMethod === "CREDITO" && dueDate) payload.dueDate = dueDate;
      const result = await confirmPreSale(selectedTicket.id, payload);
      setConfirmedData(result);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || "Error al confirmar el pago");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    setProcessing(true);
    try {
      await cancelPreSale(selectedTicket.id);
      toast.success(`Ticket ${selectedTicket.ticketNumber} cancelado`);
      setShowCancelModal(false);
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || "Error al cancelar");
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = (ticket: PreSaleTicket, sale: any) => {
    const fmt = (n: number) => `$${n.toFixed(2)}`;
    const totalNum = Number(ticket.totalAmount);
    const taxNum  = Number(ticket.taxAmount);
    const subtotal = totalNum - taxNum;
    const paidAt = ticket.paidAt ? new Date(ticket.paidAt) : new Date();

    const companyName     = sysConfig?.companyName     || "AGROFERRETERÍA D'CAMPO";
    const companyAddress  = sysConfig?.companyAddress  || "";
    const companyNit      = sysConfig?.companyNit      || "";
    const companyNrc      = sysConfig?.companyNrc      || "";
    const companyPhone    = sysConfig?.companyPhone    || branchPaymentConfig?.phone || "";
    const companyActivity = sysConfig?.companyActivity || "";

    const customerName     = ticket.customer?.name || "CONSUMIDOR FINAL";
    const customerAddress  = (ticket.customer as any)?.address  || "Ciudad";
    const customerPhone    = (ticket.customer as any)?.phone    || "";
    const customerEmail    = (ticket.customer as any)?.email    || "";
    const customerActivity = (ticket.customer as any)?.activityDescription || "";

    const saleNumber   = String(sale?.id || "").padStart(6, "0");
    const paymentLabel = METHOD_LABEL[ticket.paymentMethod as PaymentMethod] || ticket.paymentMethod || "Efectivo";
    const totalInWords = numerosALetras(totalNum);
    const dateStr = paidAt.toLocaleDateString("es-SV");
    const timeStr = paidAt.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Recibo ${ticket.ticketNumber}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',monospace;font-size:11px;width:80mm;padding:8px;color:#000}
  h1{font-size:14px;text-align:center;font-weight:bold;margin-bottom:2px}
  .center{text-align:center} .bold{font-weight:bold} .right{text-align:right}
  hr{border:none;border-top:1px solid #000;margin:5px 0}
  hr.d{border-top:1px dashed #000}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{font-weight:bold;text-align:left;padding:1px 2px}
  td{padding:1px 2px;vertical-align:top}
  .tr{text-align:right}
  .row{display:flex;justify-content:space-between;gap:4px;margin:1px 0;font-size:10.5px}
  .row.sm{font-size:9.5px}
  .stitle{font-weight:bold;margin:3px 0 1px}
  @media print{@page{margin:0;size:80mm auto}body{margin:0;padding:4px}}
</style></head><body>

<div class="center"><img src="${window.location.origin}${logo}" style="width:72px;height:auto;margin-bottom:4px" alt="logo"></div>
<h1>${companyName}</h1>
<div class="center" style="font-size:9.5px">${companyAddress}</div>
<div class="center">NIT: ${companyNit}</div>
<div class="center">NRC: ${companyNrc}</div>
<div class="center" style="font-size:10px">Actividad económica: ${companyActivity}</div>
<div class="center" style="font-size:10px">Tipo de establecimiento: Casa matriz</div>
${companyPhone ? `<div class="center">Tel: ${companyPhone}</div>` : ""}

<hr>

<div class="stitle">Envío</div>
<div class="row"><span>Fecha y hora de generación:</span><span>${dateStr} ${timeStr}</span></div>
<div class="row"><span>Emisor:</span><span>${ticket.user?.fullName || "-"}</span></div>
<div class="row"><span>Cajero/a:</span><span>${ticket.cashier?.fullName || user?.name || "-"}</span></div>

<hr>

<div class="stitle">Datos del receptor</div>
<div class="row"><span>Nombre:</span><span>${customerName}</span></div>
<div class="row"><span>Dirección:</span><span>${customerAddress}</span></div>
<div class="row"><span>Correo:</span><span>${customerEmail}</span></div>
<div class="row"><span>Teléfono:</span><span>${customerPhone}</span></div>
<div class="row"><span>Actividad económica:</span><span>${customerActivity}</span></div>
<div class="row"><span>No. de Venta:</span><span>${saleNumber}</span></div>
<div class="row"><span>Descripción:</span><span>${ticket.description || ""}</span></div>

<hr>

<table>
  <thead><tr>
    <th style="width:14px"></th><th>Cant</th><th>Descripción</th><th class="tr">Precio</th><th class="tr">Monto</th>
  </tr></thead>
  <tbody>
    ${ticket.items.map(i => `<tr>
      <td><span style="display:inline-block;width:11px;height:11px;border:1.5px solid #000;vertical-align:middle"></span></td>
      <td>${Number(i.quantity)}</td>
      <td>${i.product?.name || ""}</td>
      <td class="tr">${fmt(Number(i.unitPrice))}</td>
      <td class="tr">${fmt(Number(i.totalPrice))}</td>
    </tr>`).join("")}
  </tbody>
</table>

<hr>

<div class="row"><span>Subtotal:</span><span>${fmt(subtotal)}</span></div>
<div class="row"><span>Descuentos:</span><span>${fmt(0)}</span></div>
<div class="row"><span>Subtotal:</span><span>${fmt(subtotal)}</span></div>
<div class="row sm"><span>Monto global Desc., Rebajas y otros a ventas no sujetas:</span><span>${fmt(0)}</span></div>
<div class="row sm"><span>Monto global Desc., Rebajas y otros a ventas exentas:</span><span>${fmt(0)}</span></div>
<div class="row sm"><span>Monto global Desc., Rebajas y otros a ventas gravadas:</span><span>${fmt(0)}</span></div>
<div class="row"><span>Sub-Total:</span><span>${fmt(subtotal)}</span></div>
<div class="row"><span>IVA retenido:</span><span>${fmt(0)}</span></div>
<div class="row"><span>IVA percibido:</span><span>${fmt(0)}</span></div>
<div class="row"><span>Retención renta:</span><span>${fmt(0)}</span></div>
<div class="row bold"><span>Monto total de la operación:</span><span>${fmt(totalNum)}</span></div>
<div class="row"><span>Total otros montos no afectos:</span><span>${fmt(0)}</span></div>
<div class="row bold" style="font-size:13px"><span>Total a pagar:</span><span>${fmt(totalNum)}</span></div>

<hr>

<div class="row"><span class="bold">Total en letras:</span><span>${totalInWords}</span></div>
<div class="row"><span class="bold">Condición de la operación:</span><span>${paymentLabel}</span></div>

<hr class="d">
<div class="center bold" style="margin-top:6px">Gracias por su compra</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},1500)}</script>
</body></html>`;

    const win = window.open("", "_blank", "width=520,height=820");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)]">Caja — Tickets Pendientes</h1>
          <p className="text-sm text-[var(--text-sec)] mt-0.5">
            Confirma el pago de los tickets preparados por los vendedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 font-bold text-sm px-3 py-1">
            <Clock size={14} className="mr-1" /> {filtered.length} pendiente{filtered.length !== 1 ? 's' : ''}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadTickets} disabled={loading}>
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]" />
        <Input
          placeholder="Buscar ticket, cliente, vendedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[var(--bg)] border-[var(--border)]"
        />
      </div>

      {/* Lista de tickets */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-sec)]">
          <RefreshCcw size={24} className="animate-spin mr-3" /> Cargando tickets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-sec)]">
          <FileText size={40} className="mb-3 opacity-30" />
          <p className="font-bold">No hay tickets pendientes</p>
          <p className="text-sm">Los tickets creados en el POS aparecerán aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ticket) => {
            const totalNum = Number(ticket.totalAmount);
            const createdAt = new Date(ticket.createdAt);
            return (
              <div
                key={ticket.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Número y estado */}
                <div className="flex items-center justify-between">
                  <span className="font-black text-lg text-amber-600">{ticket.ticketNumber}</span>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 font-bold">Pendiente</Badge>
                </div>

                {/* Info básica */}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-[var(--text-sec)]">
                    <Clock size={13} />
                    <span>{format(createdAt, "dd/MM/yyyy HH:mm", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-sec)]">
                    <User size={13} />
                    <span>Atendido por: <span className="font-bold text-[var(--text-main)]">{ticket.user?.fullName}</span></span>
                  </div>
                  {ticket.customer && (
                    <div className="flex items-center gap-2 text-[var(--text-sec)]">
                      <User size={13} />
                      <span>Cliente: <span className="font-bold text-[var(--text-main)]">{ticket.customer.name}</span></span>
                    </div>
                  )}
                  {ticket.description && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700 font-medium">
                      {ticket.description}
                    </div>
                  )}
                </div>

                {/* Items resumidos */}
                <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-2 space-y-1 max-h-28 overflow-y-auto">
                  {ticket.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span className="text-[var(--text-main)]">
                        {item.product?.name} <span className="text-[var(--text-sec)]">×{Number(item.quantity)}</span>
                      </span>
                      <span className="font-bold">${Number(item.totalPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center font-black text-base border-t border-[var(--border)] pt-2">
                  <span className="text-[var(--text-sec)]">TOTAL A COBRAR:</span>
                  <span className="text-emerald-600 text-xl">${totalNum.toFixed(2)}</span>
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCancel(ticket)}
                    className="flex-1 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold"
                  >
                    <XCircle size={14} className="mr-1" /> Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openConfirm(ticket)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                  >
                    <DollarSign size={14} className="mr-1" /> COBRAR
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Confirmar Cobro */}
      <Dialog open={showConfirmModal} onOpenChange={(o) => { if (!o) setShowConfirmModal(false); }}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="p-5 border-b border-[var(--border)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-black text-emerald-700">
                <DollarSign size={20} /> Confirmar Cobro
              </DialogTitle>
              <DialogDescription>
                Ticket: <span className="font-bold text-amber-600">{selectedTicket?.ticketNumber}</span> —
                Total: <span className="font-black text-emerald-600">${Number(selectedTicket?.totalAmount).toFixed(2)}</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          {selectedTicket && (
            <div className="p-5 space-y-4">
              {/* Resumen */}
              <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-3 space-y-1 max-h-40 overflow-y-auto">
                {selectedTicket.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product?.name} ×{Number(item.quantity)}</span>
                    <span className="font-bold">${Number(item.totalPrice).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-[var(--border)] pt-2 flex justify-between font-black">
                  <span>Total</span>
                  <span>${Number(selectedTicket.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Info del ticket */}
              <div className="grid grid-cols-2 gap-2 text-sm text-[var(--text-sec)]">
                <div>
                  <span className="font-bold">Vendedor:</span>
                  <p className="text-[var(--text-main)] font-medium">{selectedTicket.user?.fullName}</p>
                </div>
                <div>
                  <span className="font-bold">Hora:</span>
                  <p className="text-[var(--text-main)] font-medium">{format(new Date(selectedTicket.createdAt), "HH:mm", { locale: es })}</p>
                </div>
                {selectedTicket.customer && (
                  <div className="col-span-2">
                    <span className="font-bold">Cliente:</span>
                    <p className="text-[var(--text-main)] font-medium">{selectedTicket.customer.name}</p>
                  </div>
                )}
                {selectedTicket.description && (
                  <div className="col-span-2">
                    <span className="font-bold">Nota:</span>
                    <p className="text-amber-600 font-medium">{selectedTicket.description}</p>
                  </div>
                )}
              </div>

              {/* Cajera (solo info) */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
                <span className="font-bold text-emerald-700">Cajero/a:</span>
                <span className="ml-2 text-emerald-800 font-medium">{user?.name || user?.email}</span>
              </div>

              {/* Método de pago */}
              <div>
                <Label className="text-xs font-bold text-[var(--text-sec)] uppercase mb-2 block">Método de Pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.filter((m) => {
                    if (m === "EFECTIVO" && branchPaymentConfig?.acceptsCash === false) return false;
                    if (m === "TARJETA" && branchPaymentConfig?.acceptsCard === false) return false;
                    if (m === "TRANSFERENCIA" && branchPaymentConfig?.acceptsTransfer === false) return false;
                    if (m === "CREDITO" && branchPaymentConfig?.acceptsCredit === false) return false;
                    return true;
                  }).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setPaymentMethod(m); if (m !== "TRANSFERENCIA") setTransferReceiptUrl(null); }}
                      className={`h-10 rounded-xl text-sm font-bold border transition-all ${
                        paymentMethod === m
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-[var(--bg)] text-[var(--text-sec)] border-[var(--border)] hover:border-emerald-400"
                      }`}
                    >
                      {METHOD_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload comprobante si es transferencia */}
              {paymentMethod === "TRANSFERENCIA" && (
                <div>
                  <Label className="text-xs font-bold text-[var(--text-sec)] uppercase mb-2 block">
                    Comprobante de Transferencia <span className="text-red-500">*</span>
                  </Label>
                  {transferReceiptUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-400 bg-emerald-50">
                      <img src={transferReceiptUrl} alt="Comprobante" className="w-full max-h-40 object-contain" />
                      <button
                        onClick={() => setTransferReceiptUrl(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${uploadingReceipt ? "opacity-60 pointer-events-none" : "border-[var(--border)] hover:border-emerald-400 hover:bg-emerald-50"}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }}
                      />
                      {uploadingReceipt ? (
                        <RefreshCcw size={20} className="animate-spin text-emerald-500" />
                      ) : (
                        <Upload size={20} className="text-[var(--text-sec)]" />
                      )}
                      <span className="text-xs text-[var(--text-sec)] font-medium">
                        {uploadingReceipt ? "Subiendo..." : "Toca para subir foto del comprobante"}
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Fecha vencimiento si es crédito */}
              {paymentMethod === "CREDITO" && (
                <div>
                  <Label className="text-xs font-bold text-[var(--text-sec)] uppercase mb-1 block">Fecha de Vencimiento</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="bg-[var(--bg)] border-[var(--border)]"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-5 border-t border-[var(--border)] flex gap-2">
            <Button variant="ghost" onClick={() => setShowConfirmModal(false)} className="flex-1" disabled={processing}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black"
            >
              {processing
                ? <RefreshCcw size={16} className="animate-spin mr-2" />
                : <CheckCircle2 size={16} className="mr-2" />}
              Confirmar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cancelar ticket */}
      <Dialog open={showCancelModal} onOpenChange={(o) => { if (!o) setShowCancelModal(false); }}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-red-600 font-black">¿Cancelar ticket?</DialogTitle>
              <DialogDescription>
                El ticket <span className="font-bold">{selectedTicket?.ticketNumber}</span> será cancelado y no podrá cobrarse.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="p-5 border-t border-[var(--border)] flex gap-2">
            <Button variant="ghost" onClick={() => setShowCancelModal(false)} className="flex-1" disabled={processing}>Volver</Button>
            <Button onClick={handleCancel} disabled={processing} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black">
              {processing ? <RefreshCcw size={14} className="animate-spin mr-1" /> : null} Cancelar Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cobro exitoso */}
      <Dialog open={showSuccessModal} onOpenChange={(o) => { if (!o) { setShowSuccessModal(false); setConfirmedData(null); } }}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="p-6 text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-black text-[var(--text-main)]">Cobro Exitoso</h2>
            <p className="text-3xl font-black text-emerald-600">
              ${Number(confirmedData?.ticket?.totalAmount).toFixed(2)}
            </p>
            <div className="text-sm text-[var(--text-sec)] space-y-1">
              <p>Ticket: <span className="font-bold text-amber-600">{confirmedData?.ticket?.ticketNumber}</span></p>
              <p>Venta No.: <span className="font-bold text-[var(--text-main)]">#{confirmedData?.sale?.id}</span></p>
              <p>Cajero/a: <span className="font-bold text-[var(--text-main)]">{user?.name || user?.email}</span></p>
              <p>Método: <span className="font-bold text-[var(--text-main)]">{METHOD_LABEL[confirmedData?.ticket?.paymentMethod as PaymentMethod] || confirmedData?.ticket?.paymentMethod}</span></p>
              <p>Hora: <span className="font-bold text-[var(--text-main)]">{confirmedData?.ticket?.paidAt ? format(new Date(confirmedData.ticket.paidAt), "HH:mm:ss", { locale: es }) : ""}</span></p>
            </div>
          </div>
          <DialogFooter className="p-4 border-t border-[var(--border)] flex gap-2">
            <Button variant="ghost" onClick={() => { setShowSuccessModal(false); setConfirmedData(null); }} className="flex-1">
              Cerrar
            </Button>
            <Button
              onClick={() => { if (confirmedData) printReceipt(confirmedData.ticket, confirmedData.sale); }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black"
            >
              <Printer size={16} className="mr-2" /> Imprimir Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
