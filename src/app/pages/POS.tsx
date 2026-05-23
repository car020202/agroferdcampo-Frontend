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
            "w-full justify-start text-left font-normal bg-[var(--card)] border-[var(--border)] h-10 px-3 hover:bg-[var(--primary)]/5 transition-all text-sm rounded-xl focus:ring-[var(--primary)]/20",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50 text-[var(--primary)]" />
          {date ? (
            <span className="font-bold text-[var(--text-main)]">
              {format(date, "dd/MM/yyyy")}
            </span>
          ) : (
            <span className="opacity-40">{placeholder || "dd/mm/aaaa"}</span>
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

  // Customer State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // New Checkout States
  const [processingOverlay, setProcessingOverlay] = useState(false);

  // Cash Shift States
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [openBills, setOpenBills] = useState<BillsBreakdown>({ d100:0, d50:0, d20:0, d10:0, d5:0, d1:0 });
  const [openCoins, setOpenCoins] = useState<CoinsBreakdown>({ c25:0, c10:0, c5:0, c1:0 });
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
    }
  }, [user]);

  const checkActiveShift = async () => {
    setLoadingShift(true);
    try {
      const shift = await cashShiftsService.getActiveShift();
      if (shift) {
        setActiveShift(shift);
        setShowOpenShiftModal(false);
      } else {
        setActiveShift(null);
        setShowOpenShiftModal(true);
      }
    } catch (error) {
      toast.error("Error al verificar turno de caja");
    } finally {
      setLoadingShift(false);
    }
  };

  const handleOpenShift = async () => {
    const total = calcBreakdownTotal(openBills, openCoins);
    if (total <= 0) {
      toast.error("El desglose debe sumar al menos $0.01");
      return;
    }

    try {
      setLoadingShift(true);
      const shift = await cashShiftsService.openShift({ breakdown: { bills: openBills, coins: openCoins } });
      setActiveShift(shift);
      setShowOpenShiftModal(false);
      // Reset breakdown state
      setOpenBills({ d100:0, d50:0, d20:0, d10:0, d5:0, d1:0 });
      setOpenCoins({ c25:0, c10:0, c5:0, c1:0 });
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
      quoteBtnRef.current.style.pointerEvents = 'none';
      quoteBtnRef.current.style.opacity = '0.6';
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
      });

      toast.success("Cotización guardada exitosamente");
      setCart([]);
      setSearchTerm("");
      searchProducts("");
      setSelectedCustomer(null);
      setShowQuoteModal(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la cotización");
      // Si falla, rehabilitar el botón para que el cajero corrija y reintente
      if (quoteBtnRef.current) {
        quoteBtnRef.current.disabled = false;
        quoteBtnRef.current.style.pointerEvents = '';
        quoteBtnRef.current.style.opacity = '';
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

        const publicPrice =
          p.prices?.find((pr: any) => pr.priceType === "PUBLICO")?.price ||
          p.prices?.[0]?.price ||
          p.price ||
          0;

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
  const subtotal = isNaN(total) ? 0 : total / 1.13;
  const iva = isNaN(total) ? 0 : total - subtotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (isCheckoutSubmittingGlobal) return;

    // Bloquear el botón a nivel DOM ANTES de cualquier código asíncrono
    isCheckoutSubmittingGlobal = true;
    isSubmittingRef.current = true;
    if (checkoutBtnRef.current) {
      checkoutBtnRef.current.disabled = true;
      checkoutBtnRef.current.style.pointerEvents = 'none';
      checkoutBtnRef.current.style.opacity = '0.6';
    }
    setProcessingOverlay(true);
    setLoading(true);

    try {
      await createSale({
        customerId: selectedCustomer?.id,
        paymentMethod: selectedPayment,
        totalAmount: total,
        taxAmount: iva,
        dueDate: selectedPayment === "CREDITO" && checkoutDueDate ? checkoutDueDate : undefined,
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
      });

      toast.success("Venta registrada exitosamente");
      setCart([]);
      setSearchTerm("");
      setProducts([]);
      setSelectedCustomer(null);
      setCheckoutDueDate("");

    } catch (error: any) {
      toast.error(error.message || "Error al procesar la venta. Verifique el stock.");
      // Si falla, rehabilitar el botón para que el cajero corrija y reintente
      if (checkoutBtnRef.current) {
        checkoutBtnRef.current.disabled = false;
        checkoutBtnRef.current.style.pointerEvents = '';
        checkoutBtnRef.current.style.opacity = '';
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
    <div className="h-[calc(100vh-155px)] flex flex-col gap-4 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            Punto de Venta
          </h1>
          <p className="text-sm text-[var(--text-sec)]">
            Genera facturas y créditos fiscales al instante.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border bg-[var(--card)] border-[var(--border)] text-[var(--text-sec)] shadow-sm">
            <Package size={16} className="text-[var(--primary)]" />
            <span className="font-bold">{user?.branch || "Sucursal"}</span>
          </div>
          {activeShift && (
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleOpenCloseShiftModal}
            >
              <Lock size={16} className="mr-2" />
              Cerrar Caja
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Product List Section */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="relative w-full group mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[var(--text-sec)] group-focus-within:text-[var(--primary)] transition-colors" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="F1: Buscar productos o escanear código..."
              className="pl-12 text-lg h-14 bg-[var(--card)] shadow-md border-[var(--border)] rounded-2xl w-full focus-visible:ring-[var(--primary)]/20"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin h-5 w-5 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className="h-auto p-4 rounded-2xl flex flex-col items-stretch text-left transition-all hover:shadow-xl hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 group bg-[var(--card)] border-[var(--border)] active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-2 w-full">
                    <div className="flex-1">
                      <p className="font-bold text-lg leading-tight text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                        {product.name}
                      </p>
                      <p className="text-[10px] font-mono mt-1 opacity-60 text-[var(--text-sec)]">
                        {product.internalCode} • {product.category.name}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all shadow-sm">
                      <Plus size={20} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 w-full">
                    <span className="text-2xl font-black text-[var(--primary)]">
                      ${product.price.toFixed(2)}
                    </span>
                    <Badge
                      variant={product.stock < 10 ? "destructive" : "secondary"}
                      className="font-bold text-[10px] uppercase rounded-lg px-2"
                    >
                      {product.stock} {product.unit}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart & Customer Section */}
        <div className="flex flex-col gap-4 min-h-0 h-full">
          {/* Customer Selector */}
          <div
            className="p-4 rounded-2xl border bg-[var(--card)] shadow-md"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: "var(--text-main)" }}
              >
                <User size={16} /> Cliente
              </h3>
              {!selectedCustomer && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] gap-1 text-[var(--accent)] hover:bg-[var(--accent)]/10"
                  onClick={() => setIsQuickCreateOpen(true)}
                >
                  <UserPlus size={14} /> Registro Rápido
                </Button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold shadow-lg shadow-[var(--primary)]/20">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight text-[var(--text-main)]">
                      {selectedCustomer.name}
                    </p>
                    <p className="text-[10px] opacity-60 text-[var(--text-sec)]">
                      {selectedCustomer.customerType} •{" "}
                      {selectedCustomer.nit ||
                        selectedCustomer.documentNumber ||
                        "Sin Doc"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                  onClick={() => setSelectedCustomer(null)}
                >
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30"
                  size={16}
                />
                <Input
                  placeholder="Buscar por Nombre o NIT..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9 h-10 text-sm bg-[var(--bg)]"
                />
                {searchingCustomer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-3 w-3 border border-[var(--accent)] border-t-transparent rounded-full" />
                )}

                {customerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border bg-[var(--card)] shadow-2xl max-h-64 overflow-y-auto divide-y divide-[var(--border)] border-[var(--border)]">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left p-4 hover:bg-[var(--primary)]/5 transition-all flex flex-col group"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerResults([]);
                          setCustomerSearch("");
                        }}
                      >
                        <span className="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                          {c.name}
                        </span>
                        <span className="text-[10px] opacity-60 text-[var(--text-sec)]">
                          {c.customerType} •{" "}
                          {c.nit || c.documentNumber || "Final"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div
            className="flex-1 flex flex-col rounded-2xl border bg-[var(--card)] shadow-xl min-h-0 overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="p-4 border-b flex items-center justify-between border-[var(--border)]">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-[var(--primary)]" />
                <h2 className="font-bold text-[var(--text-main)]">
                  Resumen de Venta
                </h2>
              </div>
              <Badge variant="secondary" className="font-bold rounded-lg">
                {cart.length} items
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                    <ShoppingCart size={48} className="mb-2" />
                    <p className="text-sm">Carrito vacío</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] group hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <p className="font-bold text-sm leading-tight text-[var(--text-main)]">
                          {item.name}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-[var(--card)] rounded-xl border border-[var(--border)] p-1 shadow-sm">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="text-sm font-bold w-6 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus size={14} />
                          </Button>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 text-[var(--primary)] font-black">
                            <span className="text-sm">$</span>
                            <NumberInput
                              value={item.price === 0 ? "" : item.price}
                              onValueChange={(val) => updatePrice(item.id, val)}
                              onBlur={() => {
                                if (!item.price || item.price <= 0) {
                                  updatePrice(item.id, item.originalPrice);
                                }
                              }}
                              step={0.01}
                              className="w-28 h-10 bg-[var(--card)] border-[var(--border)] text-right pr-10 font-bold text-base"
                            />
                          </div>
                          <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">
                            Subtotal: ${item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              className="p-4 bg-[var(--bg)]/30 border-t space-y-4 flex-shrink-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="space-y-1.5 px-1">
                <div className="flex justify-between text-xs font-medium text-[var(--text-sec)]">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-[var(--text-sec)]">
                  <span>IVA (13%)</span>
                  <span>${iva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-3xl font-black text-[var(--primary)] pt-3 mt-3 border-t-2 border-dashed border-[var(--border)]">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CREDITO"].map(
                  (method) => (
                    <Button
                      key={method}
                      variant={
                        selectedPayment === method ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedPayment(method as any)}
                      className={cn(
                        "rounded-xl text-[9px] font-black tracking-tighter transition-all h-9 px-0.5",
                        selectedPayment === method
                          ? "shadow-lg shadow-[var(--primary)]/20"
                          : "bg-[var(--card)]",
                      )}
                    >
                      {method}
                    </Button>
                  ),
                )}
              </div>

              {selectedPayment === "CREDITO" && (
                <div className="p-3 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">
                      Vencimiento de Crédito
                    </Label>
                    <span className="text-[10px] text-[var(--primary)] font-bold">
                      Default: 30 días
                    </span>
                  </div>
                  <DatePicker 
                    date={checkoutDueDate ? parseLocalDate(checkoutDueDate) : undefined}
                    setDate={handleDateChange}
                    placeholder="Seleccionar vencimiento"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setShowQuoteModal(true)}
                  disabled={loading || cart.length === 0}
                  variant="outline"
                  size="xl"
                  className="w-full gap-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                >
                  <Save size={20} /> COTIZAR
                </Button>
                <Button
                  ref={checkoutBtnRef}
                  onPointerDown={() => {
                    if (!isCheckoutSubmittingGlobal) handleCheckout();
                  }}
                  disabled={loading || cart.length === 0}
                  variant="premium"
                  size="xl"
                  className="w-full gap-2"
                >
                  {loading ? (
                    <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Printer size={20} /> COBRAR
                    </>
                  )}
                </Button>
              </div>
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
        <DialogContent className="sm:max-w-3xl overflow-hidden p-0">
          <div className="p-6 pb-4 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-black text-[var(--text-main)]">
                <div className="p-2.5 bg-[var(--primary)]/10 rounded-2xl text-[var(--primary)] shadow-sm">
                  <Unlock size={28} />
                </div>
                Apertura de Caja
              </DialogTitle>
              <DialogDescription className="text-base font-medium opacity-80 mt-1">
                Ingresa el efectivo inicial contando los billetes y monedas disponibles en la gaveta.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 pt-4 space-y-6">
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

            {/* Total calculado */}
            <div className="flex justify-between items-center rounded-2xl border-2 border-[var(--primary)]/20 bg-[var(--primary)]/5 px-6 py-4 shadow-inner">
              <span className="text-sm font-bold text-[var(--primary)] uppercase tracking-widest opacity-80">Total Calculado</span>
              <span className="text-4xl font-black text-[var(--primary)] tracking-tight">
                ${calcBreakdownTotal(openBills, openCoins).toFixed(2)}
              </span>
            </div>
          </div>

          <DialogFooter className="p-6 pt-6 border-t border-[var(--border)] bg-[var(--bg)]/50 flex sm:justify-between w-full">
            <Button
              variant="ghost"
              onClick={() => {
                setShowOpenShiftModal(false);
                navigate('/dashboard');
              }}
              className="font-bold text-[var(--text-sec)] hover:bg-slate-100 h-12 px-8"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenShift}
              disabled={
                loadingShift ||
                calcBreakdownTotal(openBills, openCoins) <= 0
              }
              className="text-lg h-12 px-12 shadow-lg shadow-[var(--primary)]/20"
            >
              {loadingShift ? "Abriendo..." : "Abrir Caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseShiftModal} onOpenChange={(open) => !loadingShift && setShowCloseShiftModal(open)}>
        <DialogContent className="sm:max-w-3xl overflow-hidden p-0">
          <div className="p-6 pb-4 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-black text-rose-500">
                <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-500 shadow-sm">
                  <Lock size={28} />
                </div>
                Cierre de Caja
              </DialogTitle>
              <DialogDescription className="text-base font-medium opacity-80 mt-1">
                Cuenta los billetes y monedas en la gaveta para cerrar tu turno.
              </DialogDescription>
            </DialogHeader>
          </div>

          {closeSummary ? (
            <div className="p-6 space-y-4">
              <div className="p-6 rounded-2xl border bg-slate-50 space-y-4">
                <div className="flex justify-between items-center text-base">
                  <span className="text-slate-500 font-medium">Monto Esperado (Sistema):</span>
                  <span className="font-bold text-xl">${closeSummary.expectedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="text-slate-500 font-medium">Monto Contado (Real):</span>
                  <span className="font-bold text-xl">${closeSummary.countedCash.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="font-bold text-lg">Diferencia:</span>
                  <span className={cn("font-black text-3xl", closeSummary.difference < 0 ? "text-red-500" : "text-emerald-500")}>
                    {closeSummary.difference > 0 ? "+" : ""}${closeSummary.difference.toFixed(2)}
                  </span>
                </div>
              </div>
              <DialogFooter className="pt-2">
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
            <div className="p-6 pt-4 space-y-6">
              {closeExpectedTotals && (
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 grid grid-cols-3 gap-6 shadow-sm text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-blue-600/70 font-bold uppercase tracking-widest mb-1.5">Efectivo Esperado</span>
                    <span className="text-2xl font-black text-blue-700">${closeExpectedTotals.expectedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-blue-600/70 font-bold uppercase tracking-widest mb-1.5">Tarjeta</span>
                    <span className="text-2xl font-black text-blue-700">${closeExpectedTotals.expectedTarjeta.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-blue-600/70 font-bold uppercase tracking-widest mb-1.5">Transferencia</span>
                    <span className="text-2xl font-black text-blue-700">${closeExpectedTotals.expectedTransferencia.toFixed(2)}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2 h-full flex flex-col justify-end">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Observaciones (Opcional)</label>
                  <Input
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Ej. Billete roto..."
                    className="h-[72px] rounded-2xl text-base px-4"
                  />
                </div>
                <div className="flex justify-between items-center rounded-2xl border-2 border-rose-500/20 bg-rose-500/5 px-6 h-[72px] shadow-inner">
                  <span className="text-sm font-bold text-rose-500 uppercase tracking-widest opacity-80">Total Contado</span>
                  <span className="text-4xl font-black text-rose-500 tracking-tight">
                    ${calcBreakdownTotal(closeBills, closeCoins).toFixed(2)}
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-[var(--border)] flex sm:justify-between w-full">
                <Button
                  variant="ghost"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="font-bold text-[var(--text-sec)] hover:bg-slate-100 h-12 px-8"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCloseShift}
                  disabled={loadingShift || calcBreakdownTotal(closeBills, closeCoins) <= 0}
                  variant="destructive"
                  className="text-lg h-12 px-12 shadow-lg shadow-rose-500/20"
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
              onPointerDown={() => {
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
    </div>
  );
}
