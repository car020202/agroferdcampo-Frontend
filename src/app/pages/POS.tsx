import { useState, useEffect, useRef } from "react";
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
  Calendar as CalendarIcon
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { apiRequest } from "../config/api";
import { createSale, sendFacturaConsumidor, sendCreditoFiscal } from "../services/sales.service";
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
}

interface CartItem extends Product {
  quantity: number;
  subtotal: number;
  originalPrice: number;
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

export function POS() {
  const navigate = useNavigate();
  const isSubmittingRef = useRef(false);
  const checkoutBtnRef = useRef<HTMLButtonElement>(null);
  const quoteBtnRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [payments, setPayments] = useState<{ paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'; amount: number; reference?: string }[]>([]);

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

  // Quote States
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteValidDays, setQuoteValidDays] = useState<number | "">(15);
  const [checkoutDueDate, setCheckoutDueDate] = useState("");

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
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
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

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Producto sin stock disponible");
      return;
    }
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error("No hay más stock disponible");
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
          subtotal: product.price,
          originalPrice: product.price,
        },
      ]);
    }
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }
    if (newQuantity > item.stock) {
      toast.error("Excede el stock disponible");
      return;
    }
    setCart(
      cart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.price,
            }
          : item,
      ),
    );
  };

  const updatePrice = (id: number, newPrice: number | undefined) => {
    setCart(
      cart.map((item) => {
        if (item.id === id) {
          // We allow 0 or undefined to let the user clear and type
          const val = newPrice === undefined || isNaN(newPrice) ? 0 : newPrice;
          // But for the subtotal calculation, we use originalPrice if current value is invalid/zero
          const calcPrice = val <= 0 ? item.originalPrice : val;
          return {
            ...item,
            price: val,
            subtotal: item.quantity * calcPrice,
          };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
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
        setCheckoutErrorAlert(`CRÉDITO INSUFICIENTE. El cliente superaría su límite de crédito (Límite: $${limit.toFixed(2)}, Saldo: $${balance.toFixed(2)}, Venta: $${total.toFixed(2)})`);
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
      toast.error(`La suma de los pagos ($${sumPayments.toFixed(2)}) no coincide con el total ($${total.toFixed(2)})`);
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
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
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
        {activeShift && (
          <Button
            variant="outline" size="sm"
            className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold hover:border-red-300"
            onClick={handleOpenCloseShiftModal}
          >
            <Lock size={14} className="mr-2" /> Cerrar Caja ({activeShift.cashRegister?.name || 'Caja Activa'})
          </Button>
        )}
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
                      ${product.price.toFixed(2)}
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
                {cart.length} items
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
                  <div key={item.id} className="relative p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                    <div className="flex justify-between items-start mb-2 pr-6">
                      <p className="font-bold text-xs leading-tight text-[var(--text-main)]">{item.name}</p>
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-6 text-red-400 hover:bg-red-50 hover:text-red-500" onClick={() => removeFromCart(item.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-[var(--bg)] rounded border border-[var(--border)]">
                        <Button variant="ghost" size="icon" className="size-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus size={12} />
                        </Button>
                        <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="size-6 text-[var(--primary)]" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus size={12} />
                        </Button>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="relative flex items-center justify-end w-20">
                          <span className="absolute left-2 text-xs font-black text-[var(--primary)] pointer-events-none">$</span>
                          <NumberInput
                            value={item.price === 0 ? "" : item.price}
                            onValueChange={(val) => updatePrice(item.id, val)}
                            onBlur={() => { if (!item.price || item.price <= 0) updatePrice(item.id, item.originalPrice); }}
                            step={0.01}
                            hideControls={true}
                            className="w-full h-7 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded text-right pr-2 pl-4 font-black text-[var(--primary)] text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                          />
                        </div>
                        <span className="text-[9px] font-bold text-[var(--text-sec)]">Sub: ${item.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
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
                <span>Sub: ${subtotal.toFixed(2)}</span>
                <span>IVA: ${iva.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[var(--primary)] leading-none">${total.toFixed(2)}</span>
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

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setShowQuoteModal(true)}
                disabled={loading || cart.length === 0}
                variant="outline"
                className="h-12 rounded-xl font-bold text-sm border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
              >
                <Save className="mr-2 size-4" /> COTIZAR
              </Button>
              <Button
                ref={checkoutBtnRef}
                onClick={() => { if (!isCheckoutSubmittingGlobal) handleCheckoutClick(); }}
                disabled={loading || cart.length === 0}
                className="h-12 rounded-xl font-black text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
              >
                {loading ? <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" /> : <><Printer className="mr-2 size-4" /> COBRAR</>}
              </Button>
            </div>
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
                    <SelectItem key={reg.id} value={reg.id.toString()}>{reg.name}</SelectItem>
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
                  ${calcBreakdownTotal(openBills, openCoins).toFixed(2)}
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
                  <span className="text-[var(--text-sec)] font-medium">Monto Esperado (Sistema):</span>
                  <span className="font-bold text-xl text-[var(--text-main)]">${closeSummary.expectedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="text-[var(--text-sec)] font-medium">Monto Contado (Real):</span>
                  <span className="font-bold text-xl text-[var(--text-main)]">${closeSummary.countedCash.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
                  <span className="font-bold text-lg text-[var(--text-main)]">Diferencia:</span>
                  <span className={cn("font-black text-3xl", closeSummary.difference < 0 ? "text-red-500" : "text-emerald-500")}>
                    {closeSummary.difference > 0 ? "+" : ""}${closeSummary.difference.toFixed(2)}
                  </span>
                </div>
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
              {closeExpectedTotals && (
                <div className="bg-blue-500/5 p-4 sm:p-5 rounded-2xl border border-blue-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 shadow-sm text-center">
                  <div className="flex flex-col items-center bg-[var(--bg)]/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                    <span className="text-[10px] sm:text-xs text-blue-500 font-bold uppercase tracking-widest mb-1.5 opacity-80">Efectivo Esperado</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">${closeExpectedTotals.expectedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center bg-[var(--bg)]/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                    <span className="text-[10px] sm:text-xs text-blue-500 font-bold uppercase tracking-widest mb-1.5 opacity-80">Tarjeta</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">${closeExpectedTotals.expectedTarjeta.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center bg-[var(--bg)]/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                    <span className="text-[10px] sm:text-xs text-blue-500 font-bold uppercase tracking-widest mb-1.5 opacity-80">Transferencia</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">${closeExpectedTotals.expectedTransferencia.toFixed(2)}</span>
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
                    ${calcBreakdownTotal(closeBills, closeCoins).toFixed(2)}
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-[var(--border)] flex flex-col-reverse sm:flex-row sm:justify-between w-full shrink-0 gap-3 sm:gap-0 mt-4 sm:mt-0">
                <Button
                  variant="ghost"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="w-full sm:w-auto font-bold text-[var(--text-sec)] hover:bg-slate-100 h-12 px-8"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCloseShift}
                  disabled={loadingShift || calcBreakdownTotal(closeBills, closeCoins) <= 0}
                  variant="destructive"
                  className="w-full sm:w-auto text-lg h-12 px-12 shadow-lg shadow-rose-500/20"
                >
                  {loadingShift ? "Cerrando..." : "Confirmar Cierre"}
                </Button>
              </DialogFooter>
            </div>
          )}
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
              <span className="text-3xl font-black text-[var(--text-main)]">${total.toFixed(2)}</span>
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
                ${(total - payments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
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
    </div>
  );
}
