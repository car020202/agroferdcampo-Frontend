import { useState, useEffect, useRef } from "react";
import logo from "../../assets/logo.png";
import { useNavigate } from "react-router";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  DollarSign,
  Printer,
  Package,
  UserPlus,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  FileText,
  Lock,
  Unlock,
  Save,
  Calendar as CalendarIcon,
  Upload,
  ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { apiRequest } from "../config/api";
import { createSale, sendFacturaConsumidor, sendCreditoFiscal } from "../services/sales.service";
import { createPreSale, PreSaleTicket } from "../services/pre-sales.service";
import { uploadsService } from "../services/uploads.service";
import { cashShiftsService, CashShift, BillsBreakdown, CoinsBreakdown, OpenShiftPayload, CloseShiftPayload } from "../services/cash-shifts.service";
import { quotesService } from "../services/quotes.service";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { NumberInput } from "../components/ui/number-input";
import { CustomerQuickCreate } from "../components/customers/CustomerQuickCreate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { cn } from "../components/ui/utils";
import { useAuth } from "../context/AuthContext";
import { ScrollArea } from "../components/ui/scroll-area";
import { Label } from "../components/ui/label";
import { SystemConfigData } from "./SystemConfig";
import { TransportSelector, TransportData } from "../components/transport/TransportSelector";

// --- Types ---
interface Product {
  id: number;
  internalCode: string;
  name: string;
  price: number;
  stock: number;
  category: { name: string };
  unit: string;
  units?: {
    id: number;
    unit: string;
    factor: number;
    priceDetalle?: number;
    priceMayorista?: number;
  }[];
}

interface CartUnitSelection {
  id: string;
  unitType: string;
  unitFactor: number;
  quantity: number;
  price: number;
  originalPrice: number;
}

interface CartItem extends Product {
  selections: CartUnitSelection[];
}

interface Customer {
  id: number;
  name: string;
  customerType: string;
  nit?: string;
  documentNumber?: string;
  creditLimit: string | number;
  creditBalance: string | number;
}

interface DatePickerProps {
  date?: Date;
  setDate: (date?: Date) => void;
  placeholder?: string;
}

function DatePicker({ date, setDate, placeholder }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-[var(--bg)] border-[var(--border)] h-10 px-3 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/50 hover:text-[var(--text-main)] transition-all text-sm rounded-lg focus:ring-[var(--primary)]/20",
            !date ? "text-[var(--text-sec)]" : "text-[var(--text-main)]"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-[var(--primary)]" />
          {date ? (
            <span className="font-bold">
              {format(date, "dd/MM/yyyy")}
            </span>
          ) : (
            <span>{placeholder || "dd/mm/aaaa"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-[var(--border)] shadow-2xl rounded-2xl overflow-hidden" align="start">
        <div className="bg-[var(--card)] p-1">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            locale={es}
            className="p-3"
            captionLayout="dropdown-buttons"
            fromYear={new Date().getFullYear()}
            toYear={new Date().getFullYear() + 2}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
          <div className="flex items-center justify-between p-3 border-t border-[var(--border)] bg-[var(--bg)]/50">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDate(undefined)} 
              className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
            >
              Borrar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDate(new Date())} 
              className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
            >
              Hoy
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function calcBreakdownTotal(bills: BillsBreakdown, coins: CoinsBreakdown): number {
  let cents = 0;
  cents += bills.d100 * 10000;
  cents += bills.d50  * 5000;
  cents += bills.d20  * 2000;
  cents += bills.d10  * 1000;
  cents += bills.d5   * 500;
  cents += bills.d1   * 100;
  cents += coins.c25  * 25;
  cents += coins.c10  * 10;
  cents += coins.c5   * 5;
  cents += coins.c1   * 1;
  return cents / 100;
}

let isCheckoutSubmittingGlobal = false;
let isQuoteSubmittingGlobal = false;

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

export function POS() {
  const navigate = useNavigate();
  const isSubmittingRef = useRef(false);
  const checkoutBtnRef = useRef<HTMLButtonElement>(null);
  const quoteBtnRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('pos-cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<
    "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CREDITO"
  >("EFECTIVO");
  
  // System Config
  const [sysConfig, setSysConfig] = useState<SystemConfigData | null>(null);
  const [branchPaymentConfig, setBranchPaymentConfig] = useState<any>(null);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  
  // Checkout Errors
  const [checkoutErrorAlert, setCheckoutErrorAlert] = useState<string | null>(null);

  // New Checkout States
  const [processingOverlay, setProcessingOverlay] = useState(false);
  const [showMixedPaymentModal, setShowMixedPaymentModal] = useState(false);
  const [payments, setPayments] = useState<{ paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'; amount: number; reference?: string; transferReceiptUrl?: string }[]>([]);
  const [uploadingReceipt, setUploadingReceipt] = useState<Record<number, boolean>>({});

  // Cash Shift States
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [availableRegisters, setAvailableRegisters] = useState<any[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>("");
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [openBills, setOpenBills] = useState<BillsBreakdown>({ d100:0, d50:0, d20:0, d10:0, d5:0, d1:0 });
  const [openCoins, setOpenCoins] = useState<CoinsBreakdown>({ c25:0, c10:0, c5:0, c1:0 });
  const [openNotes, setOpenNotes] = useState("");
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [closeBills, setCloseBills] = useState<BillsBreakdown>({ d100:0, d50:0, d20:0, d10:0, d5:0, d1:0 });
  const [closeCoins, setCloseCoins] = useState<CoinsBreakdown>({ c25:0, c10:0, c5:0, c1:0 });
  const [closeNotes, setCloseNotes] = useState("");
  const [closeSummary, setCloseSummary] = useState<{ expectedAmount: number; countedCash: number; difference: number } | null>(null);
  const [closeExpectedTotals, setCloseExpectedTotals] = useState<{ expectedAmount: number; expectedTarjeta: number; expectedTransferencia: number } | null>(null);

  const [showTransferSafeModal, setShowTransferSafeModal] = useState(false);
  const [transferBills, setTransferBills] = useState<BillsBreakdown>({ d100:0, d50:0, d20:0, d10:0, d5:0, d1:0 });
  const [transferCoins, setTransferCoins] = useState<CoinsBreakdown>({ c25:0, c10:0, c5:0, c1:0 });

  const canCloseDirectly = ["ADMINISTRADOR", "PROPIETARIO", "SUPERVISOR"].includes(user?.role || "");

  // Quote States
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteValidDays, setQuoteValidDays] = useState<number | "">(15);
  const [checkoutDueDate, setCheckoutDueDate] = useState("");

  // Pre-venta (Ticket) States
  const [showPreSaleModal, setShowPreSaleModal] = useState(false);
  const [preSaleDescription, setPreSaleDescription] = useState("");
  const [preSaleLoading, setPreSaleLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<PreSaleTicket | null>(null);

  // Transport State
  const [transportData, setTransportData] = useState<TransportData | null>(null);

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const handleDateChange = (date?: Date) => {
    if (date) {
      setCheckoutDueDate(format(date, "yyyy-MM-dd"));
    } else {
      setCheckoutDueDate("");
    }
  };

  // Initial Load
  useEffect(() => {
    if (user) {
      checkActiveShift();
      searchProducts("");
      loadSysConfig();
      loadBranchPaymentConfig();
    }
  }, [user]);

  // Persistir carrito en sessionStorage para sobrevivir recargas de página
  useEffect(() => {
    try {
      if (cart.length > 0) {
        sessionStorage.setItem('pos-cart', JSON.stringify(cart));
      } else {
        sessionStorage.removeItem('pos-cart');
      }
    } catch {
      // sessionStorage no disponible
    }
  }, [cart]);

  const loadBranchPaymentConfig = async () => {
    try {
      const branches = await apiRequest<any[]>("/branches");
      const current = branches.find(b => b.name === user?.branch);
      if (current) {
        setBranchPaymentConfig({
          acceptsCash: current.acceptsCash ?? true,
          acceptsCard: current.acceptsCard ?? true,
          acceptsTransfer: current.acceptsTransfer ?? true,
          acceptsCredit: current.acceptsCredit ?? true,
        });
      }
    } catch (err) {
      console.error("Error loading branch config:", err);
    }
  };

  const loadSysConfig = async () => {
    try {
      const data = await apiRequest<SystemConfigData>("/system-config");
      setSysConfig(data);
    } catch (err) {
      console.error("Error loading sys config in POS:", err);
    }
  };

  const checkActiveShift = async () => {
    setLoadingShift(true);
    try {
      const shift = await cashShiftsService.getActiveShift();
      if (shift) {
        setActiveShift(shift);
        setShowOpenShiftModal(false);
      } else {
        setActiveShift(null);
        try {
          const registers = await cashShiftsService.getAvailableRegisters();
          setAvailableRegisters(registers);
        } catch (err) {
          console.error("Error fetching registers:", err);
        }
        setShowOpenShiftModal(true);
      }
    } catch (error) {
      toast.error("Error al verificar turno de caja");
    } finally {
      setLoadingShift(false);
    }
  };

  const handleOpenShift = async () => {
    if (!selectedRegisterId) {
      toast.error("Debe seleccionar una caja para iniciar turno");
      return;
    }
    const total = calcBreakdownTotal(openBills, openCoins);
    if (total <= 0) {
      toast.error("El desglose debe sumar al menos $0.01");
      return;
    }

    try {
      setLoadingShift(true);
      const shift = await cashShiftsService.openShift({ 
        cashRegisterId: Number(selectedRegisterId),
        breakdown: { bills: openBills, coins: openCoins },
        notes: openNotes || undefined
      });
      setActiveShift(shift);
      setShowOpenShiftModal(false);
      // Reset breakdown state
      setOpenBills({ d100:0, d50:0, d20:0, d10:0, d5:0, d1:0 });
      setOpenCoins({ c25:0, c10:0, c5:0, c1:0 });
      setOpenNotes("");
      setSelectedRegisterId("");
      toast.success("Caja abierta exitosamente");
    } catch (error: any) {
      toast.error(error.message || "Error al abrir caja");
    } finally {
      setLoadingShift(false);
    }
  };

  const handleOpenCloseShiftModal = async () => {
    try {
      setLoadingShift(true);
      const totals = await cashShiftsService.getActiveShiftExpectedTotals();
      setCloseExpectedTotals(totals);
      setShowCloseShiftModal(true);
    } catch (error: any) {
      toast.error("Error al obtener totales esperados");
    } finally {
      setLoadingShift(false);
    }
  };

  const handleCloseShift = async () => {
    const total = calcBreakdownTotal(closeBills, closeCoins);
    if (total <= 0) {
      toast.error("El desglose debe sumar al menos $0.01");
      return;
    }
    try {
      setLoadingShift(true);
      const res = await cashShiftsService.closeShift({
        breakdown: { bills: closeBills, coins: closeCoins },
        notes: closeNotes || undefined,
      });
      setCloseSummary(res.summary);
      setActiveShift(null);
      toast.success("Caja cerrada exitosamente");
    } catch (error: any) {
      toast.error(error.message || "Error al cerrar caja");
    } finally {
      setLoadingShift(false);
    }
  };

  const handleRequestClose = async () => {
    if (activeShift?.closeRequested) return;
    const total = calcBreakdownTotal(closeBills, closeCoins);
    if (total <= 0) {
      toast.error("El desglose debe sumar al menos $0.01");
      return;
    }
    try {
      setLoadingShift(true);
      const updatedShift = await cashShiftsService.requestClose({
        breakdown: { bills: closeBills, coins: closeCoins },
        notes: closeNotes || undefined,
      });
      setActiveShift(updatedShift);
      toast.success("Solicitud de cierre enviada con el desglose de caja");
      setShowCloseShiftModal(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingShift(false);
    }
  };

  const printSafeTransferTicket = () => {
    const total = calcBreakdownTotal(transferBills, transferCoins);
    const date = new Date().toLocaleString();
    const branchName = user?.branch || 'Sucursal';
    const cashierName = user?.name || 'Cajero';

    const html = `
      <html>
        <head>
          <title>Ticket Caja Fuerte</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            h2 { text-align: center; margin-bottom: 5px; }
            p { margin: 2px 0; font-size: 14px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { text-align: left; padding: 2px 0; font-size: 14px; }
            .table th:last-child, .table td:last-child { text-align: right; }
            .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 10px; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>TRANSFERENCIA A CAJA FUERTE</h2>
          <p class="center">${branchName}</p>
          <p class="center">${date}</p>
          <div class="divider"></div>
          <p><strong>Cajero:</strong> ${cashierName}</p>
          <p><strong>Caja:</strong> ${activeShift?.cashRegister?.name || 'Caja'}</p>
          <div class="divider"></div>
          <p><strong>DESGLOSE DE BILLETES</strong></p>
          <table class="table">
            ${transferBills.d100 > 0 ? `<tr><td>Billetes $100:</td><td>${transferBills.d100}</td><td>$${(transferBills.d100 * 100).toFixed(4)}</td></tr>` : ''}
            ${transferBills.d50 > 0 ? `<tr><td>Billetes $50:</td><td>${transferBills.d50}</td><td>$${(transferBills.d50 * 50).toFixed(4)}</td></tr>` : ''}
            ${transferBills.d20 > 0 ? `<tr><td>Billetes $20:</td><td>${transferBills.d20}</td><td>$${(transferBills.d20 * 20).toFixed(4)}</td></tr>` : ''}
            ${transferBills.d10 > 0 ? `<tr><td>Billetes $10:</td><td>${transferBills.d10}</td><td>$${(transferBills.d10 * 10).toFixed(4)}</td></tr>` : ''}
            ${transferBills.d5 > 0 ? `<tr><td>Billetes $5:</td><td>${transferBills.d5}</td><td>$${(transferBills.d5 * 5).toFixed(4)}</td></tr>` : ''}
            ${transferBills.d1 > 0 ? `<tr><td>Billetes $1:</td><td>${transferBills.d1}</td><td>$${(transferBills.d1 * 1).toFixed(4)}</td></tr>` : ''}
          </table>
          <div class="divider"></div>
          <p><strong>DESGLOSE DE MONEDAS</strong></p>
          <table class="table">
            ${transferCoins.c25 > 0 ? `<tr><td>Monedas $0.25:</td><td>${transferCoins.c25}</td><td>$${(transferCoins.c25 * 0.25).toFixed(4)}</td></tr>` : ''}
            ${transferCoins.c10 > 0 ? `<tr><td>Monedas $0.10:</td><td>${transferCoins.c10}</td><td>$${(transferCoins.c10 * 0.10).toFixed(4)}</td></tr>` : ''}
            ${transferCoins.c5 > 0 ? `<tr><td>Monedas $0.05:</td><td>${transferCoins.c5}</td><td>$${(transferCoins.c5 * 0.05).toFixed(4)}</td></tr>` : ''}
            ${transferCoins.c1 > 0 ? `<tr><td>Monedas $0.01:</td><td>${transferCoins.c1}</td><td>$${(transferCoins.c1 * 0.01).toFixed(4)}</td></tr>` : ''}
          </table>
          <div class="divider"></div>
          <div class="total">TOTAL: $${total.toFixed(4)}</div>
          <br><br><br>
          <div class="divider"></div>
          <p class="center">Firma Responsable</p>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
    setShowTransferSafeModal(false);
    setTransferBills({ d100:0, d50:0, d20:0, d10:0, d5:0, d1:0 });
    setTransferCoins({ c25:0, c10:0, c5:0, c1:0 });
  };

  const handleSaveQuote = async () => {
    if (cart.length === 0) return;
    if (isQuoteSubmittingGlobal) return;
    if (quoteValidDays === "" || quoteValidDays <= 0) {
      toast.error("Ingrese una validez en días correcta");
      return;
    }

    // Bloquear el botón a nivel DOM ANTES de cualquier código asíncrono
    isQuoteSubmittingGlobal = true;
    isSubmittingRef.current = true;
    if (quoteBtnRef.current) {
      quoteBtnRef.current.disabled = true;
    }
    setProcessingOverlay(true);
    setLoading(true);

    try {
      await quotesService.createQuote({
        customerId: selectedCustomer?.id,
        validDays: Number(quoteValidDays),
        items: cart.flatMap((i) =>
          i.selections.map((s) => ({
            productId: i.id,
            quantity: Number(s.quantity),
            unitPrice: Number(s.price),
          }))
        ),
        ...(transportData && transportData.requiresTransport ? {
          requiresTransport: true,
          vehicleId: transportData.vehicleId,
          driverId: transportData.driverId,
          deliveryAddress: transportData.deliveryAddress,
          scheduledAt: transportData.scheduledDeliveryAt,
        } : {})
      });

      toast.success("Cotización guardada exitosamente");
      setCart([]);
      setSearchTerm("");
      searchProducts("");
      setSelectedCustomer(null);
      setShowQuoteModal(false);
      setTransportData(null);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la cotización");
      // Si falla, rehabilitar el botón para que el cajero corrija y reintente
      if (quoteBtnRef.current) {
        quoteBtnRef.current.disabled = false;
      }
    } finally {
      // Siempre liberar el lock al terminar
      isQuoteSubmittingGlobal = false;
      isSubmittingRef.current = false;
      setProcessingOverlay(false);
      setLoading(false);
    }
  };

  // Debounce product search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchProducts(searchTerm);
      } else if (searchTerm.trim().length === 0) {
        searchProducts("");
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Debounce customer search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (customerSearch.trim().length >= 2) {
        searchCustomers(customerSearch);
      } else {
        setCustomerResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearch]);

  const searchProducts = async (query: string) => {
    setLoading(true);
    try {
      const isSearch = !!query;
      const endpoint = isSearch
        ? `/catalog/products/search?q=${encodeURIComponent(query)}`
        : `/catalog/products?isActive=true&limit=50`;

      const response = await apiRequest<any>(endpoint);

      // The list endpoint returns { data: [...] }, while search returns [...]
      const items = isSearch
        ? Array.isArray(response)
          ? response
          : []
        : response.data || [];

      const mapped = items.map((p: any) => {
        // Handle inventory differences: findAll flattens it, search keeps it as array
        const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
        const stockValue = inv?.quantity ?? p.stock ?? 0;

        let publicPrice = p.prices?.find(
          (pr: any) => pr.priceType === "PUBLICO" && pr.branchId === Number(user?.branchId)
        )?.price;

        if (publicPrice === undefined || publicPrice === null) {
          publicPrice = p.prices?.find(
            (pr: any) => pr.priceType === "PUBLICO" && !pr.branchId
          )?.price;
        }

        if (publicPrice === undefined || publicPrice === null) {
          publicPrice = p.prices?.[0]?.price || p.price || 0;
        }
        return {
          id: p.id,
          internalCode: p.internalCode || p.barcode || "S/C",
          name: p.name,
          price: Number(publicPrice),
          stock: Number(stockValue),
          category: p.category || { name: "General" },
          unit: p.unit,
          units: p.units || [],
        };
      });
      setProducts(mapped);
    } catch (error) {
      toast.error("Error al obtener productos");
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (query: string) => {
    setSearchingCustomer(true);
    try {
      // Usamos el endpoint específico de búsqueda rápida para POS
      // apiRequest ya desempaqueta el { success: true, data: [...] }
      const data = await apiRequest<Customer[]>(
        `/customers/search?q=${encodeURIComponent(query)}`,
      );
      setCustomerResults(data || []);
    } catch (error) {
      // Silencioso para no molestar mientras escribe
    } finally {
      setSearchingCustomer(false);
    }
  };

  const addToCart = (product: Product, unitType?: string, unitFactor?: number, unitPrice?: number) => {
    if (product.stock <= 0) {
      toast.error("Producto sin stock disponible");
      return;
    }
    const resolvedUnit = unitType || product.unit;
    const resolvedFactor = unitFactor || 1;
    const resolvedPrice = unitPrice || product.price;

    const existingCartItem = cart.find((i) => i.id === product.id);
    const currentlyUsedStock = existingCartItem
      ? existingCartItem.selections.reduce((sum, s) => sum + s.quantity * s.unitFactor, 0)
      : 0;

    if (currentlyUsedStock + resolvedFactor > product.stock) {
      toast.error("No hay más stock disponible");
      return;
    }

    if (existingCartItem) {
      const existingSel = existingCartItem.selections.find((s) => s.unitType === resolvedUnit);
      if (existingSel) {
        setCart(cart.map((item) => {
          if (item.id === product.id) {
            return {
              ...item,
              selections: item.selections.map((s) =>
                s.unitType === resolvedUnit
                  ? { ...s, quantity: s.quantity + 1 }
                  : s
              )
            };
          }
          return item;
        }));
      } else {
        setCart(cart.map((item) => {
          if (item.id === product.id) {
            return {
              ...item,
              selections: [
                ...item.selections,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  unitType: resolvedUnit,
                  unitFactor: resolvedFactor,
                  quantity: 1,
                  price: resolvedPrice,
                  originalPrice: resolvedPrice,
                }
              ]
            };
          }
          return item;
        }));
      }
    } else {
      setCart([...cart, {
        ...product,
        selections: [
          {
            id: Math.random().toString(36).substring(2, 9),
            unitType: resolvedUnit,
            unitFactor: resolvedFactor,
            quantity: 1,
            price: resolvedPrice,
            originalPrice: resolvedPrice,
          }
        ]
      }]);
    }
  };

  const updateQuantity = (productId: number, selectionId: string, newQty: number) => {
    const item = cart.find((i) => i.id === productId);
    if (!item) return;
    if (newQty <= 0) {
      removeSelection(productId, selectionId);
      return;
    }

    const targetSel = item.selections.find((s) => s.id === selectionId);
    if (!targetSel) return;

    const otherUsedStock = item.selections
      .filter((s) => s.id !== selectionId)
      .reduce((sum, s) => sum + s.quantity * s.unitFactor, 0);

    if (otherUsedStock + newQty * targetSel.unitFactor > item.stock) {
      toast.error("Excede el stock disponible");
      return;
    }

    setCart(cart.map((i) => {
      if (i.id === productId) {
        return {
          ...i,
          selections: i.selections.map((s) =>
            s.id === selectionId ? { ...s, quantity: newQty } : s
          )
        };
      }
      return i;
    }));
  };

  const updatePrice = (productId: number, selectionId: string, newPrice: number | undefined) => {
    setCart(cart.map((item) => {
      if (item.id === productId) {
        return {
          ...item,
          selections: item.selections.map((s) => {
            if (s.id === selectionId) {
              const val = newPrice === undefined || isNaN(newPrice) ? 0 : newPrice;
              const calcPrice = val <= 0 ? s.originalPrice : val;
              return { ...s, price: val };
            }
            return s;
          })
        };
      }
      return item;
    }));
  };

  const removeSelection = (productId: number, selectionId: string) => {
    setCart(cart.map((item) => {
      if (item.id === productId) {
        return {
          ...item,
          selections: item.selections.filter((s) => s.id !== selectionId)
        };
      }
      return item;
    }).filter((item) => item.selections.length > 0));
  };

  const updateSelectionUnit = (productId: number, selectionId: string, newUnitType: string) => {
    const item = cart.find((i) => i.id === productId);
    if (!item) return;

    let newFactor = 1;
    let newPrice = item.price; // product base price

    if (newUnitType !== item.unit) {
      const u = item.units?.find((x) => x.unit === newUnitType);
      if (!u) return;
      newFactor = u.factor;
      newPrice = u.priceDetalle || (item.price * u.factor);
    }

    const existingSel = item.selections.find((s) => s.unitType === newUnitType && s.id !== selectionId);
    const targetSel = item.selections.find((s) => s.id === selectionId);
    if (!targetSel) return;

    const otherUsedStock = item.selections
      .filter((s) => s.id !== selectionId && s.id !== existingSel?.id)
      .reduce((sum, s) => sum + s.quantity * s.unitFactor, 0);

    const combinedQty = existingSel ? existingSel.quantity + targetSel.quantity : targetSel.quantity;

    if (otherUsedStock + combinedQty * newFactor > item.stock) {
      toast.error("No hay suficiente stock para cambiar a esta unidad");
      return;
    }

    if (existingSel) {
      setCart(cart.map((i) => {
        if (i.id === productId) {
          return {
            ...i,
            selections: i.selections
              .map((s) => {
                if (s.id === existingSel.id) {
                  return {
                    ...s,
                    quantity: combinedQty,
                    price: newPrice,
                    originalPrice: newPrice
                  };
                }
                return s;
              })
              .filter((s) => s.id !== selectionId)
          };
        }
        return i;
      }).filter((i) => i.selections.length > 0));
    } else {
      setCart(cart.map((i) => {
        if (i.id === productId) {
          return {
            ...i,
            selections: i.selections.map((s) =>
              s.id === selectionId
                ? {
                    ...s,
                    unitType: newUnitType,
                    unitFactor: newFactor,
                    price: newPrice,
                    originalPrice: newPrice,
                  }
                : s
            )
          };
        }
        return i;
      }));
    }
  };

  const addSelectionRow = (productId: number) => {
    const item = cart.find((i) => i.id === productId);
    if (!item) return;

    const usedStock = item.selections.reduce((sum, s) => sum + s.quantity * s.unitFactor, 0);
    if (usedStock + 1 > item.stock) {
      toast.error("No hay más stock disponible");
      return;
    }

    setCart(cart.map((i) => {
      if (i.id === productId) {
        return {
          ...i,
          selections: [
            ...i.selections,
            {
              id: Math.random().toString(36).substring(2, 9),
              unitType: i.unit,
              unitFactor: 1,
              quantity: 1,
              price: i.price,
              originalPrice: i.price,
            }
          ]
        };
      }
      return i;
    }));
  };

  const total = cart.reduce(
    (sum, item) => sum + item.selections.reduce((sub, s) => sub + s.quantity * s.price, 0),
    0
  );
  const vatRate = parseFloat(String(sysConfig?.vatRate ?? 0.13));
  const isVatIncluded = sysConfig?.vatIncluded !== false; // Default to true if not set
  
  let subtotal = 0;
  let iva = 0;

  if (isVatIncluded) {
    subtotal = isNaN(total) ? 0 : total / (1 + vatRate);
    iva = isNaN(total) ? 0 : total - subtotal;
  } else {
    subtotal = isNaN(total) ? 0 : total;
    iva = subtotal * vatRate;
  }

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;

    if (selectedPayment === "CREDITO") {
      if (!selectedCustomer) {
        toast.error("Debe seleccionar un cliente para ventas al crédito.");
        return;
      }
      const limit = Number(selectedCustomer.creditLimit) || 0;
      const balance = Number(selectedCustomer.creditBalance) || 0;

      if (limit === 0) {
        setCheckoutErrorAlert("El cliente no tiene crédito autorizado ($0.00).");
        return;
      }

      if (sysConfig?.blockOnOverLimit && (balance + total) > limit) {
        setCheckoutErrorAlert(`CRÉDITO INSUFICIENTE. El cliente superaría su límite de crédito (Límite: $${limit.toFixed(4)}, Saldo: $${balance.toFixed(4)}, Venta: $${total.toFixed(4)})`);
        return;
      }
    }

    setPayments([{ paymentMethod: selectedPayment, amount: total }]);
    setShowMixedPaymentModal(true);
  };

  const processSale = async () => {
    if (cart.length === 0) return;
    // Validación extra: suma de pagos debe cuadrar con el total
    const sumPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(sumPayments - total) > 0.01) {
      toast.error(`La suma de los pagos ($${sumPayments.toFixed(4)}) no coincide con el total ($${total.toFixed(4)})`);
      return;
    }

    // Bloquear el botón a nivel DOM ANTES de cualquier código asíncrono
    isCheckoutSubmittingGlobal = true;
    isSubmittingRef.current = true;
    if (checkoutBtnRef.current) {
      checkoutBtnRef.current.disabled = true;
    }
    setProcessingOverlay(true);
    setLoading(true);

    try {
      await createSale({
        customerId: selectedCustomer?.id,
        paymentMethod: payments[0]?.paymentMethod || 'EFECTIVO',
        payments: payments,
        totalAmount: total,
        taxAmount: iva,
        dueDate: payments.some(p => p.paymentMethod === "CREDITO") && checkoutDueDate ? checkoutDueDate : undefined,
        items: cart.flatMap((i) =>
          i.selections.map((s) => ({
            productId: i.id,
            quantity: Number(s.quantity),
            unitPrice: Number(s.price),
            unitType: s.unitType,
            unitFactor: Number(s.unitFactor),
          }))
        ),
        ...(transportData && transportData.requiresTransport ? {
          requiresTransport: true,
          vehicleId: transportData.vehicleId,
          driverId: transportData.driverId,
          deliveryAddress: transportData.deliveryAddress,
          scheduledDeliveryAt: transportData.scheduledDeliveryAt,
        } : {})
      });

      toast.success("Venta registrada exitosamente");
      if (transportData?.requiresTransport) {
        toast.success('Albarán de entrega generado automáticamente', {
          description: transportData.deliveryAddress 
            ? `Entrega en: ${transportData.deliveryAddress}` 
            : 'Revisa la página de Albaranes para gestionar el despacho',
          duration: 5000,
        });
      }
      setCart([]);
      setSearchTerm("");
      searchProducts("");
      setSelectedCustomer(null);
      setCheckoutDueDate("");
      setTransportData(null);
      setShowMixedPaymentModal(false);
      setUploadingReceipt({});

    } catch (error: any) {
      const msg = error.message || "Error al procesar la venta. Verifique el stock.";
      
      // Si el error parece ser una restricción de crédito / método inactivo (400 Bad Request)
      if (msg.toLowerCase().includes("crédito") || msg.toLowerCase().includes("tarjeta") || msg.toLowerCase().includes("límite") || msg.toLowerCase().includes("mora") || msg.toLowerCase().includes("sucursal no acepta")) {
        setCheckoutErrorAlert(msg);
      } else {
        toast.error(msg);
      }

      // Si falla, rehabilitar el botón para que el cajero corrija y reintente
      if (checkoutBtnRef.current) {
        checkoutBtnRef.current.disabled = false;
      }
    } finally {
      // Siempre liberar el lock al terminar
      isCheckoutSubmittingGlobal = false;
      isSubmittingRef.current = false;
      setProcessingOverlay(false);
      setLoading(false);
    }
  };

  const handlePreSale = async () => {
    if (cart.length === 0) return;
    setPreSaleLoading(true);
    try {
      const ticket = await createPreSale({
        customerId: selectedCustomer?.id,
        totalAmount: total,
        taxAmount: iva,
        description: preSaleDescription || undefined,
        items: cart.flatMap((i) =>
          i.selections.map((s) => ({
            productId: i.id,
            quantity: Number(s.quantity),
            unitPrice: Number(s.price),
            unitType: s.unitType,
            unitFactor: Number(s.unitFactor),
          }))
        ),
      });
      setCreatedTicket(ticket);
      setCart([]);
      setSearchTerm("");
      setSelectedCustomer(null);
      setPreSaleDescription("");
      setShowPreSaleModal(false);
      toast.success(`Ticket ${ticket.ticketNumber} creado — entrégalo en caja`);
    } catch (error: any) {
      toast.error(error.message || "Error al crear el ticket");
    } finally {
      setPreSaleLoading(false);
    }
  };

  const printTicket = (ticket: PreSaleTicket) => {
    const fmt = (n: number) => `$${n.toFixed(2)}`;
    const vatRate  = parseFloat(String(sysConfig?.vatRate ?? 0.13));
    const totalNum = Number(ticket.totalAmount);
    const taxNum   = Number(ticket.taxAmount);
    const subtotal = totalNum - taxNum;
    const createdAt = new Date(ticket.createdAt);

    const companyName     = sysConfig?.companyName     || "AGROFERRETERÍA D'CAMPO";
    const companyAddress  = sysConfig?.companyAddress  || "";
    const companyNit      = sysConfig?.companyNit      || "";
    const companyNrc      = sysConfig?.companyNrc      || "";
    const companyPhone    = sysConfig?.companyPhone || "";
    const companyActivity = sysConfig?.companyActivity || "";

    const customerName     = ticket.customer?.name || "CONSUMIDOR FINAL";
    const customerAddress  = (ticket.customer as any)?.address  || "Ciudad";
    const customerPhone    = (ticket.customer as any)?.phone    || "";
    const customerEmail    = (ticket.customer as any)?.email    || "";
    const customerActivity = (ticket.customer as any)?.activityDescription || "";

    const totalInWords = numerosALetras(totalNum);
    const dateStr = createdAt.toLocaleDateString("es-SV");
    const timeStr = createdAt.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket ${ticket.ticketNumber}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',monospace;font-size:11px;width:80mm;padding:8px;color:#000}
  h1{font-size:14px;text-align:center;font-weight:bold;margin-bottom:2px}
  .center{text-align:center} .bold{font-weight:bold}
  hr{border:none;border-top:1px solid #000;margin:5px 0}
  hr.d{border-top:1px dashed #000}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{font-weight:bold;text-align:left;padding:1px 2px}
  td{padding:1px 2px;vertical-align:top}
  .tr{text-align:right}
  .row{display:flex;justify-content:space-between;gap:4px;margin:1px 0;font-size:10.5px}
  .stitle{font-weight:bold;margin:3px 0 1px}
  .badge{text-align:center;border:2px solid #000;padding:3px 8px;font-weight:bold;font-size:12px;margin:4px 0}
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

<div class="badge">PRE-VENTA — PENDIENTE DE COBRO</div>
<div class="center bold" style="font-size:13px">${ticket.ticketNumber}</div>

<hr>

<div class="stitle">Información</div>
<div class="row"><span>Fecha y hora:</span><span>${dateStr} ${timeStr}</span></div>
<div class="row"><span>Atendido por:</span><span>${ticket.user?.fullName || "-"}</span></div>

<hr>

<div class="stitle">Datos del receptor</div>
<div class="row"><span>Nombre:</span><span>${customerName}</span></div>
<div class="row"><span>Dirección:</span><span>${customerAddress}</span></div>
<div class="row"><span>Correo:</span><span>${customerEmail}</span></div>
<div class="row"><span>Teléfono:</span><span>${customerPhone}</span></div>
<div class="row"><span>Actividad económica:</span><span>${customerActivity}</span></div>
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
<div class="row"><span>IVA (${(vatRate * 100).toFixed(0)}%):</span><span>${fmt(taxNum)}</span></div>
<div class="row bold" style="font-size:13px"><span>Total a pagar:</span><span>${fmt(totalNum)}</span></div>
<div class="row"><span class="bold">Total en letras:</span><span>${totalInWords}</span></div>

<hr class="d">
<div class="center bold" style="margin-top:6px;font-size:12px">PRESENTE ESTE TICKET EN CAJA</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},1500)}</script>
</body></html>`;

    const win = window.open("", "_blank", "width=520,height=820");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-3 animate-in fade-in duration-300 overflow-hidden">
      {/* Header Compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Punto de Venta</h1>
          <Badge variant="outline" className="border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 font-bold">
            <Package size={14} className="mr-1" /> {user?.branch || "Sucursal"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* {activeShift && (
            <Button
              variant="outline" size="sm"
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-bold hover:border-emerald-300"
              onClick={() => setShowTransferSafeModal(true)}
            >
              <DollarSign size={14} className="mr-2 hidden sm:inline" /> Transferir a Caja Fuerte
            </Button>
          )} */}
          {activeShift && (
            <Button
              disabled={activeShift.closeRequested}
              variant="outline"
              className={cn(
                "font-bold",
                activeShift.closeRequested 
                  ? "border-amber-200 text-amber-600 bg-amber-50" 
                  : "border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              )}
              onClick={handleOpenCloseShiftModal}
            >
              <Lock size={14} className="mr-2" /> 
              {activeShift.closeRequested ? "Cierre Solicitado" : (canCloseDirectly ? "Cerrar Caja" : "Solicitar Cierre")} 
              <span className="hidden sm:inline ml-1">({activeShift.cashRegister?.name || 'Caja Activa'})</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* PANEL IZQUIERDO: PRODUCTOS */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          {/* Buscador Compacto */}
          <div className="p-3 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-sec)]" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="F1: Buscar productos, código o categoría..."
                className="pl-9 h-10 bg-[var(--bg)] border-[var(--border)] rounded-lg w-full text-sm"
              />
              {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-[var(--primary)] border-t-transparent rounded-full" />}
            </div>
          </div>

          {/* Grid Compacto */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => product.stock > 0 && addToCart(product)}
                  className={cn(
                    "relative p-3 rounded-xl border transition-all flex flex-col cursor-pointer",
                    product.stock > 0 
                      ? "bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md" 
                      : "bg-[var(--bg)] border-[var(--border)] opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-bold uppercase text-[var(--text-sec)] bg-[var(--bg)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                      {product.category.name}
                    </span>
                    <Badge variant={product.stock < 10 ? "destructive" : "secondary"} className="text-[9px] px-1.5 py-0">
                      {product.stock}
                    </Badge>
                  </div>
                  
                  <h3 className="font-bold text-sm leading-tight text-[var(--text-main)] line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-[10px] font-mono text-[var(--text-sec)] mb-3">
                    {product.internalCode}
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <span className="text-base font-black text-[var(--primary)]">
                      ${product.price.toFixed(4)} <span className="text-[10px] font-normal text-[var(--text-sec)]">/ {product.unit}</span>
                    </span>
                    <div className="size-6 rounded bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                      <Plus size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: CARRITO */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden flex-shrink-0">
          
          {/* Header Carrito / Cliente (Compacto) */}
          <div className="p-3 border-b border-[var(--border)] bg-[var(--bg)]/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <ShoppingCart size={16} className="text-[var(--primary)]" /> Venta Actual
              </h2>
              <Badge className="bg-[var(--primary)] text-white text-[10px] px-2 rounded-md">
                {cart.reduce((sum, item) => sum + item.selections.length, 0)} items
              </Badge>
            </div>

            {/* Selector Cliente Compacto */}
            <div>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-none text-[var(--text-main)] truncate max-w-[150px]">{selectedCustomer.name}</p>
                      <p className="text-[9px] font-bold opacity-70 mt-0.5 text-[var(--text-sec)]">
                        {selectedCustomer.customerType} • {selectedCustomer.nit || selectedCustomer.documentNumber || "FINAL"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="size-6 text-red-500 hover:bg-red-100" onClick={() => setSelectedCustomer(null)}>
                    <X size={12} />
                  </Button>
                </div>
              ) : (
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-sec)]" size={14} />
                    <Input
                      placeholder="Cliente (Nombre o NIT)..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-8 h-9 text-xs bg-[var(--bg)] border-[var(--border)]"
                    />
                    {searchingCustomer && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin size-3 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                    )}
                  </div>
                  <Button variant="outline" size="icon" className="size-9 shrink-0 text-[var(--primary)]" onClick={() => setIsQuickCreateOpen(true)} title="Nuevo">
                    <UserPlus size={14} />
                  </Button>

                  {customerResults.length > 0 && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-lg border bg-[var(--card)] shadow-lg max-h-48 overflow-y-auto p-1">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          className="w-full text-left p-2 rounded hover:bg-[var(--primary)]/10 flex flex-col"
                          onClick={() => { setSelectedCustomer(c); setCustomerResults([]); setCustomerSearch(""); }}
                        >
                          <span className="text-xs font-bold text-[var(--text-main)]">{c.name}</span>
                          <span className="text-[9px] text-[var(--text-sec)]">{c.customerType} • {c.nit || c.documentNumber || "FINAL"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lista Items + Selector Transporte (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-[var(--bg)]/10">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <ShoppingCart size={32} className="mb-2" />
                <p className="text-sm font-bold">Carrito vacío</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="relative p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-xs leading-tight text-[var(--text-main)]">{item.name}</p>
                        <p className="text-[9px] font-bold text-[var(--text-sec)]">Stock: {item.stock} {item.unit}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-red-400 hover:bg-red-50 hover:text-red-500"
                        onClick={() => setCart(cart.filter((c) => c.id !== item.id))}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {item.selections.map((sel) => (
                        <div key={sel.id} className="flex items-start justify-between gap-2 border-t border-[var(--border)]/50 pt-2 first:border-t-0 first:pt-0">
                          <div className="flex-1 max-w-[100px] h-7 flex items-center">
                            {item.units && item.units.length > 0 ? (
                              <select
                                value={sel.unitType}
                                onChange={(e) => updateSelectionUnit(item.id, sel.id, e.target.value)}
                                className="text-[10px] font-black h-7 px-1.5 w-full bg-[var(--bg)] border border-[var(--border)] rounded text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
                              >
                                <option value={item.unit}>{item.unit}</option>
                                {item.units.map((u: any) => (
                                  <option key={u.unit} value={u.unit}>
                                    {u.unit}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] font-bold text-[var(--text-sec)] px-1">{sel.unitType}</span>
                            )}
                          </div>

                          <div className="flex items-center bg-[var(--bg)] rounded border border-[var(--border)] overflow-hidden h-7">
                            <Button variant="ghost" size="icon" className="size-7 rounded-none shrink-0" onClick={() => updateQuantity(item.id, sel.id, sel.quantity - 1)}>
                              <Minus size={12} />
                            </Button>
                            <NumberInput
                              value={sel.quantity}
                              onValueChange={(val) => val !== undefined && updateQuantity(item.id, sel.id, val)}
                              min={1}
                              max={Math.floor(item.stock / sel.unitFactor)}
                              step={1}
                              className="w-10 h-7 text-xs font-bold text-center border-none p-0 rounded-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                              hideControls={true}
                            />
                            <Button variant="ghost" size="icon" className="size-7 rounded-none shrink-0 text-[var(--primary)]" onClick={() => updateQuantity(item.id, sel.id, sel.quantity + 1)}>
                              <Plus size={12} />
                            </Button>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <div className="relative flex items-center justify-end w-20">
                              <span className="absolute left-2 text-xs font-black text-[var(--primary)] pointer-events-none">$</span>
                              <NumberInput
                                value={sel.price === 0 ? "" : sel.price}
                                onValueChange={(val) => updatePrice(item.id, sel.id, val)}
                                onBlur={() => { if (!sel.price || sel.price <= 0) updatePrice(item.id, sel.id, sel.originalPrice); }}
                                step={0.01}
                                hideControls={true}
                                className="w-full h-7 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded text-right pr-2 pl-4 font-black text-[var(--primary)] text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                              />
                            </div>
                            <span className="text-[9px] font-bold text-[var(--text-sec)]">Sub: ${(sel.quantity * sel.price).toFixed(4)}</span>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-red-400 hover:bg-red-50 hover:text-red-500 shrink-0"
                            onClick={() => removeSelection(item.id, sel.id)}
                            disabled={item.selections.length === 1}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {item.units && item.units.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-6 text-[9px] font-bold border-dashed border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)] hover:text-white"
                        onClick={() => addSelectionRow(item.id)}
                      >
                        <Plus size={10} className="mr-1" /> AGREGAR UNIDAD
                      </Button>
                    )}
                  </div>
                ))}

                {/* TRANSPORT SELECTOR DENTRO DEL SCROLL PARA NO QUITAR ESPACIO AL FOOTER */}
                <div className="pt-2">
                  <TransportSelector 
                    customerId={selectedCustomer?.id}
                    value={transportData}
                    onChange={setTransportData}
                    disabled={loading || cart.length === 0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Cobro Super Compacto */}
          <div className="p-3 border-t border-[var(--border)] bg-[var(--card)] flex-shrink-0 space-y-3 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
            
            <div className="flex items-end justify-between px-1">
              <div className="text-xs font-bold text-[var(--text-sec)] flex flex-col">
                <span>Sub: ${subtotal.toFixed(4)}</span>
                <span>IVA: ${iva.toFixed(4)}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[var(--primary)] leading-none">${total.toFixed(4)}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CREDITO", "MIXTO"]
                .filter((method) => {
                  if (method === "CREDITO" && sysConfig?.allowCreditSales === false) return false;
                  if (method === "MIXTO") return true;
                  if (!branchPaymentConfig) return true;
                  if (method === "EFECTIVO" && !branchPaymentConfig.acceptsCash) return false;
                  if (method === "TARJETA" && !branchPaymentConfig.acceptsCard) return false;
                  if (method === "TRANSFERENCIA" && !branchPaymentConfig.acceptsTransfer) return false;
                  if (method === "CREDITO" && !branchPaymentConfig.acceptsCredit) return false;
                  return true;
                })
                .map((method) => (
                  <Button
                    key={method}
                    variant={(selectedPayment as string) === method && method !== "MIXTO" ? "default" : "outline"}
                    className={cn(
                      "h-8 text-[9px] font-black tracking-tight px-0",
                      (selectedPayment as string) === method && method !== "MIXTO" ? "bg-[var(--primary)] text-white shadow-sm" : 
                      method === "MIXTO" ? "border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white" :
                      "bg-[var(--bg)] text-[var(--text-sec)]"
                    )}
                    onClick={() => {
                      if (method === "MIXTO") {
                        if (cart.length === 0) {
                          toast.error("Agregue productos al carrito para usar pago mixto");
                          return;
                        }
                        if (!isCheckoutSubmittingGlobal) handleCheckoutClick();
                      } else {
                        setSelectedPayment(method as any);
                      }
                    }}
                  >
                    {method}
                  </Button>
                ))}
            </div>

            {selectedPayment === "CREDITO" && (
              <div className="flex items-center justify-between gap-2 p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg">
                <Label className="text-[10px] font-bold text-[var(--text-sec)] uppercase">Vencimiento:</Label>
                <div className="flex-1 max-w-[140px]">
                  <DatePicker 
                    date={checkoutDueDate ? parseLocalDate(checkoutDueDate) : undefined}
                    setDate={handleDateChange}
                    placeholder="30 días"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={() => { if (cart.length === 0) { toast.error("Agrega productos al carrito"); return; } setShowPreSaleModal(true); }}
              disabled={loading || cart.length === 0}
              variant="outline"
              className="w-full h-10 rounded-xl font-bold text-sm border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white mb-2"
            >
              <FileText className="mr-2 size-4" /> PREPARAR TICKET (SIN COBRAR)
            </Button>
            {(() => {
              const canCobrar = user?.role !== 'VENDEDOR';
              return (
                <div className={`grid gap-2 ${canCobrar ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <Button
                    onClick={() => setShowQuoteModal(true)}
                    disabled={loading || cart.length === 0}
                    variant="outline"
                    className="h-12 rounded-xl font-bold text-sm border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                  >
                    <Save className="mr-2 size-4" /> COTIZAR
                  </Button>
                  {canCobrar && (
                    <Button
                      ref={checkoutBtnRef}
                      onClick={() => { if (!isCheckoutSubmittingGlobal) handleCheckoutClick(); }}
                      disabled={loading || cart.length === 0}
                      className="h-12 rounded-xl font-black text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
                    >
                      {loading ? <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" /> : <><Printer className="mr-2 size-4" /> COBRAR</>}
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <CustomerQuickCreate
        open={isQuickCreateOpen}
        onOpenChange={setIsQuickCreateOpen}
        onSuccess={(c) => {
          setSelectedCustomer(c);
          setCustomerSearch("");
        }}
      />

      {/* 1. Overlay Bloqueante (Procesando) */}
      {processingOverlay && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="animate-spin h-16 w-16 border-4 border-white border-t-transparent rounded-full mb-6 shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
          <h2 className="text-3xl font-black tracking-tight mb-2">Procesando cobro...</h2>
          <p className="text-lg opacity-80 font-medium">Por favor, no cierre esta ventana.</p>
        </div>
      )}

      <Dialog 
        open={showOpenShiftModal} 
        onOpenChange={(open) => {
          if (!open) {
            setShowOpenShiftModal(false);
            navigate('/dashboard');
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl p-0 max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-6 pb-4 border-b border-[var(--border)] bg-[var(--bg)]/50 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black text-[var(--text-main)]">
                <div className="p-2 sm:p-2.5 bg-[var(--primary)]/10 rounded-xl sm:rounded-2xl text-[var(--primary)] shadow-sm">
                  <Unlock size={24} className="sm:w-7 sm:h-7" />
                </div>
                Apertura de Caja
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base font-medium opacity-80 mt-1">
                Selecciona la caja física e ingresa el efectivo inicial contando los billetes y monedas disponibles.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 sm:p-6 pt-4 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col space-y-2">
              <label className="text-sm font-bold text-[var(--text-main)]">Caja a utilizar</label>
              <Select value={selectedRegisterId} onValueChange={setSelectedRegisterId}>
                <SelectTrigger className="w-full h-12 bg-[var(--bg)] border-[var(--border)] rounded-xl font-bold">
                  <SelectValue placeholder="Seleccione una caja..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRegisters.map(reg => (
                    <SelectItem 
                      key={reg.id} 
                      value={reg.id.toString()}
                      disabled={reg.isOpen}
                    >
                      {reg.name} {reg.isOpen && <span className="text-[var(--text-sec)] text-xs ml-2">(Abierta por {reg.openedBy || 'otro usuario'})</span>}
                    </SelectItem>
                  ))}
                  {availableRegisters.length === 0 && (
                    <div className="p-2 text-sm text-[var(--text-sec)]">No hay cajas disponibles</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* BILLETES */}
              <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-5 border-b border-[var(--border)] pb-3">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <DollarSign size={20} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold text-lg text-[var(--text-main)]">Billetes</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'd100', label: '$100' },
                    { key: 'd50',  label: '$50'  },
                    { key: 'd20',  label: '$20'  },
                    { key: 'd10',  label: '$10'  },
                    { key: 'd5',   label: '$5'   },
                    { key: 'd1',   label: '$1'   },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5 group">
                      <label className="text-xs font-bold text-[var(--text-sec)] tracking-wider">{label}</label>
                      <NumberInput
                        value={openBills[key as keyof BillsBreakdown]}
                        onValueChange={(val) =>
                          setOpenBills(prev => ({ ...prev, [key]: val ?? 0 }))
                        }
                        min={0}
                        max={500}
                        step={1}
                        placeholder="0"
                        className="font-bold text-lg group-focus-within:border-[var(--primary)] transition-colors h-11"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* MONEDAS */}
              <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center gap-3 mb-5 border-b border-[var(--border)] pb-3">
                  <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                    <div className="w-5 h-5 rounded-full border-[2.5px] border-amber-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-[var(--text-main)]">Monedas</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1 content-start">
                  {[
                    { key: 'c25', label: '$0.25' },
                    { key: 'c10', label: '$0.10' },
                    { key: 'c5',  label: '$0.05' },
                    { key: 'c1',  label: '$0.01' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5 group">
                      <label className="text-xs font-bold text-[var(--text-sec)] tracking-wider">{label}</label>
                      <NumberInput
                        value={openCoins[key as keyof CoinsBreakdown]}
                        onValueChange={(val) =>
                          setOpenCoins(prev => ({ ...prev, [key]: val ?? 0 }))
                        }
                        min={0}
                        max={2000}
                        step={1}
                        placeholder="0"
                        className="font-bold text-lg group-focus-within:border-[var(--primary)] transition-colors h-11"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Total calculado y Observaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-end mt-4">
              <div className="space-y-2 h-full flex flex-col justify-end">
                <label className="text-xs sm:text-sm font-bold text-[var(--text-sec)] uppercase tracking-widest">Observaciones (Opcional)</label>
                <Input
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Ej. Sencillo incompleto..."
                  className="h-12 sm:h-[72px] rounded-xl sm:rounded-2xl text-sm sm:text-base px-4"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center rounded-xl sm:rounded-2xl border-2 border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 sm:px-6 py-3 sm:py-0 sm:h-[72px] shadow-inner gap-1 sm:gap-0">
                <span className="text-[10px] sm:text-sm font-bold text-[var(--primary)] uppercase tracking-widest opacity-80">Total Calculado</span>
                <span className="text-3xl sm:text-4xl font-black text-[var(--primary)] tracking-tight">
                  ${calcBreakdownTotal(openBills, openCoins).toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-6 border-t border-[var(--border)] bg-[var(--bg)]/50 flex flex-col-reverse sm:flex-row sm:justify-between w-full shrink-0 gap-3 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setShowOpenShiftModal(false);
                navigate('/dashboard');
              }}
              className="w-full sm:w-auto font-bold text-[var(--text-sec)] hover:bg-slate-100 h-12 px-8"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenShift}
              disabled={
                loadingShift ||
                calcBreakdownTotal(openBills, openCoins) <= 0
              }
              className="w-full sm:w-auto text-lg h-12 px-12 shadow-lg shadow-[var(--primary)]/20"
            >
              {loadingShift ? "Abriendo..." : "Abrir Caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseShiftModal} onOpenChange={(open) => !loadingShift && setShowCloseShiftModal(open)}>
        <DialogContent className="sm:max-w-3xl p-0 max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-6 pb-4 border-b border-[var(--border)] bg-[var(--bg)]/50 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black text-rose-500">
                <div className="p-2 sm:p-2.5 bg-rose-500/10 rounded-xl sm:rounded-2xl text-rose-500 shadow-sm">
                  <Lock size={24} className="sm:w-7 sm:h-7" />
                </div>
                Cierre de Caja
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base font-medium opacity-80 mt-1">
                Cuenta los billetes y monedas en la gaveta para cerrar tu turno.
              </DialogDescription>
            </DialogHeader>
          </div>

          {closeSummary ? (
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-4 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)]/50 space-y-4">
                <div className="flex justify-between items-center text-base">
                  <span className="text-[var(--text-sec)] font-medium">Fondo Base (Apertura):</span>
                  <span className="font-bold text-xl text-[var(--text-main)]">${activeShift?.initialAmount ? Number(activeShift.initialAmount).toFixed(4) : "0.00"}</span>
                </div>
                {canCloseDirectly && (
                  <div className="flex justify-between items-center text-base">
                    <span className="text-[var(--text-sec)] font-medium">Monto Esperado (Base + Ventas):</span>
                    <span className="font-bold text-xl text-[var(--text-main)]">${closeSummary.expectedAmount.toFixed(4)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-base">
                  <span className="text-[var(--text-sec)] font-medium">Monto Contado (Real):</span>
                  <span className="font-bold text-xl text-[var(--text-main)]">${closeSummary.countedCash.toFixed(4)}</span>
                </div>
                {canCloseDirectly && (
                  <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
                    <span className="font-bold text-lg text-[var(--text-main)]">Diferencia:</span>
                    <span className={cn("font-black text-3xl", closeSummary.difference < 0 ? "text-red-500" : "text-emerald-500")}>
                      {closeSummary.difference > 0 ? "+" : ""}${closeSummary.difference.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
              <DialogFooter className="pt-2 shrink-0">
                <Button
                  onClick={() => {
                    setShowCloseShiftModal(false);
                    setCloseSummary(null);
                    setCloseBills({ d100:0, d50:0, d20:0, d10:0, d5:0, d1:0 });
                    setCloseCoins({ c25:0, c10:0, c5:0, c1:0 });
                    setCloseNotes("");
                    setShowOpenShiftModal(true);
                  }}
                  className="w-full text-lg h-12"
                >
                  Entendido
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="p-4 sm:p-6 pt-4 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {closeExpectedTotals && canCloseDirectly && (
                <div className="bg-blue-500/5 p-4 sm:p-5 rounded-2xl border border-blue-500/20 grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 shadow-sm text-center">
                  <div className="flex flex-col items-center bg-[var(--bg)]/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                    <span className="text-[10px] sm:text-xs text-blue-500 font-bold uppercase tracking-widest mb-1.5 opacity-80">Fondo Base</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">${activeShift?.initialAmount ? Number(activeShift.initialAmount).toFixed(4) : "0.00"}</span>
                  </div>
                  <div className="flex flex-col items-center bg-[var(--bg)]/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                    <span className="text-[10px] sm:text-xs text-blue-500 font-bold uppercase tracking-widest mb-1.5 opacity-80">Efectivo Esperado</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">${closeExpectedTotals.expectedAmount.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col items-center bg-[var(--bg)]/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                    <span className="text-[10px] sm:text-xs text-blue-500 font-bold uppercase tracking-widest mb-1.5 opacity-80">Tarjeta</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">${closeExpectedTotals.expectedTarjeta.toFixed(4)}</span>
                  </div>
                  <div className="flex flex-col items-center bg-[var(--bg)]/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                    <span className="text-[10px] sm:text-xs text-blue-500 font-bold uppercase tracking-widest mb-1.5 opacity-80">Transferencia</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">${closeExpectedTotals.expectedTransferencia.toFixed(4)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* BILLETES */}
                <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-5 border-b border-[var(--border)] pb-3">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <DollarSign size={20} className="stroke-[2.5px]" />
                    </div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">Billetes</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'd100', label: '$100' },
                      { key: 'd50',  label: '$50'  },
                      { key: 'd20',  label: '$20'  },
                      { key: 'd10',  label: '$10'  },
                      { key: 'd5',   label: '$5'   },
                      { key: 'd1',   label: '$1'   },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1.5 group">
                        <label className="text-xs font-bold text-[var(--text-sec)] tracking-wider">{label}</label>
                        <NumberInput
                          value={closeBills[key as keyof BillsBreakdown]}
                          onValueChange={(val) =>
                            setCloseBills(prev => ({ ...prev, [key]: val ?? 0 }))
                          }
                          min={0}
                          max={500}
                          step={1}
                          placeholder="0"
                          className="font-bold text-lg group-focus-within:border-[var(--primary)] transition-colors h-11"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* MONEDAS */}
                <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-center gap-3 mb-5 border-b border-[var(--border)] pb-3">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <div className="w-5 h-5 rounded-full border-[2.5px] border-amber-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      </div>
                    </div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">Monedas</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 flex-1 content-start">
                    {[
                      { key: 'c25', label: '$0.25' },
                      { key: 'c10', label: '$0.10' },
                      { key: 'c5',  label: '$0.05' },
                      { key: 'c1',  label: '$0.01' },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1.5 group">
                        <label className="text-xs font-bold text-[var(--text-sec)] tracking-wider">{label}</label>
                        <NumberInput
                          value={closeCoins[key as keyof CoinsBreakdown]}
                          onValueChange={(val) =>
                            setCloseCoins(prev => ({ ...prev, [key]: val ?? 0 }))
                          }
                          min={0}
                          max={2000}
                          step={1}
                          placeholder="0"
                          className="font-bold text-lg group-focus-within:border-[var(--primary)] transition-colors h-11"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total y Observaciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-end">
                <div className="space-y-2 h-full flex flex-col justify-end">
                  <label className="text-xs sm:text-sm font-bold text-[var(--text-sec)] uppercase tracking-widest">Observaciones (Opcional)</label>
                  <Input
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Ej. Billete roto..."
                    className="h-12 sm:h-[72px] rounded-xl sm:rounded-2xl text-sm sm:text-base px-4"
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center rounded-xl sm:rounded-2xl border-2 border-rose-500/20 bg-rose-500/5 px-4 sm:px-6 py-3 sm:py-0 sm:h-[72px] shadow-inner gap-1 sm:gap-0">
                  <span className="text-[10px] sm:text-sm font-bold text-rose-500 uppercase tracking-widest opacity-80">Total Contado</span>
                  <span className="text-3xl sm:text-4xl font-black text-rose-500 tracking-tight">
                    ${calcBreakdownTotal(closeBills, closeCoins).toFixed(4)}
                  </span>
                </div>
              </div>

              <DialogFooter className="mt-4 sm:mt-6 p-4 sm:p-6 pt-0 bg-[var(--bg)]/50 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCloseShiftModal(false)}
                    className="w-full sm:w-auto font-bold text-[var(--text-sec)] hover:bg-slate-100 h-12 px-8"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={canCloseDirectly ? handleCloseShift : handleRequestClose}
                    disabled={loadingShift || calcBreakdownTotal(closeBills, closeCoins) <= 0}
                    variant="destructive"
                    className="w-full sm:w-auto text-lg h-12 px-12 shadow-lg shadow-rose-500/20"
                  >
                    {loadingShift ? "Procesando..." : (canCloseDirectly ? "Confirmar Cierre" : "Enviar Solicitud")}
                  </Button>
                </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Transferencia a Caja Fuerte */}
      <Dialog open={showTransferSafeModal} onOpenChange={setShowTransferSafeModal}>
        <DialogContent className="sm:max-w-2xl p-0 max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-6 pb-4 border-b border-[var(--border)] bg-[var(--bg)]/50 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black text-emerald-600">
                <div className="p-2 sm:p-2.5 bg-emerald-50 rounded-xl sm:rounded-2xl text-emerald-600 shadow-sm">
                  <DollarSign size={24} className="sm:w-7 sm:h-7" />
                </div>
                Transferencia a Caja Fuerte
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base font-medium opacity-80 mt-1">
                Ingresa el desglose del dinero que vas a transferir a la caja fuerte. Solo se imprimirá un ticket.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-3 mb-5 border-b border-[var(--border)] pb-3">
                  <h3 className="font-bold text-lg">Billetes</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'd100', label: '$100' },
                    { key: 'd50',  label: '$50'  },
                    { key: 'd20',  label: '$20'  },
                    { key: 'd10',  label: '$10'  },
                    { key: 'd5',   label: '$5'   },
                    { key: 'd1',   label: '$1'   },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-sec)]">{label}</label>
                      <NumberInput
                        value={transferBills[key as keyof BillsBreakdown]}
                        onValueChange={(val) => setTransferBills(prev => ({ ...prev, [key]: val ?? 0 }))}
                        min={0} max={500} step={1} placeholder="0" className="h-11"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-3 mb-5 border-b border-[var(--border)] pb-3">
                  <h3 className="font-bold text-lg">Monedas</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'c25', label: '$0.25' },
                    { key: 'c10', label: '$0.10' },
                    { key: 'c5',  label: '$0.05' },
                    { key: 'c1',  label: '$0.01' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-sec)]">{label}</label>
                      <NumberInput
                        value={transferCoins[key as keyof CoinsBreakdown]}
                        onValueChange={(val) => setTransferCoins(prev => ({ ...prev, [key]: val ?? 0 }))}
                        min={0} max={2000} step={1} placeholder="0" className="h-11"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center rounded-xl border-2 border-emerald-500/20 bg-emerald-50 px-6 h-[72px] shadow-inner mt-4">
              <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Total a Transferir</span>
              <span className="text-4xl font-black text-emerald-600 tracking-tight">
                ${calcBreakdownTotal(transferBills, transferCoins).toFixed(4)}
              </span>
            </div>
          </div>
          <DialogFooter className="p-4 sm:p-6 border-t border-[var(--border)] bg-[var(--bg)]/50 shrink-0">
            <Button variant="ghost" onClick={() => setShowTransferSafeModal(false)} className="w-full sm:w-auto h-12 px-8 font-bold">Cancelar</Button>
            <Button
              onClick={printSafeTransferTicket}
              disabled={calcBreakdownTotal(transferBills, transferCoins) <= 0}
              className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
            >
              <Printer size={18} className="mr-2" /> Imprimir Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cotización */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="text-[var(--primary)]" />
              Guardar Cotización
            </DialogTitle>
            <DialogDescription>
              Esta acción no descontará inventario y generará un documento válido por los días especificados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Validez (Días)</label>
              <NumberInput
                value={quoteValidDays}
                onValueChange={(val) => setQuoteValidDays(val === undefined ? "" : val)}
                placeholder="Ej. 15"
                className="text-lg font-bold"
              />
            </div>
            {selectedCustomer && (
              <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2">
                <User size={16} /> A nombre de: <b>{selectedCustomer.name}</b>
              </div>
            )}
            {!selectedCustomer && (
              <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> Cotización a Consumidor Final
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>Cancelar</Button>
            <Button
              ref={quoteBtnRef}
              onClick={() => {
                if (!isQuoteSubmittingGlobal) handleSaveQuote();
              }}
              disabled={loading || quoteValidDays === ""}
              className="gap-2"
            >
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Alerta de Error de Checkout (Ej: Crédito) */}
      <Dialog open={!!checkoutErrorAlert} onOpenChange={(open) => !open && setCheckoutErrorAlert(null)}>
        <DialogContent className="sm:max-w-[425px] border-none bg-rose-500 text-white shadow-2xl">
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle size={40} className="text-white" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
              Venta Denegada
            </DialogTitle>
            <DialogDescription className="text-white/90 font-bold text-sm">
              {checkoutErrorAlert}
            </DialogDescription>
            <div className="pt-4 w-full">
              <Button
                onClick={() => setCheckoutErrorAlert(null)}
                className="w-full bg-white text-rose-600 hover:bg-white/90 font-black uppercase tracking-widest h-12 rounded-xl"
              >
                Entendido, cambiar método
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cobro Mixto */}
      <Dialog open={showMixedPaymentModal} onOpenChange={setShowMixedPaymentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <DollarSign className="text-[var(--primary)]" size={28} />
              Confirmar Cobro
            </DialogTitle>
            <DialogDescription>
              Verifique o divida el pago en múltiples métodos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex justify-between items-center p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
              <span className="text-lg font-bold text-[var(--text-sec)]">Total a Cobrar</span>
              <span className="text-3xl font-black text-[var(--text-main)]">${total.toFixed(4)}</span>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {payments.map((payment, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                  <div className="flex justify-between items-center">
                    <Select
                      value={payment.paymentMethod}
                      onValueChange={(val: any) => {
                        const newPayments = [...payments];
                        newPayments[index].paymentMethod = val;
                        setPayments(newPayments);
                      }}
                    >
                      <SelectTrigger className="w-[160px] h-9 text-xs font-bold bg-[var(--card)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CREDITO"]
                          .filter(method => {
                            if (method === "CREDITO" && sysConfig?.allowCreditSales === false) return false;
                            if (!branchPaymentConfig) return true;
                            if (method === "EFECTIVO" && !branchPaymentConfig.acceptsCash) return false;
                            if (method === "TARJETA" && !branchPaymentConfig.acceptsCard) return false;
                            if (method === "TRANSFERENCIA" && !branchPaymentConfig.acceptsTransfer) return false;
                            if (method === "CREDITO" && !branchPaymentConfig.acceptsCredit) return false;
                            return true;
                          })
                          .map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--primary)]">$</span>
                        <NumberInput
                          value={payment.amount}
                          onValueChange={(val) => {
                            const newPayments = [...payments];
                            newPayments[index].amount = val || 0;
                            setPayments(newPayments);
                          }}
                          min={0}
                          step={0.01}
                          hideControls={true}
                          className="w-28 h-9 pl-5 pr-3 text-right font-black text-[var(--primary)] text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-rose-500 hover:bg-rose-100 shrink-0"
                        onClick={() => {
                          if (payments.length > 1) {
                            setPayments(payments.filter((_, i) => i !== index));
                          }
                        }}
                        disabled={payments.length === 1}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  {(payment.paymentMethod === 'TARJETA' || payment.paymentMethod === 'TRANSFERENCIA') && (
                    <Input
                      placeholder="N° Referencia / Voucher (Opcional)"
                      value={payment.reference || ''}
                      onChange={(e) => {
                        const newPayments = [...payments];
                        newPayments[index].reference = e.target.value;
                        setPayments(newPayments);
                      }}
                      className="h-8 text-xs bg-[var(--card)]"
                    />
                  )}
                  {payment.paymentMethod === 'TRANSFERENCIA' && (
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`transfer-receipt-${index}`}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer border border-dashed rounded-lg px-3 py-2 text-xs transition-colors",
                          uploadingReceipt[index]
                            ? "border-[var(--primary)]/50 bg-[var(--primary)]/5 text-[var(--primary)]"
                            : payment.transferReceiptUrl
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "border-[var(--border)] bg-[var(--card)] text-[var(--text-sec)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
                        )}
                      >
                        {uploadingReceipt[index] ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                        ) : payment.transferReceiptUrl ? (
                          <ImageIcon size={14} className="shrink-0" />
                        ) : (
                          <Upload size={14} className="shrink-0" />
                        )}
                        <span className="truncate">
                          {uploadingReceipt[index]
                            ? "Subiendo comprobante..."
                            : payment.transferReceiptUrl
                            ? "Comprobante subido — clic para cambiar"
                            : "Subir foto del comprobante (Opcional)"}
                        </span>
                        <input
                          id={`transfer-receipt-${index}`}
                          type="file"
                          accept="image/jpg,image/jpeg,image/png,application/pdf"
                          className="sr-only"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingReceipt(prev => ({ ...prev, [index]: true }));
                            try {
                              const { url } = await uploadsService.uploadReceipt(file);
                              const newPayments = [...payments];
                              newPayments[index].transferReceiptUrl = url;
                              setPayments(newPayments);
                            } catch {
                              toast.error("Error al subir el comprobante de transferencia");
                            } finally {
                              setUploadingReceipt(prev => ({ ...prev, [index]: false }));
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full h-10 border-dashed border-[var(--primary)]/50 text-[var(--primary)] hover:bg-[var(--primary)]/10"
              onClick={() => {
                const currentSum = payments.reduce((sum, p) => sum + p.amount, 0);
                const diff = total - currentSum;
                setPayments([...payments, { paymentMethod: 'EFECTIVO', amount: diff > 0 ? diff : 0 }]);
              }}
            >
              <Plus size={16} className="mr-2" /> Agregar otro método de pago
            </Button>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--border)]">
            <div className="flex-1 flex justify-between items-center w-full">
              <span className="text-sm font-bold text-[var(--text-sec)]">Resta:</span>
              <span className={cn("text-lg font-black", (total - payments.reduce((sum, p) => sum + p.amount, 0)) === 0 ? "text-emerald-500" : "text-rose-500")}>
                ${(total - payments.reduce((sum, p) => sum + p.amount, 0)).toFixed(4)}
              </span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setShowMixedPaymentModal(false)} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!isCheckoutSubmittingGlobal) processSale();
                }}
                disabled={loading || Math.abs(payments.reduce((sum, p) => sum + p.amount, 0) - total) > 0.01}
                className="flex-1 sm:flex-none bg-[var(--primary)] text-white"
              >
                {loading ? <RefreshCcw className="animate-spin size-4 mr-2" /> : "Confirmar Venta"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal: Confirmar Pre-Venta (Ticket) */}
      <Dialog open={showPreSaleModal} onOpenChange={setShowPreSaleModal}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="p-5 border-b border-[var(--border)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-black text-amber-600">
                <FileText size={20} /> Preparar Ticket de Pre-Venta
              </DialogTitle>
              <DialogDescription className="text-sm text-[var(--text-sec)]">
                El ticket se entrega en caja. La cajera cobra y confirma el pago.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-3 space-y-1 max-h-40 overflow-y-auto">
              {cart.map((item) =>
                item.selections.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-[var(--text-main)] font-medium">{item.name} <span className="text-[var(--text-sec)]">x{s.quantity}</span></span>
                    <span className="font-bold">${(s.quantity * s.price).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between font-black text-base border-t border-[var(--border)] pt-3">
              <span>TOTAL:</span><span>${total.toFixed(2)}</span>
            </div>
            {selectedCustomer && (
              <div className="text-sm text-[var(--text-sec)]">
                <span className="font-bold">Cliente:</span> {selectedCustomer.name}
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-[var(--text-sec)] uppercase block mb-1">Descripción / Nota (opcional)</label>
              <textarea
                value={preSaleDescription}
                onChange={(e) => setPreSaleDescription(e.target.value)}
                placeholder="Ej: Entregar en bodega, urgente, pedido especial..."
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <DialogFooter className="p-5 border-t border-[var(--border)] flex gap-2">
            <Button variant="ghost" onClick={() => setShowPreSaleModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handlePreSale}
              disabled={preSaleLoading || cart.length === 0}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black"
            >
              {preSaleLoading
                ? <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" />
                : <><FileText className="mr-2 size-4" /> Generar Ticket</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Ticket Creado — opción de imprimir */}
      <Dialog open={!!createdTicket} onOpenChange={(open) => { if (!open) setCreatedTicket(null); }}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="p-5 text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-black text-[var(--text-main)]">Ticket Generado</h2>
            <p className="text-3xl font-black text-amber-600">{createdTicket?.ticketNumber}</p>
            <p className="text-sm text-[var(--text-sec)]">Entrega este ticket al cliente para que lo presente en caja.</p>
            <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-3 text-left space-y-1">
              {createdTicket?.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.product?.name} x{Number(item.quantity)}</span>
                  <span className="font-bold">${Number(item.totalPrice).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-2 flex justify-between font-black">
                <span>Total</span><span>${Number(createdTicket?.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t border-[var(--border)] flex gap-2">
            <Button variant="ghost" onClick={() => setCreatedTicket(null)} className="flex-1">Cerrar</Button>
            <Button
              onClick={() => { if (createdTicket) printTicket(createdTicket); }}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black"
            >
              <Printer className="mr-2 size-4" /> Imprimir Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
