import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Mail,
  X,
  RefreshCcw,
  Filter,
  Calendar as CalendarIcon,
  Download,
  FilePlus2,
  FileMinus2,
  Send,
  Hash,
  User,
  Package,
  Building2,
  RotateCcw,
  AlertTriangle,
  Check,
  Printer,
} from "lucide-react";
import {
  getSalesHistory,
  voidSale,
  resendDteEmail,
  SaleResponse,
  sendNotaCredito,
  sendNotaDebito,
  requestMonthlyReport,
  sendFacturaConsumidor,
  sendCreditoFiscal,
  getSaleDetail,
} from "../services/sales.service";
import {
  getReturns,
  getReturnDetail,
  createReturn,
  updateReturnStatus,
  getReturnsBySale,
  ReturnResponse,
  ReturnFilters,
} from "../services/returns.service";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { cn } from "../components/ui/utils";
import { API_BASE_URL } from "../config/api";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import { NumberInput } from "../components/ui/number-input";
import { SmartFilter, FilterConfig } from "../components/ui/smart-filter";
import logoUrl from '../../assets/logo.png';

const salesFilters: FilterConfig[] = [
  {
    id: "search",
    label: "Buscar Cliente / # Venta",
    type: "text",
    placeholder: "Ej. Consumidor...",
  },
  {
    id: "status",
    label: "Estado Venta",
    type: "category",
    options: [
      { label: "Completada", value: "COMPLETADA" },
      { label: "Cancelada", value: "CANCELADA" },
    ],
  },
  {
    id: "paymentMethod",
    label: "Método de Pago",
    type: "category",
    options: [
      { label: "Efectivo", value: "EFECTIVO" },
      { label: "Tarjeta", value: "TARJETA" },
      { label: "Transferencia", value: "TRANSFERENCIA" },
      { label: "Crédito", value: "CREDITO" },
    ],
  },
  { id: "date", label: "Fecha Específica", type: "date_range" },
];

export function SalesHistory() {
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Tab state synced with search param
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "history",
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (tab === "history" || tab === "returns")) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const statusFilter = searchParams.get("status") || "all";
  const paymentFilter = searchParams.get("paymentMethod") || "all";
  const dateFilter = searchParams.get("date") || "";
  const searchTerm = searchParams.get("search") || "";

  // Modales
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Void Modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidForm, setVoidForm] = useState({
    motivoAnulacion: "",
    nombreResponsable: "",
    tipDocResponsable: "13",
    numDocResponsable: "",
    nombreSolicita: "",
    tipDocSolicita: "13",
    numDocSolicita: "",
  });
  const [voiding, setVoiding] = useState(false);

  // Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Notas de Crédito/Débito
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteType, setNoteType] = useState<"CREDITO" | "DEBITO">("CREDITO");
  const [noteItems, setNoteItems] = useState<any[]>([]);
  const [sendingNote, setSendingNote] = useState(false);

  // Reporte Mensual
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    email: "",
  });
  const [requestingReport, setRequestingReport] = useState(false);

  // Emisión de DTE
  const [emittingDteId, setEmittingDteId] = useState<number | null>(null);

  // --- Estados de Devoluciones ---
  const { user } = useAuth();
  const [returnsList, setReturnsList] = useState<ReturnResponse[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(true);
  const [returnsPagination, setReturnsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Filtros de devoluciones
  const [retStatusFilter, setRetStatusFilter] = useState("all");
  const [retSaleIdFilter, setRetSaleIdFilter] = useState("");
  const [retStartDateFilter, setRetStartDateFilter] = useState("");
  const [retEndDateFilter, setRetEndDateFilter] = useState("");

  // Modales de devoluciones
  const [createReturnModalOpen, setCreateReturnModalOpen] = useState(false);
  const [detailReturnModalOpen, setDetailReturnModalOpen] = useState(false);

  // Selección de devolución
  const [selectedReturn, setSelectedReturn] = useState<ReturnResponse | null>(
    null,
  );

  // Flujo de creación de devolución
  const [searchSaleId, setSearchSaleId] = useState("");
  const [searchingSale, setSearchingSale] = useState(false);
  const [activeSale, setActiveSale] = useState<SaleResponse | null>(null);
  const [previousReturns, setPreviousReturns] = useState<ReturnResponse[]>([]);
  const [returnedMap, setReturnedMap] = useState<Record<number, number>>({});

  const [returnReason, setReturnReason] = useState<
    | "PRODUCTO_DEFECTUOSO"
    | "ERROR_EN_VENTA"
    | "CAMBIO_DE_PRODUCTO"
    | "INSATISFACCION_CLIENTE"
    | "OTRO"
  >("PRODUCTO_DEFECTUOSO");
  const [returnNotes, setReturnNotes] = useState("");
  const [itemsToReturn, setItemsToReturn] = useState<
    Array<{
      saleItemId: number;
      quantity: number;
      productName: string;
      maxQuantity: number;
      unitPrice: number;
      quantityPurchased: number;
    }>
  >([]);
  const [savingReturn, setSavingReturn] = useState(false);

  // Aprobación/Rechazo de devolución
  const [approvalNotes, setApprovalNotes] = useState("");
  const [emitCreditNote, setEmitCreditNote] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const canApprove = user?.roleId && user.roleId <= 3;

  useEffect(() => {
    if (activeTab === "history") {
      const timer = setTimeout(() => {
        fetchSales();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    activeTab,
    pagination.page,
    statusFilter,
    paymentFilter,
    dateFilter,
    searchTerm,
  ]);

  useEffect(() => {
    if (activeTab === "returns") {
      const timer = setTimeout(() => {
        fetchReturns();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    activeTab,
    returnsPagination.page,
    retStatusFilter,
    retSaleIdFilter,
    retStartDateFilter,
    retEndDateFilter,
  ]);

  const fetchReturns = async () => {
    setReturnsLoading(true);
    try {
      const filters: ReturnFilters = {
        page: returnsPagination.page,
        limit: returnsPagination.limit,
      };
      if (retStatusFilter !== "all") filters.status = retStatusFilter;
      if (retSaleIdFilter) filters.saleId = Number(retSaleIdFilter);
      if (retStartDateFilter) filters.startDate = retStartDateFilter;
      if (retEndDateFilter) filters.endDate = retEndDateFilter;

      const res = await getReturns(filters);
      setReturnsList(res.data);
      setReturnsPagination({
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages,
      });
    } catch (error: any) {
      toast.error(error.message || "Error al cargar devoluciones");
    } finally {
      setReturnsLoading(false);
    }
  };

  const handleSearchSale = async () => {
    if (!searchSaleId) return;
    setSearchingSale(true);
    setActiveSale(null);
    setPreviousReturns([]);
    setReturnedMap({});
    setItemsToReturn([]);

    try {
      const sale = await getSaleDetail(Number(searchSaleId));
      if (!sale) {
        toast.error("La venta especificada no existe");
        return;
      }
      if (sale.status !== "COMPLETADA") {
        toast.error(
          "Solo se pueden registrar devoluciones de ventas en estado COMPLETADA",
        );
        return;
      }

      const history = await getReturnsBySale(sale.id);
      setPreviousReturns(history);

      const returned: Record<number, number> = {};
      history
        .filter((r) => r.status === "APROBADA" || r.status === "COMPLETADA")
        .forEach((r) => {
          r.items.forEach((ri) => {
            returned[ri.saleItemId] =
              (returned[ri.saleItemId] || 0) + Number(ri.quantity);
          });
        });
      setReturnedMap(returned);

      if (sale.items) {
        const initialItems = sale.items.map((item) => {
          const qtyDevuelta = returned[item.id] || 0;
          const maxQty = Number(item.quantity) - qtyDevuelta;
          return {
            saleItemId: item.id,
            quantity: 0,
            productName: item.product?.name || "Producto Desconocido",
            maxQuantity: maxQty,
            unitPrice: Number(item.unitPrice),
            quantityPurchased: Number(item.quantity),
          };
        });
        setItemsToReturn(initialItems);
      }

      setActiveSale(sale);
      toast.success("Venta encontrada y cargada correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al buscar la venta");
    } finally {
      setSearchingSale(false);
    }
  };

  const handleCreateReturnSubmit = async () => {
    if (!activeSale) return;

    const itemsFiltered = itemsToReturn
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        saleItemId: item.saleItemId,
        quantity: item.quantity,
      }));

    if (itemsFiltered.length === 0) {
      toast.error(
        "Debe seleccionar al menos un producto con cantidad a devolver mayor a 0",
      );
      return;
    }

    setSavingReturn(true);
    try {
      await createReturn({
        saleId: activeSale.id,
        reason: returnReason,
        notes: returnNotes,
        items: itemsFiltered,
      });

      toast.success("Solicitud de devolución registrada en estado PENDIENTE");
      setCreateReturnModalOpen(false);
      resetCreateFlow();
      fetchReturns();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar la devolución");
    } finally {
      setSavingReturn(false);
    }
  };

  const resetCreateFlow = () => {
    setSearchSaleId("");
    setActiveSale(null);
    setPreviousReturns([]);
    setReturnedMap({});
    setItemsToReturn([]);
    setReturnReason("PRODUCTO_DEFECTUOSO");
    setReturnNotes("");
  };

  const handleOpenReturnDetail = async (ret: ReturnResponse) => {
    try {
      const fullDetail = await getReturnDetail(ret.id);
      setSelectedReturn(fullDetail);
      setApprovalNotes("");
      const hasOriginalDte = !!fullDetail.sale?.dteResponse?.codigoGeneracion;
      setEmitCreditNote(hasOriginalDte);
      setDetailReturnModalOpen(true);
    } catch (error: any) {
      toast.error("Error al cargar los detalles de la devolución");
    }
  };

  const handleUpdateReturnStatus = async (
    newStatus: "APROBADA" | "RECHAZADA",
  ) => {
    if (!selectedReturn) return;
    if (newStatus === "RECHAZADA" && !approvalNotes.trim()) {
      toast.error(
        "Por favor especifique el motivo del rechazo en el campo de notas",
      );
      return;
    }

    setSubmittingStatus(true);
    try {
      await updateReturnStatus(selectedReturn.id, {
        status: newStatus,
        notes: approvalNotes,
        emitCreditNote: newStatus === "APROBADA" ? emitCreditNote : false,
      });

      toast.success(
        `Solicitud de devolución ${newStatus === "APROBADA" ? "aprobada" : "rechazada"} con éxito`,
      );
      setDetailReturnModalOpen(false);
      fetchReturns();
    } catch (error: any) {
      toast.error(
        error.message || "Error al actualizar el estado de la devolución",
      );
    } finally {
      setSubmittingStatus(false);
    }
  };

  const resetReturnsFilters = () => {
    setRetStatusFilter("all");
    setRetSaleIdFilter("");
    setRetStartDateFilter("");
    setRetEndDateFilter("");
    setReturnsPagination((p) => ({ ...p, page: 1 }));
  };

  const getReasonBadge = (reason: string) => {
    const reasonsMap: Record<string, string> = {
      PRODUCTO_DEFECTUOSO: "Defectuoso",
      ERROR_EN_VENTA: "Error Venta",
      CAMBIO_DE_PRODUCTO: "Cambio Prod.",
      INSATISFACCION_CLIENTE: "Insatisfacción",
      OTRO: "Otro",
    };
    return reasonsMap[reason] || reason;
  };

  const getReturnStatusBadge = (status: string) => {
    switch (status) {
      case "PENDIENTE":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold"
          >
            Pendiente
          </Badge>
        );
      case "APROBADA":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold"
          >
            Aprobada
          </Badge>
        );
      case "COMPLETADA":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold"
          >
            Completada
          </Badge>
        );
      case "RECHAZADA":
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold"
          >
            Rechazada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleInitiateReturn = async (sale: SaleResponse) => {
    setSearchingSale(true);
    setActiveSale(null);
    setPreviousReturns([]);
    setReturnedMap({});
    setItemsToReturn([]);

    handleTabChange("returns");
    setCreateReturnModalOpen(true);
    setSearchSaleId(String(sale.id));

    try {
      const fullSale = await getSaleDetail(sale.id);
      if (fullSale.status !== "COMPLETADA") {
        toast.error(
          "Solo se pueden registrar devoluciones de ventas en estado COMPLETADA",
        );
        setCreateReturnModalOpen(false);
        return;
      }

      const history = await getReturnsBySale(fullSale.id);
      setPreviousReturns(history);

      const returned: Record<number, number> = {};
      history
        .filter((r) => r.status === "APROBADA" || r.status === "COMPLETADA")
        .forEach((r) => {
          r.items.forEach((ri) => {
            returned[ri.saleItemId] =
              (returned[ri.saleItemId] || 0) + Number(ri.quantity);
          });
        });
      setReturnedMap(returned);

      if (fullSale.items) {
        const initialItems = fullSale.items.map((item) => {
          const qtyDevuelta = returned[item.id] || 0;
          const maxQty = Number(item.quantity) - qtyDevuelta;
          return {
            saleItemId: item.id,
            quantity: 0,
            productName: item.product?.name || "Producto Desconocido",
            maxQuantity: maxQty,
            unitPrice: Number(item.unitPrice),
            quantityPurchased: Number(item.quantity),
          };
        });
        setItemsToReturn(initialItems);
      }

      setActiveSale(fullSale);
      toast.success(
        `Cargando ítems de la venta #${sale.id.toString().padStart(6, "0")}`,
      );
    } catch (error: any) {
      toast.error(error.message || "Error al buscar la venta");
      setCreateReturnModalOpen(false);
    } finally {
      setSearchingSale(false);
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const filters: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== "all") filters.status = statusFilter;
      if (paymentFilter !== "all") filters.paymentMethod = paymentFilter;
      if (dateFilter) filters.fecha = dateFilter;
      if (searchTerm) filters.search = searchTerm;

      const res = await getSalesHistory(filters);
      setSales(res.data);
      setPagination({
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages,
      });
    } catch (error) {
      toast.error("Error al cargar historial de ventas");
    } finally {
      setLoading(false);
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setVoiding(true);
    try {
      await voidSale(selectedSale.id, voidForm);
      toast.success("Factura anulada correctamente");
      setVoidModalOpen(false);
      fetchSales();
    } catch (error: any) {
      toast.error(error.message || "Error al anular la factura");
    } finally {
      setVoiding(false);
    }
  };

  const handleResendEmail = async () => {
    if (!selectedSale) return;
    setSendingEmail(true);
    try {
      await resendDteEmail(selectedSale.id, emailInput || undefined);
      toast.success("Correo enviado correctamente");
      setEmailModalOpen(false);
      setEmailInput("");
    } catch (error: any) {
      toast.error(error.message || "Error al enviar correo");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOpenDetail = async (sale: SaleResponse) => {
    try {
      const fullSale = await getSaleDetail(sale.id);
      setSelectedSale(fullSale);
      setDetailModalOpen(true);
    } catch (e) {
      toast.error("Error al cargar detalles de la venta");
    }
  };

  const openNoteModal = async (
    sale: SaleResponse,
    type: "CREDITO" | "DEBITO",
  ) => {
    try {
      const fullSale = await getSaleDetail(sale.id);
      setSelectedSale(fullSale);
      setNoteType(type);
      setNoteItems(
        fullSale.items?.map((i) => ({ ...i, adjustQuantity: i.quantity })) ||
          [],
      );
      setNoteModalOpen(true);
    } catch (e) {
      toast.error("Error al cargar detalles de la venta");
    }
  };

  const handleViewPdf = async (url?: string) => {
    if (!url) return;

    if (url.startsWith("http")) {
      window.open(url, "_blank");
      return;
    }

    try {
      const toastId = toast.loading("Cargando documento...");
      const finalUrl = `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
      const token = localStorage.getItem("agro-token");

      const response = await fetch(finalUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al obtener el documento");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      toast.dismiss(toastId);
    } catch (e) {
      toast.error(
        "No se pudo abrir el documento. Es posible que no esté disponible.",
      );
    }
  };

  const handleNoteSubmit = async () => {
    if (!selectedSale) return;
    setSendingNote(true);
    try {
      const payload = {
        items: noteItems.map((i) => ({
          productId: i.productId,
          quantity: Number(i.adjustQuantity),
          unitPrice: Number(i.unitPrice),
        })),
      };

      if (noteType === "CREDITO") {
        await sendNotaCredito(selectedSale.id, payload);
        toast.success("Nota de Crédito emitida exitosamente");
      } else {
        await sendNotaDebito(selectedSale.id, payload);
        toast.success("Nota de Débito emitida exitosamente");
      }
      setNoteModalOpen(false);
      fetchSales();
    } catch (error: any) {
      toast.error(error.message || `Error al emitir Nota de ${noteType}`);
    } finally {
      setSendingNote(false);
    }
  };

  const handleRequestReport = async () => {
    setRequestingReport(true);
    try {
      await requestMonthlyReport(
        reportForm.year.toString(),
        reportForm.month.toString().padStart(2, "0"),
        reportForm.email,
      );
      toast.success(
        "Solicitud recibida. Recibirás el ZIP en tu correo en unos minutos.",
      );
      setReportModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Error al solicitar el reporte");
    } finally {
      setRequestingReport(false);
    }
  };

  const handleEmitDte = async (sale: SaleResponse) => {
    setEmittingDteId(sale.id);
    try {
      const isCreditFiscal = sale.customer?.customerType === "CONTRIBUYENTE";
      if (isCreditFiscal) {
        await sendCreditoFiscal(sale.id);
      } else {
        await sendFacturaConsumidor(sale.id);
      }
      toast.success("DTE emitido exitosamente");
      fetchSales();
    } catch (error: any) {
      toast.error(error.message || "Error al emitir el DTE en Hacienda");
    } finally {
      setEmittingDteId(null);
    }
  };

  const printFacturaSheet = (sale: SaleResponse) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast.error("Error al iniciar la impresión");
      document.body.removeChild(iframe);
      return;
    }

    const formatDate = (dateString?: Date | string) => {
      if (!dateString) return "";
      return new Date(dateString).toLocaleDateString("es-SV", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const formatMoney = (amount?: string | number) => {
      if (amount === undefined || amount === null) return "$0.00";
      return new Intl.NumberFormat("es-SV", {
        style: "currency",
        currency: "USD",
      }).format(Number(amount));
    };
    
    const isCreditFiscal = sale.customer?.customerType === "CONTRIBUYENTE";
    const documentType = isCreditFiscal ? "CRÉDITO FISCAL" : "FACTURA ELECTRÓNICA";
    const items = sale.items || [];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impresión de DTE - ${sale.dteResponse?.codigoGeneracion || sale.id}</title>
        <style>
          :root {
            --primary: #111827;
            --secondary: #6b7280;
            --accent: #d97706; /* Amber 600 */
            --border: #e5e7eb;
            --bg-light: #fffbeb;
          }
          body { 
            font-family: 'Inter', system-ui, -apple-system, sans-serif; 
            margin: 0; 
            padding: 15mm 20mm; 
            color: var(--primary);
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { size: letter; margin: 0; }
          .page-break { page-break-before: always; }
          
          /* Typography & Utilities */
          h1, h2, h3, p { margin: 0; }
          .text-sm { font-size: 12px; }
          .text-lg { font-size: 16px; }
          .text-xl { font-size: 24px; }
          .font-bold { font-weight: 700; }
          .font-black { font-weight: 900; }
          .text-gray { color: var(--secondary); }
          .uppercase { text-transform: uppercase; }
          .mb-4 { margin-bottom: 16px; }

          /* Layout Components */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid var(--accent);
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .header-logo { height: 70px; object-fit: contain; }
          .logo-text h2 { font-size: 18px; font-weight: 900; color: var(--primary); margin: 0; }
          .logo-text p { font-size: 11px; color: var(--secondary); margin: 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
          .header-title { text-align: right; }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 32px;
            padding: 16px;
            background: #fafafa;
            border-radius: 8px;
            border: 1px solid var(--border);
            border-left: 4px solid var(--accent);
          }
          .info-item { display: flex; flex-direction: column; gap: 4px; }
          .info-label { font-size: 10px; font-weight: 800; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.5px; }
          .info-value { font-size: 14px; font-weight: 700; color: var(--primary); }

          /* Tables */
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
          th { 
            background: #fef3c7; 
            color: #b45309; 
            font-weight: 900; 
            text-transform: uppercase; 
            font-size: 10px;
            letter-spacing: 1px;
            padding: 12px 14px; 
            text-align: left; 
            border-bottom: 2px solid #fcd34d;
          }
          th.right { text-align: right; }
          th.center { text-align: center; }
          td { 
            padding: 12px 14px; 
            border-bottom: 1px solid var(--border); 
            vertical-align: middle;
          }
          tr:last-child td { border-bottom: none; }
          td.right { text-align: right; }
          td.center { text-align: center; }
          tr:nth-child(even) td { background: #fafaf9; }
          
          /* Totals */
          .totals-box {
            width: 300px;
            float: right;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 40px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 16px;
            border-bottom: 1px solid var(--border);
            font-size: 13px;
            font-weight: 600;
          }
          .totals-row:last-child { border-bottom: none; }
          .totals-row.grand-total {
            background: #fef3c7;
            color: #b45309;
            font-size: 16px;
            font-weight: 900;
          }
          .clearfix::after { content: ""; clear: both; display: table; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <img src="${logoUrl}" class="header-logo" alt="Logo" />
            <div class="logo-text">
              <h2>Agroferr D'Campo</h2>
              <p>Comprobante de Venta</p>
            </div>
          </div>
          <div class="header-title">
            <h1 class="text-xl font-black uppercase" style="color: var(--accent);">${documentType}</h1>
            <p class="text-sm text-gray mt-1 font-bold">Fecha: ${formatDate(sale.createdAt)}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Código de Generación</span>
            <span class="info-value font-bold">${sale.dteResponse?.codigoGeneracion || `Interno #${sale.id}`}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Número de Control</span>
            <span class="info-value">${sale.dteResponse?.numeroControl || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Cliente</span>
            <span class="info-value font-bold">${sale.customer?.name || 'Consumidor Final'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${isCreditFiscal ? 'NIT / NRC' : 'Documento'}</span>
            <span class="info-value">${isCreditFiscal ? `${sale.customer?.nit || ''} / ${sale.customer?.documentNumber || ''}` : (sale.customer?.documentNumber || 'N/A')}</span>
          </div>
        </div>

        <h2 class="text-lg font-bold mb-4 uppercase">Detalle de Productos</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">Cód.</th>
              <th>Descripción</th>
              <th class="center" style="width: 80px;">Cant.</th>
              <th class="right" style="width: 100px;">Precio U.</th>
              <th class="right" style="width: 100px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td class="text-sm text-gray">${item.product?.id || '-'}</td>
                <td class="font-bold">${item.product?.name || 'Producto Desconocido'}</td>
                <td class="center font-black text-lg">${Number(item.quantity)}</td>
                <td class="right">${formatMoney(item.unitPrice)}</td>
                <td class="right font-bold">${formatMoney(item.totalPrice)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <div class="clearfix">
          <div class="totals-box">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${formatMoney(Number(sale.totalAmount) - Number(sale.taxAmount || 0))}</span>
            </div>
            <div class="totals-row">
              <span>Impuestos:</span>
              <span>${formatMoney(sale.taxAmount || 0)}</span>
            </div>
            <div class="totals-row grand-total">
              <span>TOTAL A PAGAR:</span>
              <span>${formatMoney(sale.totalAmount)}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">
            Historial de Ventas
          </h1>
          <p className="text-[var(--text-sec)]">
            Consulta, anulación, reenvío de facturas y devoluciones de
            mercadería.
          </p>
        </div>
        {activeTab === "history" && (
          <Button
            onClick={() => setReportModalOpen(true)}
            className="font-bold"
          >
            <Download size={16} className="mr-2" /> Descargar DTEs (ZIP)
          </Button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-[var(--border)] -mb-2">
        <button
          onClick={() => handleTabChange("history")}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "history"
              ? "border-[var(--primary)] text-[var(--primary)] font-black"
              : "border-transparent text-[var(--text-sec)] hover:text-[var(--text-main)]"
          }`}
        >
          Historial de Ventas
        </button>
        <button
          onClick={() => handleTabChange("returns")}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "returns"
              ? "border-[var(--primary)] text-[var(--primary)] font-black"
              : "border-transparent text-[var(--text-sec)] hover:text-[var(--text-main)]"
          }`}
        >
          Devoluciones
        </button>
      </div>

      {activeTab === "history" ? (
        <>
          <div className="bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
            <SmartFilter config={salesFilters} />
          </div>

          <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">
                      Hacienda (DTE)
                    </TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-32 text-center text-[var(--text-sec)] animate-pulse"
                      >
                        Cargando ventas...
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-32 text-center text-[var(--text-sec)] font-medium"
                      >
                        No se encontraron ventas con estos filtros
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="group hover:bg-[var(--bg)]/30"
                      >
                        <TableCell className="font-bold text-[var(--primary)]">
                          #{sale.id.toString().padStart(6, "0")}
                        </TableCell>
                        <TableCell className="text-[var(--text-main)] text-sm">
                          {new Date(sale.createdAt).toLocaleDateString()}
                          <br />
                          <span className="text-[10px] text-[var(--text-sec)]">
                            {new Date(sale.createdAt).toLocaleTimeString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-[var(--text-main)] block">
                            {sale.customer
                              ? sale.customer.name
                              : "Consumidor Final"}
                          </span>
                          {sale.customer?.nit && (
                            <span className="text-[10px] text-[var(--text-sec)]">
                              {sale.customer.nit}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {sale.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-[var(--text-main)]">
                          ${Number(sale.totalAmount).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              sale.status === "COMPLETADA"
                                ? "success"
                                : "destructive"
                            }
                          >
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {!sale.dteResponse ? (
                            <span className="text-[10px] font-bold text-gray-400">
                              Sin DTE
                            </span>
                          ) : sale.dteResponse.estado === "PROCESADO" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
                              PROCESADO
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200"
                            >
                              {sale.dteResponse.estado || "ERROR"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Opciones
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenDetail(sale)}
                                className="font-bold cursor-pointer"
                              >
                                <Eye
                                  size={14}
                                  className="mr-2 text-[var(--primary)]"
                                />{" "}
                                Ver Detalle
                              </DropdownMenuItem>

                              {sale.status === "COMPLETADA" &&
                                sale.dteResponse?.estado !== "PROCESADO" && (
                                  <DropdownMenuItem
                                    onClick={() => handleEmitDte(sale)}
                                    disabled={emittingDteId === sale.id}
                                    className={`font-bold cursor-pointer focus:text-emerald-700 ${
                                      sale.dteResponse
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                    }`}
                                  >
                                    {emittingDteId === sale.id ? (
                                      <RefreshCcw
                                        size={14}
                                        className="mr-2 animate-spin"
                                      />
                                    ) : (
                                      <Send size={14} className="mr-2" />
                                    )}
                                    {sale.dteResponse
                                      ? "Reenviar DTE a Hacienda"
                                      : "Emitir DTE a Hacienda"}
                                  </DropdownMenuItem>
                                )}

                              {sale.dteResponse?.estado === "PROCESADO" &&
                                sale.status === "COMPLETADA" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedSale(sale);
                                        setEmailModalOpen(true);
                                      }}
                                      className="font-bold cursor-pointer"
                                    >
                                      <Mail
                                        size={14}
                                        className="mr-2 text-indigo-500"
                                      />{" "}
                                      Enviar Correo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openNoteModal(sale, "CREDITO")
                                      }
                                      className="font-bold cursor-pointer"
                                    >
                                      <FileMinus2
                                        size={14}
                                        className="mr-2 text-amber-500"
                                      />{" "}
                                      Emitir Nota de Crédito
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openNoteModal(sale, "DEBITO")
                                      }
                                      className="font-bold cursor-pointer"
                                    >
                                      <FilePlus2
                                        size={14}
                                        className="mr-2 text-blue-500"
                                      />{" "}
                                      Emitir Nota de Débito
                                    </DropdownMenuItem>
                                  </>
                                )}

                              {sale.status === "COMPLETADA" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleInitiateReturn(sale)}
                                    className="font-bold text-[var(--primary)] focus:bg-[var(--accent)] cursor-pointer"
                                  >
                                    <RotateCcw
                                      size={14}
                                      className="mr-2 text-[var(--primary)]"
                                    />{" "}
                                    Registrar Devolución
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedSale(sale);
                                      setVoidModalOpen(true);
                                    }}
                                    className="font-bold text-destructive focus:bg-destructive/10 cursor-pointer"
                                  >
                                    <Trash2 size={14} className="mr-2" /> Anular
                                    Factura
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/5">
                <p className="text-xs font-bold text-[var(--text-sec)]">
                  Página {pagination.page} de {pagination.totalPages} (
                  {pagination.total} ventas)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page - 1 }))
                    }
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page + 1 }))
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <Card className="p-4 border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">
                  Estado Devolución
                </Label>
                <Select
                  value={retStatusFilter}
                  onValueChange={setRetStatusFilter}
                >
                  <SelectTrigger className="bg-[var(--bg)]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                    <SelectItem value="APROBADA">Aprobadas</SelectItem>
                    <SelectItem value="COMPLETADA">Completadas</SelectItem>
                    <SelectItem value="RECHAZADA">Rechazadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-[1.2] w-full space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">
                  Venta Original (#)
                </Label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]"
                  />
                  <Input
                    type="number"
                    placeholder="Ej. 402"
                    value={retSaleIdFilter}
                    onChange={(e) => setRetSaleIdFilter(e.target.value)}
                    className="pl-9 bg-[var(--bg)]"
                  />
                </div>
              </div>

              <div className="flex-1 w-full space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">
                  Desde
                </Label>
                <div className="relative">
                  <CalendarIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]"
                  />
                  <Input
                    type="date"
                    value={retStartDateFilter}
                    onChange={(e) => setRetStartDateFilter(e.target.value)}
                    className="pl-9 bg-[var(--bg)]"
                  />
                </div>
              </div>

              <div className="flex-1 w-full space-y-1.5">
                <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">
                  Hasta
                </Label>
                <div className="relative">
                  <CalendarIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]"
                  />
                  <Input
                    type="date"
                    value={retEndDateFilter}
                    onChange={(e) => setRetEndDateFilter(e.target.value)}
                    className="pl-9 bg-[var(--bg)]"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={resetReturnsFilters}
                className="font-bold"
              >
                <Filter size={16} className="mr-2" /> Limpiar
              </Button>
            </div>
          </Card>

          <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold w-[120px]">
                      Devolución
                    </TableHead>
                    <TableHead className="font-bold">Fecha</TableHead>
                    <TableHead className="font-bold">Venta Orig.</TableHead>
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">Motivo</TableHead>
                    <TableHead className="font-bold text-right">
                      Reintegro
                    </TableHead>
                    <TableHead className="font-bold text-center">
                      Estado
                    </TableHead>
                    <TableHead className="font-bold text-center">
                      Nota de Crédito
                    </TableHead>
                    <TableHead className="font-bold text-right w-[80px]">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-16" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-28" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-12" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-32" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-20" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-4 bg-muted animate-pulse rounded w-16 ml-auto" />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="h-6 bg-muted animate-pulse rounded-full w-20 mx-auto" />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="h-4 bg-muted animate-pulse rounded w-24 mx-auto" />
                        </TableCell>
                        <TableCell>
                          <div className="h-8 bg-muted animate-pulse rounded w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : returnsList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-12 text-[var(--text-sec)]"
                      >
                        No se encontraron devoluciones registradas con los
                        filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    returnsList.map((ret) => (
                      <TableRow
                        key={ret.id}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <TableCell className="font-bold text-[var(--primary)]">
                          #DEV-{ret.id.toString().padStart(6, "0")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(ret.createdAt).toLocaleDateString()}{" "}
                          {new Date(ret.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="font-bold text-xs">
                          #{ret.saleId.toString().padStart(6, "0")}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-[var(--text-main)]">
                          {ret.sale?.customer?.name || "Cliente General"}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-sec)]">
                          {getReasonBadge(ret.reason)}
                        </TableCell>
                        <TableCell className="text-right font-black text-emerald-600">
                          ${Number(ret.totalRefund).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getReturnStatusBadge(ret.status)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {ret.dteCreditNoteCode ? (
                            <div className="flex flex-col items-center">
                              <Badge
                                variant="outline"
                                className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-mono text-[10px]"
                              >
                                {ret.dteCreditNoteCode.substring(0, 8)}...
                              </Badge>
                              <span className="text-[9px] text-[var(--text-sec)] mt-0.5">
                                DTE 05 Emitido
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--text-sec)] text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenReturnDetail(ret)}
                            className="h-8 w-8 hover:bg-[var(--accent)] hover:text-[var(--primary)] cursor-pointer"
                          >
                            <Eye size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {returnsPagination.totalPages > 1 && (
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/5">
                <p className="text-xs font-bold text-[var(--text-sec)]">
                  Página {returnsPagination.page} de{" "}
                  {returnsPagination.totalPages} ({returnsPagination.total}{" "}
                  registros)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={returnsPagination.page === 1}
                    onClick={() =>
                      setReturnsPagination((p) => ({ ...p, page: p.page - 1 }))
                    }
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      returnsPagination.page === returnsPagination.totalPages
                    }
                    onClick={() =>
                      setReturnsPagination((p) => ({ ...p, page: p.page + 1 }))
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* --- MODAL DETALLE --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent
          className="flex flex-col p-0 overflow-hidden bg-[var(--card)] border-[var(--border)]"
          style={{ maxWidth: "900px", width: "90vw", maxHeight: "90vh" }}
        >
          {selectedSale && (
            <>
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #dte-print-section, #dte-print-section * { visibility: visible; }
                  #dte-print-section {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white !important;
                    color: black !important;
                  }
                  .hide-on-print { display: none !important; }
                  
                  /* Override Radix Dialog for printing */
                  div[role="dialog"] {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    transform: none !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    max-height: none !important;
                    height: auto !important;
                    overflow: visible !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                  }
                  .overflow-y-auto {
                    overflow: visible !important;
                    max-height: none !important;
                  }
                }
              `}</style>
              <div
                id="dte-print-section"
                className="w-full flex flex-col flex-1 min-h-0"
              >
                <div className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50 relative">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide">
                        Detalle de Factura Electrónica
                      </h2>
                      <p className="text-sm font-mono text-[var(--text-sec)]">
                        {selectedSale.dteResponse?.codigoGeneracion ||
                          `Venta Interna #${selectedSale.id.toString().padStart(6, "0")}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 p-6">
                  <div className="space-y-8">
                    {/* ESTADO BANNER */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          className={
                            selectedSale.dteResponse?.estado === "PROCESADO"
                              ? "text-emerald-500"
                              : "text-[var(--text-sec)]"
                          }
                          size={24}
                        />
                        <div>
                          <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">
                            Estado en Hacienda
                          </p>
                          <p
                            className={cn(
                              "text-sm font-black uppercase",
                              selectedSale.dteResponse?.estado === "PROCESADO"
                                ? "text-emerald-600"
                                : "text-[var(--text-main)]",
                            )}
                          >
                            {selectedSale.dteResponse?.estado || "NO ENVIADO"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right mt-4 sm:mt-0">
                        <p className="text-sm font-bold text-[var(--text-main)]">
                          {new Date(selectedSale.createdAt).toLocaleString(
                            "es-ES",
                          )}
                        </p>
                        <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">
                          Fecha Procesamiento
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* IDENTIFICACION */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                          <Hash size={16} className="text-[var(--text-sec)]" />
                          <h3 className="text-xs font-black text-[var(--text-sec)] uppercase tracking-widest">
                            Identificación
                          </h3>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">
                              Número de Control
                            </p>
                            <div className="bg-[var(--bg)] px-3 py-2 rounded-md border border-[var(--border)] font-mono text-sm text-[var(--text-main)]">
                              {selectedSale.dteResponse?.numeroControl || "N/A"}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">
                              Código de Generación
                            </p>
                            <div className="bg-[var(--bg)] px-3 py-2 rounded-md border border-[var(--border)] font-mono text-sm text-amber-600 font-bold break-all">
                              {selectedSale.dteResponse?.codigoGeneracion ||
                                "N/A"}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">
                                Serie / POS
                              </p>
                              <p className="font-bold text-[var(--text-main)] uppercase">
                                {selectedSale.dteResponse?.serie || "P001"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">
                                Ambiente
                              </p>
                              <p className="font-bold text-[var(--text-main)] uppercase">
                                {selectedSale.dteResponse?.ambiente || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RECEPTOR */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                          <User size={16} className="text-[var(--text-sec)]" />
                          <h3 className="text-xs font-black text-[var(--text-sec)] uppercase tracking-widest">
                            Receptor / Cliente
                          </h3>
                        </div>

                        <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-4 space-y-4">
                          <div>
                            <p className="font-bold text-[var(--text-main)] text-base">
                              {selectedSale.customer?.name ||
                                "Consumidor Final"}
                            </p>
                            <p className="text-sm text-[var(--text-sec)]">
                              {selectedSale.customer?.email || "Sin correo"}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">
                                Documento
                              </p>
                              <p className="font-medium text-[var(--text-main)] text-sm">
                                {selectedSale.customer?.nit ||
                                  selectedSale.customer?.documentNumber ||
                                  "S/N"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">
                                NRC
                              </p>
                              <p className="font-medium text-[var(--text-main)] text-sm">
                                {selectedSale.customer?.customerType ===
                                "CONTRIBUYENTE"
                                  ? "S/N"
                                  : "S/N"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PRODUCTOS */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                        <Package size={16} className="text-[var(--text-sec)]" />
                        <h3 className="text-xs font-black text-[var(--text-sec)] uppercase tracking-widest">
                          Detalle de Productos / Servicios
                        </h3>
                      </div>

                      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg)]">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-[var(--border)] hover:bg-transparent">
                              <TableHead className="text-[10px] font-black tracking-widest uppercase text-[var(--text-sec)]">
                                Cant
                              </TableHead>
                              <TableHead className="text-[10px] font-black tracking-widest uppercase text-[var(--text-sec)]">
                                Descripción
                              </TableHead>
                              <TableHead className="text-[10px] font-black tracking-widest uppercase text-[var(--text-sec)] text-right">
                                P. Unit
                              </TableHead>
                              <TableHead className="text-[10px] font-black tracking-widest uppercase text-[var(--text-sec)] text-right">
                                Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedSale.items?.map((item) => (
                              <TableRow
                                key={item.id}
                                className="border-b border-[var(--border)]/50 hover:bg-transparent"
                              >
                                <TableCell className="font-bold text-[var(--text-main)]">
                                  {item.quantity}
                                </TableCell>
                                <TableCell>
                                  <p className="font-bold text-[var(--text-main)] uppercase">
                                    {item.product?.name}
                                  </p>
                                  <p className="text-[10px] text-[var(--text-sec)] uppercase">
                                    Cód: {item.product?.id}
                                  </p>
                                </TableCell>
                                <TableCell className="text-right text-[var(--text-sec)] font-medium">
                                  ${Number(item.unitPrice).toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right font-black text-amber-500">
                                  ${Number(item.totalPrice).toFixed(4)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="p-4 border-t border-[var(--border)] flex justify-end bg-[var(--bg)]/50">
                          <div className="flex items-center gap-8">
                            <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-widest">
                              Total a Pagar
                            </p>
                            <p className="text-xl font-black text-amber-500">
                              ${Number(selectedSale.totalAmount).toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2 text-[var(--text-sec)]">
                        <Building2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Emisor: Agroferr D'Campo
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                        MH-API-V2 / DTE-01
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/50 flex justify-end gap-4 hide-on-print">
                <Button
                  onClick={() => setDetailModalOpen(false)}
                  variant="outline"
                  className="font-bold px-8"
                >
                  CERRAR DETALLE
                </Button>
                <Button
                  onClick={() => printFacturaSheet(selectedSale)}
                  className="font-bold px-8 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Printer size={18} />
                  IMPRIMIR / PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL ANULACIÓN --- */}
      <Dialog open={voidModalOpen} onOpenChange={setVoidModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-[var(--card)] border-[var(--border)]">
          {/* HEADER */}
          <div className="p-6 border-b border-[var(--border)] flex items-start gap-4">
            <div className="size-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide">
                Anular Factura
              </h2>
              <p className="text-sm font-mono text-[var(--text-sec)]">
                {selectedSale?.dteResponse?.codigoGeneracion ||
                  `FAC-${selectedSale?.id.toString().padStart(5, "0")}`}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* ALERT BANNER */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-600">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">
                Esta acción enviará una solicitud de <b>Invalidación</b> a
                Hacienda. Completa los datos requeridos.
              </p>
            </div>

            <form onSubmit={handleVoidSubmit} className="space-y-6">
              {/* MOTIVO */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                  Motivo de anulación (Descripción)
                </Label>
                <Input
                  required
                  placeholder="Ej. Error en datos del receptor"
                  value={voidForm.motivoAnulacion}
                  onChange={(e) =>
                    setVoidForm({
                      ...voidForm,
                      motivoAnulacion: e.target.value,
                    })
                  }
                  className="bg-[var(--bg)]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* RESPONSABLE */}
                <div className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-blue-500">
                      Responsable (Cajero)
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">
                      Nombre Completo
                    </Label>
                    <Input
                      required
                      value={voidForm.nombreResponsable}
                      onChange={(e) =>
                        setVoidForm({
                          ...voidForm,
                          nombreResponsable: e.target.value,
                        })
                      }
                      className="bg-[var(--bg)]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">
                        Tipo Doc.
                      </Label>
                      <Select
                        value={voidForm.tipDocResponsable}
                        onValueChange={(v) =>
                          setVoidForm({ ...voidForm, tipDocResponsable: v })
                        }
                      >
                        <SelectTrigger className="bg-[var(--bg)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="13">DUI</SelectItem>
                          <SelectItem value="36">NIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">
                        No. Documento
                      </Label>
                      <Input
                        required
                        placeholder="00000000-0"
                        value={voidForm.numDocResponsable}
                        onChange={(e) =>
                          setVoidForm({
                            ...voidForm,
                            numDocResponsable: e.target.value,
                          })
                        }
                        className="bg-[var(--bg)]"
                      />
                    </div>
                  </div>
                </div>

                {/* SOLICITANTE */}
                <div className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-emerald-500">
                      Solicitante (Cliente)
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">
                      Nombre Completo
                    </Label>
                    <Input
                      required
                      value={voidForm.nombreSolicita}
                      onChange={(e) =>
                        setVoidForm({
                          ...voidForm,
                          nombreSolicita: e.target.value,
                        })
                      }
                      className="bg-[var(--bg)]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">
                        Tipo Doc.
                      </Label>
                      <Select
                        value={voidForm.tipDocSolicita}
                        onValueChange={(v) =>
                          setVoidForm({ ...voidForm, tipDocSolicita: v })
                        }
                      >
                        <SelectTrigger className="bg-[var(--bg)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="13">DUI</SelectItem>
                          <SelectItem value="36">NIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">
                        No. Documento
                      </Label>
                      <Input
                        required
                        placeholder="00000000-0"
                        value={voidForm.numDocSolicita}
                        onChange={(e) =>
                          setVoidForm({
                            ...voidForm,
                            numDocSolicita: e.target.value,
                          })
                        }
                        className="bg-[var(--bg)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="font-bold py-6"
                  onClick={() => setVoidModalOpen(false)}
                >
                  REGRESAR
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="font-bold py-6"
                  disabled={voiding}
                >
                  {voiding ? "PROCESANDO..." : "INVALIDAR DOCUMENTO"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL EMAIL --- */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reenviar DTE</DialogTitle>
            <DialogDescription>
              Envíe una copia del PDF y JSON al correo del cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Correo electrónico (opcional)</Label>
              <Input
                type="email"
                placeholder="Si está vacío se usará el original"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResendEmail} disabled={sendingEmail}>
              {sendingEmail ? "Enviando..." : "Enviar Correo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL NOTA DE CRÉDITO/DÉBITO --- */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {noteType === "CREDITO" ? (
                <FileMinus2 className="text-amber-500" />
              ) : (
                <FilePlus2 className="text-blue-500" />
              )}
              Emitir Nota de {noteType === "CREDITO" ? "Crédito" : "Débito"} -
              Venta #{selectedSale?.id.toString().padStart(6, "0")}
            </DialogTitle>
            <DialogDescription>
              Ajuste las cantidades de los productos para emitir la nota de{" "}
              {noteType.toLowerCase()}. Los productos con cantidad 0 serán
              excluidos.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden">
            <Table>
              <TableHeader className="bg-[var(--bg)]">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cant. Original</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-center w-32">
                    Cant. Ajustar
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noteItems.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-bold">
                      {item.product?.name}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(item.unitPrice).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-20 mx-auto text-center h-8"
                        value={item.adjustQuantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newItems = [...noteItems];
                          newItems[index].adjustQuantity = val;
                          setNoteItems(newItems);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setNoteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleNoteSubmit}
              disabled={sendingNote}
              className={
                noteType === "CREDITO"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            >
              {sendingNote ? "Procesando..." : `Confirmar Nota de ${noteType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL REPORTE MENSUAL --- */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Reporte Mensual</DialogTitle>
            <DialogDescription>
              Se enviará un archivo ZIP con todos los PDFs y JSONs del mes
              seleccionado a su correo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select
                  value={reportForm.month.toString()}
                  onValueChange={(v) =>
                    setReportForm({ ...reportForm, month: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {new Date(2000, m - 1).toLocaleString("es-ES", {
                          month: "long",
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Año</Label>
                <Select
                  value={reportForm.year.toString()}
                  onValueChange={(v) =>
                    setReportForm({ ...reportForm, year: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                required
                placeholder="admin@ferreteria.com"
                value={reportForm.email}
                onChange={(e) =>
                  setReportForm({ ...reportForm, email: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRequestReport}
              disabled={requestingReport || !reportForm.email}
            >
              {requestingReport ? "Enviando..." : "Solicitar Reporte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL CREACIÓN DE DEVOLUCIÓN --- */}
      <Dialog
        open={createReturnModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateReturnModalOpen(false);
            resetCreateFlow();
          }
        }}
      >
        <DialogContent
          className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-[var(--card)] border-[var(--border)]"
          style={{ maxWidth: "900px", width: "90vw" }}
        >
          {/* HEADER */}
          <div className="p-6 border-b border-[var(--border)] flex items-start gap-4 bg-[var(--bg)]/50">
            <div className="size-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
              <RotateCcw size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide">
                Registrar Devolución
              </h2>
              <p className="text-sm font-mono text-[var(--text-sec)]">
                {activeSale
                  ? `Venta #${activeSale.id.toString().padStart(6, "0")}`
                  : "Buscar Venta"}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* SEARCH SALE IF NOT PRE-LOADED */}
            {!activeSale && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                      Buscar Venta por ID
                    </Label>
                    <Input
                      placeholder="Ej. 13"
                      value={searchSaleId}
                      onChange={(e) => setSearchSaleId(e.target.value)}
                      className="bg-[var(--bg)]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearchSale();
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleSearchSale}
                      disabled={searchingSale || !searchSaleId}
                      className="font-bold"
                    >
                      {searchingSale ? "Buscando..." : "Buscar Venta"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeSale && (
              <div className="space-y-6">
                {/* INFO PANEL */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]/30">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-sec)] block">
                      Cliente
                    </span>
                    <span className="font-bold text-[var(--text-main)] text-sm">
                      {activeSale.customer?.name || "Cliente General"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-sec)] block">
                      Fecha de Venta
                    </span>
                    <span className="font-bold text-[var(--text-main)] text-sm">
                      {new Date(activeSale.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-sec)] block">
                      Monto Total
                    </span>
                    <span className="font-bold text-amber-500 text-sm">
                      ${Number(activeSale.totalAmount).toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                    Productos a Devolver
                  </Label>
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[var(--bg)]/50">
                        <TableRow>
                          <TableHead className="font-bold text-xs uppercase">
                            Producto
                          </TableHead>
                          <TableHead className="font-bold text-center text-xs uppercase">
                            Comprado
                          </TableHead>
                          <TableHead className="font-bold text-center text-xs uppercase">
                            Devuelto
                          </TableHead>
                          <TableHead className="font-bold text-right text-xs uppercase">
                            Precio Unit.
                          </TableHead>
                          <TableHead className="font-bold text-center w-32 text-xs uppercase">
                            A Devolver
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemsToReturn.map((item, index) => {
                          const qtyDevuelta = returnedMap[item.saleItemId] || 0;
                          return (
                            <TableRow key={item.saleItemId}>
                              <TableCell className="font-bold text-sm">
                                {item.productName}
                              </TableCell>
                              <TableCell className="text-center text-sm font-semibold text-[var(--text-main)]">
                                {item.quantityPurchased}
                              </TableCell>
                              <TableCell className="text-center text-sm text-rose-500 font-semibold">
                                {qtyDevuelta}
                              </TableCell>
                              <TableCell className="text-right text-sm font-bold text-[var(--text-main)]">
                                ${Number(item.unitPrice).toFixed(4)}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    className="h-7 w-7 border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--accent)] text-[var(--text-main)] font-black"
                                    onClick={() => {
                                      const newItems = [...itemsToReturn];
                                      newItems[index].quantity = Math.max(
                                        0,
                                        newItems[index].quantity - 1,
                                      );
                                      setItemsToReturn(newItems);
                                    }}
                                    disabled={item.quantity <= 0}
                                  >
                                    -
                                  </Button>
                                  <span className="w-8 text-center font-bold text-sm text-[var(--text-main)]">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    className="h-7 w-7 border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--accent)] text-[var(--text-main)] font-black"
                                    onClick={() => {
                                      const newItems = [...itemsToReturn];
                                      newItems[index].quantity = Math.min(
                                        item.maxQuantity,
                                        newItems[index].quantity + 1,
                                      );
                                      setItemsToReturn(newItems);
                                    }}
                                    disabled={item.quantity >= item.maxQuantity}
                                  >
                                    +
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* FORM FIELDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                      Motivo de Devolución
                    </Label>
                    <Select
                      value={returnReason}
                      onValueChange={(v: any) => setReturnReason(v)}
                    >
                      <SelectTrigger className="bg-[var(--bg)]">
                        <SelectValue placeholder="Seleccione motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRODUCTO_DEFECTUOSO">
                          Producto Defectuoso
                        </SelectItem>
                        <SelectItem value="ERROR_EN_VENTA">
                          Error en Venta / Cajero
                        </SelectItem>
                        <SelectItem value="CAMBIO_DE_PRODUCTO">
                          Cambio de Producto
                        </SelectItem>
                        <SelectItem value="INSATISFACCION_CLIENTE">
                          Insatisfacción del Cliente
                        </SelectItem>
                        <SelectItem value="OTRO">Otro Motivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                      Notas / Observaciones
                    </Label>
                    <Input
                      placeholder="Ej. El empaque venía roto o dañado"
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      className="bg-[var(--bg)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t border-[var(--border)] bg-[var(--bg)]/30 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCreateReturnModalOpen(false);
                resetCreateFlow();
              }}
              className="font-bold px-6"
            >
              CANCELAR
            </Button>
            {activeSale && (
              <Button
                onClick={handleCreateReturnSubmit}
                disabled={savingReturn}
                className="font-bold px-6"
              >
                {savingReturn ? "REGISTRANDO..." : "REGISTRAR DEVOLUCIÓN"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DETALLE Y EVALUACIÓN DE DEVOLUCIÓN --- */}
      <Dialog
        open={detailReturnModalOpen}
        onOpenChange={setDetailReturnModalOpen}
      >
        <DialogContent
          className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-[var(--card)] border-[var(--border)]"
          style={{ maxWidth: "900px", width: "90vw" }}
        >
          {/* HEADER */}
          <div className="p-6 border-b border-[var(--border)] flex items-start gap-4 bg-[var(--bg)]/50">
            <div className="size-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
              <RotateCcw size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide">
                  Detalle de Devolución
                </h2>
                {selectedReturn && getReturnStatusBadge(selectedReturn.status)}
              </div>
              <p className="text-sm font-mono text-[var(--text-sec)]">
                {selectedReturn
                  ? `DEV-${selectedReturn.id.toString().padStart(6, "0")}`
                  : ""}
              </p>
            </div>
          </div>

          {selectedReturn && (
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* METADATA CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* GENERAL INFO */}
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]/30 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-sec)] block">
                    Información General
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-[var(--text-main)]">
                      <span className="text-[var(--text-sec)] font-normal">
                        Venta Origen:
                      </span>{" "}
                      Venta #{selectedReturn.saleId.toString().padStart(6, "0")}
                    </p>
                    <p className="font-semibold text-[var(--text-main)]">
                      <span className="text-[var(--text-sec)] font-normal">
                        Fecha Solicitud:
                      </span>{" "}
                      {new Date(selectedReturn.createdAt).toLocaleDateString()}{" "}
                      {new Date(selectedReturn.createdAt).toLocaleTimeString()}
                    </p>
                    <p className="font-semibold text-[var(--text-main)]">
                      <span className="text-[var(--text-sec)] font-normal">
                        Cajero:
                      </span>{" "}
                      {selectedReturn.user?.fullName || "Desconocido"}
                    </p>
                  </div>
                </div>

                {/* CLIENT INFO */}
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]/30 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-sec)] block">
                    Cliente
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm text-[var(--text-main)]">
                      {selectedReturn.sale?.customer?.name ||
                        "Consumidor Final"}
                    </p>
                    {selectedReturn.sale?.customer?.nit && (
                      <p className="font-mono text-[var(--text-sec)]">
                        NIT: {selectedReturn.sale.customer.nit}
                      </p>
                    )}
                    {selectedReturn.sale?.customer?.documentNumber && (
                      <p className="font-mono text-[var(--text-sec)]">
                        DUI/DOC: {selectedReturn.sale.customer.documentNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* MOTIVO & OBSERVACIONES */}
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]/30 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-sec)] block">
                    Motivo & Observaciones
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-amber-600">
                      {getReasonBadge(selectedReturn.reason)}
                    </p>
                    <p className="text-[var(--text-sec)] italic">
                      "{selectedReturn.notes || "Sin observaciones"}"
                    </p>
                  </div>
                </div>
              </div>

              {/* ITEMS TABLE */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                  Artículos a Devolver
                </span>
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[var(--bg)]/50">
                      <TableRow>
                        <TableHead className="font-bold">Producto</TableHead>
                        <TableHead className="font-bold text-center">
                          Cantidad
                        </TableHead>
                        <TableHead className="font-bold text-right">
                          Precio Unit.
                        </TableHead>
                        <TableHead className="font-bold text-right">
                          Total Devolución
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-bold text-sm text-[var(--text-main)]">
                            {item.product?.name || "Producto Desconocido"}
                          </TableCell>
                          <TableCell className="text-center text-sm font-semibold text-[var(--text-main)]">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-[var(--text-main)]">
                            ${Number(item.unitPrice).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-black text-emerald-600">
                            ${Number(item.subtotal).toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/50 flex justify-end">
                    <div className="flex items-center gap-8">
                      <span className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-widest">
                        Total Reintegro
                      </span>
                      <span className="text-xl font-black text-emerald-600">
                        ${Number(selectedReturn.totalRefund).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DTE CREDIT NOTE DETAILS IF EMITTED */}
              {selectedReturn.dteCreditNoteCode && (
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block">
                    Nota de Crédito Electrónica (DTE 05)
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-[var(--text-main)]">
                      <span className="text-[var(--text-sec)] font-normal">
                        Código de Generación:
                      </span>{" "}
                      <span className="font-mono text-indigo-600 font-bold">
                        {selectedReturn.dteCreditNoteCode}
                      </span>
                    </p>
                    {selectedReturn.dteCreditNoteSello && (
                      <p className="font-semibold text-[var(--text-main)]">
                        <span className="text-[var(--text-sec)] font-normal">
                          Sello de Recepción:
                        </span>{" "}
                        <span className="font-mono text-indigo-600 font-bold">
                          {selectedReturn.dteCreditNoteSello}
                        </span>
                      </p>
                    )}
                    <p className="font-semibold text-[var(--text-main)]">
                      <span className="text-[var(--text-sec)] font-normal">
                        Estado en Hacienda:
                      </span>{" "}
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                        {selectedReturn.dteCreditNoteEstado || "PROCESADO"}
                      </Badge>
                    </p>
                  </div>
                </div>
              )}

              {/* PENDING APPROVAL WORKFLOW PANEL */}
              {selectedReturn.status === "PENDIENTE" && canApprove && (
                <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)] block">
                    Panel de Evaluación de Supervisor
                  </span>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-[var(--text-sec)]">
                        Notas del Evaluador (Requerido para rechazo)
                      </Label>
                      <Input
                        placeholder="Ej. Devolución aceptada tras revisión física de la mercancía"
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="bg-[var(--bg)]"
                      />
                    </div>

                    {/* DTE 05 CHECKBOX */}
                    {selectedReturn.sale?.dteResponse?.codigoGeneracion && (
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="emit-credit-note-chk"
                          checked={emitCreditNote}
                          onChange={(e) => setEmitCreditNote(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <Label
                          htmlFor="emit-credit-note-chk"
                          className="text-xs font-semibold cursor-pointer text-[var(--text-main)]"
                        >
                          Emitir Nota de Crédito Electrónica en Hacienda (DTE
                          05) de forma automática al aprobar
                        </Label>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateReturnStatus("RECHAZADA")}
                        disabled={submittingStatus}
                        className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-bold"
                      >
                        RECHAZAR SOLICITUD
                      </Button>
                      <Button
                        onClick={() => handleUpdateReturnStatus("APROBADA")}
                        disabled={submittingStatus}
                        className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
                      >
                        {submittingStatus
                          ? "PROCESANDO..."
                          : "APROBAR Y LIQUIDAR"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* NON-PENDING LOGS */}
              {selectedReturn.status !== "PENDIENTE" && (
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]/10 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-sec)] block">
                    Detalle de Resolución
                  </span>
                  <p className="text-xs font-semibold text-[var(--text-main)]">
                    <span className="text-[var(--text-sec)] font-normal">
                      Estado Final:
                    </span>{" "}
                    <span
                      className={
                        selectedReturn.status === "APROBADA" ||
                        selectedReturn.status === "COMPLETADA"
                          ? "text-emerald-600 font-bold"
                          : "text-rose-600 font-bold"
                      }
                    >
                      {selectedReturn.status}
                    </span>
                  </p>
                  {selectedReturn.notes && (
                    <p className="text-xs font-semibold text-[var(--text-main)]">
                      <span className="text-[var(--text-sec)] font-normal">
                        Comentarios de Supervisor:
                      </span>{" "}
                      "{selectedReturn.notes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <div className="p-6 border-t border-[var(--border)] bg-[var(--bg)]/30 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setDetailReturnModalOpen(false)}
              className="font-bold px-8"
            >
              CERRAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
