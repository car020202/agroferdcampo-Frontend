import { useState, useEffect } from "react";
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
  Save
} from "lucide-react";
import { apiRequest } from "../config/api";
import { createSale, sendFacturaConsumidor, sendCreditoFiscal } from "../services/sales.service";
import { cashShiftsService, CashShift } from "../services/cash-shifts.service";
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

export function POS() {
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
  const [initialAmount, setInitialAmount] = useState<number | "">("");
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [countedCash, setCountedCash] = useState<number | "">("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closeSummary, setCloseSummary] = useState<{ expectedAmount: number; countedCash: number; difference: number } | null>(null);

  // Quote States
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteValidDays, setQuoteValidDays] = useState<number | "">(15);

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
    if (initialAmount === "" || initialAmount < 0) {
      toast.error("Ingrese un monto inicial válido");
      return;
    }
    try {
      setLoadingShift(true);
      const shift = await cashShiftsService.openShift(Number(initialAmount));
      setActiveShift(shift);
      setShowOpenShiftModal(false);
      toast.success("Caja abierta exitosamente");
    } catch (error: any) {
      toast.error(error.message || "Error al abrir caja");
    } finally {
      setLoadingShift(false);
    }
  };

  const handleCloseShift = async () => {
    if (countedCash === "" || countedCash < 0) {
      toast.error("Ingrese el monto contado en caja");
      return;
    }
    try {
      setLoadingShift(true);
      const res = await cashShiftsService.closeShift(Number(countedCash), closeNotes);
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
    if (quoteValidDays === "" || quoteValidDays <= 0) {
      toast.error("Ingrese una validez en días correcta");
      return;
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
      searchProducts(""); // reload products
      setSelectedCustomer(null);
      setShowQuoteModal(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la cotización");
    } finally {
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
    setProcessingOverlay(true);
    setLoading(true);

    try {
      // Paso 1: Crear venta y descontar stock
      await createSale({
        customerId: selectedCustomer?.id,
        paymentMethod: selectedPayment,
        totalAmount: total,
        taxAmount: iva,
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

    } catch (error: any) {
      toast.error(error.message || "Error al procesar la venta. Verifique el stock.");
    } finally {
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
              onClick={() => setShowCloseShiftModal(true)}
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
                  onClick={handleCheckout}
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

      {/* 2. Modals de Caja */}
      <Dialog open={showOpenShiftModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="text-[var(--primary)]" />
              Apertura de Caja
            </DialogTitle>
            <DialogDescription>
              Para iniciar ventas, debes abrir la caja ingresando el efectivo inicial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto Inicial en Efectivo</label>
              <NumberInput
                value={initialAmount}
                onValueChange={(val) => setInitialAmount(val === undefined ? "" : val)}
                placeholder="Ej. 50.00"
                className="text-lg font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleOpenShift}
              disabled={loadingShift || initialAmount === ""}
              className="w-full text-lg h-12"
            >
              {loadingShift ? "Abriendo..." : "Abrir Caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseShiftModal} onOpenChange={(open) => !loadingShift && setShowCloseShiftModal(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="text-red-500" />
              Cierre de Caja
            </DialogTitle>
            <DialogDescription>
              Ingresa el dinero físico contado en la gaveta.
            </DialogDescription>
          </DialogHeader>
          {closeSummary ? (
            <div className="space-y-4 py-4 animate-in fade-in zoom-in duration-300">
              <div className="p-4 rounded-xl border bg-slate-50 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Monto Esperado (Sistema):</span>
                  <span className="font-bold">${closeSummary.expectedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Monto Contado (Real):</span>
                  <span className="font-bold">${closeSummary.countedCash.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="font-medium">Diferencia:</span>
                  <span className={cn("font-bold text-lg", closeSummary.difference < 0 ? "text-red-500" : "text-green-600")}>
                    {closeSummary.difference > 0 ? "+" : ""}${closeSummary.difference.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dinero Contado Físicamente</label>
                <NumberInput
                  value={countedCash}
                  onValueChange={(val) => setCountedCash(val === undefined ? "" : val)}
                  placeholder="Ej. 1250.00"
                  className="text-lg font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-500">Observaciones (Opcional)</label>
                <Input
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Faltaron 2 dólares, billete roto..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {closeSummary ? (
              <Button
                onClick={() => {
                  setShowCloseShiftModal(false);
                  setCloseSummary(null);
                  setCountedCash("");
                  setCloseNotes("");
                  setShowOpenShiftModal(true); // Requiere abrir de nuevo para vender
                }}
                className="w-full"
              >
                Entendido
              </Button>
            ) : (
              <Button
                onClick={handleCloseShift}
                disabled={loadingShift || countedCash === ""}
                variant="destructive"
                className="w-full"
              >
                {loadingShift ? "Cerrando..." : "Confirmar Cierre"}
              </Button>
            )}
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
              onClick={handleSaveQuote}
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
