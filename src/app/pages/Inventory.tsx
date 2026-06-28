import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Search,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowLeftRight,
  ClipboardList,
  ChevronDown,
  Store,
  Trash2,
  PackagePlus,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { apiRequest } from "../config/api";
import { formatSmartInventory } from "../utils/inventory";

import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { cn } from "../components/ui/utils";
import { Button } from "../components/ui/button";
import { StateCards } from "../components/ui/state-cards";
import { SmartFilter, FilterConfig } from "../components/ui/smart-filter";

import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ProductPrice {
  priceType: string;
  branchId: number | null;
  price: string | number;
}

interface Product {
  id: number;
  name: string;
  internalCode?: string;
  barcode?: string;
  prices?: ProductPrice[];
  category?: { name: string };
  unit: string;
  units?: { unit: string; factor: number }[];
}

function getPublicPrice(product: Product): number {
  if (product.prices && product.prices.length > 0) {
    const pub = product.prices.find((p) => p.priceType === "PUBLICO");
    return Number(pub ? pub.price : product.prices[0].price);
  }
  return 0;
}

interface InventoryItem {
  id: number;
  productId: number;
  branchId: number;
  quantity: string | number;
  minStock: string | number;
  product: Product;
}

interface Branch {
  id: number;
  name: string;
}

// ── Component ──────────────────────────────────────────────────────────────────
import { Catalog } from './Catalog';

export function Inventory() {
  const [activeTab, setActiveTab] = useState<'inventario' | 'catalogo'>('inventario');

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-main)]">
          Inventario y Catálogo
        </h1>
        <p className="text-[var(--text-sec)]">
          Manejo de existencias físicas y catálogo de productos
        </p>
      </div>

      <div className="flex border-b border-[var(--border)] -mb-2">
        <button
          onClick={() => setActiveTab('inventario')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer flex items-center gap-2 ${
            activeTab === 'inventario' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-sec)]'
          }`}
        >
          <Package size={18} />
          Inventario
        </button>
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer flex items-center gap-2 ${
            activeTab === 'catalogo' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-sec)]'
          }`}
        >
          <Store size={18} />
          Catálogo
        </button>
      </div>

      {activeTab === 'inventario' && <InventoryList />}
      {activeTab === 'catalogo' && <Catalog hideTitle={true} />}
    </div>
  );
}

function InventoryList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Roles & Permissions (Define early to avoid ReferenceErrors)
  const isOwner = user?.roleId === 1;
  const isAdmin = user?.roleId === 2;
  const canAdjust = isOwner || isAdmin || user?.roleId === 5;
  const canTransfer = isOwner || isAdmin;

  // 2. Main States
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const filterStatus = (searchParams.get('status') as "all" | "active" | "low" | "critical") || "all";
  const filterBranch = searchParams.get('branch') || 'all';

  const inventoryFilters: FilterConfig[] = useMemo(() => [
    { id: 'search', label: 'Buscar producto...', type: 'text', placeholder: 'Buscar por nombre, código o categoría...' },
    { id: 'branch', label: 'Sucursal', type: 'category', options: branches.map(b => ({ label: b.name, value: b.id.toString() })) },
    { id: 'status', label: 'Estado', type: 'category', options: [
      { label: 'En Stock (Normal)', value: 'active' },
      { label: 'Stock Bajo', value: 'low' },
      { label: 'Crítico / Sin Stock', value: 'critical' }
    ]}
  ], [branches]);

  // 3. Modals state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isMinStockOpen, setIsMinStockOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // 4. Form states
  const [adjustData, setAdjustData] = useState({
    type: "COMPRA",
    quantity: "",
    reference: "",
  });
  const [transferData, setTransferData] = useState({
    toBranchId: "",
    quantity: "",
    reference: "",
  });

  // 5. New Entry Form states
  const [entrySearch, setEntrySearch] = useState("");
  const [entryProducts, setEntryProducts] = useState<Product[]>([]);
  const [entrySelectedProduct, setEntrySelectedProduct] =
    useState<Product | null>(null);
  const [entryQty, setEntryQty] = useState("");
  const [entryBranchId, setEntryBranchId] = useState("");
  const [entryRef, setEntryRef] = useState("");

  // 6. Min Stock & Alerts
  const [minStockVal, setMinStockVal] = useState("");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invData, branchData] = await Promise.all([
        apiRequest<InventoryItem[]>("/inventory"),
        apiRequest<Branch[]>("/branches"),
      ]);
      setInventory(invData);
      setBranches(branchData);
    } catch (error) {
      toast.error("Error al cargar datos de inventario");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setFormLoading(true);
    try {
      await apiRequest("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedItem.product.id,
          quantity: Number(adjustData.quantity),
          type: adjustData.type,
          reference: adjustData.reference || "Ajuste manual",
        }),
      });
      toast.success("Inventario actualizado");
      setIsAdjustOpen(false);
      setAdjustData({ type: "COMPRA", quantity: "", reference: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al ajustar stock");
    } finally {
      setFormLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !transferData.toBranchId) return;

    setFormLoading(true);
    try {
      await apiRequest("/inventory/transfer", {
        method: "POST",
        body: JSON.stringify({
          fromBranchId: selectedItem.branchId,
          toBranchId: Number(transferData.toBranchId),
          productId: selectedItem.product.id,
          quantity: Number(transferData.quantity),
          reference: transferData.reference || "Traslado entre sucursales",
        }),
      });
      toast.success("Traslado completado");
      setIsTransferOpen(false);
      setTransferData({ toBranchId: "", quantity: "", reference: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al realizar traslado");
    } finally {
      setFormLoading(false);
    }
  };

  const searchEntryProducts = async (q: string) => {
    if (q.length < 2) return setEntryProducts([]);
    try {
      const data = await apiRequest<any[]>(
        `/catalog/products/search?q=${encodeURIComponent(q)}`,
      );
      setEntryProducts(data);
    } catch {
      toast.error("Error al buscar productos");
    }
  };

  const handleNewEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entrySelectedProduct || !entryQty) return;

    setFormLoading(true);
    try {
      await apiRequest("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          productId: entrySelectedProduct.id,
          quantity: Number(entryQty),
          type: "COMPRA",
          reference: entryRef || "Ingreso manual de mercadería",
        }),
      });
      toast.success("Mercadería cargada exitosamente");
      setIsNewEntryOpen(false);
      // Reset
      setEntrySelectedProduct(null);
      setEntrySearch("");
      setEntryQty("");
      setEntryRef("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al cargar mercadería");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateMinStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setFormLoading(true);
    try {
      await apiRequest(`/inventory/min-stock/${selectedItem.product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          branchId: selectedItem.branchId,
          minStock: Number(minStockVal),
        }),
      });
      toast.success("Stock mínimo actualizado");
      setIsMinStockOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar stock mínimo");
    } finally {
      setFormLoading(false);
    }
  };

  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const data = await apiRequest<any[]>("/inventory/alerts");
      setAlerts(data);
    } catch (error: any) {
      toast.error("Error al cargar alertas");
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleResolveAlert = async (id: number) => {
    try {
      await apiRequest(`/inventory/alerts/${id}/resolve`, { method: "PATCH" });
      toast.success("Alerta marcada como resuelta");
      fetchAlerts();
    } catch (error: any) {
      toast.error(error.message || "Error al resolver alerta");
    }
  };

  const getProductStatus = (item: InventoryItem) => {
    const qty = Number(item.quantity);
    const min = Number(item.minStock);
    if (qty <= 0) return "critical";
    if (qty <= min) return "low";
    return "active";
  };

  const filteredInventory = inventory.filter((item) => {
    const status = getProductStatus(item);
    const matchesSearch =
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.internalCode
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.product.category?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || status === filterStatus;
    const matchesBranch = filterBranch === "all" || String(item.branchId) === filterBranch;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const totalItemsCount = inventory.length;
  const lowStockCount = inventory.filter(
    (i) => getProductStatus(i) === "low",
  ).length;
  const criticalStockCount = inventory.filter(
    (i) => getProductStatus(i) === "critical",
  ).length;
  const totalValue = inventory.reduce(
    (sum, i) => sum + Number(i.quantity) * getPublicPrice(i.product),
    0,
  );

  const getStatusBadge = (item: InventoryItem) => {
    const status = getProductStatus(item);
    let variant: "success" | "warning" | "destructive" = "success";
    let text = "En Stock";

    if (status === "low") {
      variant = "warning";
      text = "Stock Bajo";
    } else if (status === "critical") {
      variant = "destructive";
      text = "Crítico";
    }

    return (
      <Badge variant={variant} className="px-2 font-bold">
        <div
          className={cn(
            "size-1.5 rounded-full bg-current mr-1.5",
            status !== "active" && "animate-pulse",
          )}
        />
        {text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-primary animate-pulse">
        <Package size={48} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      {/* Header Actions */}
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2">
          {canAdjust && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  fetchAlerts();
                  setIsAlertsOpen(true);
                }}
                className="gap-2 font-bold relative text-rose-500 border-rose-200 bg-rose-50 hover:bg-rose-100"
              >
                <AlertCircle size={18} />
                Alertas
              </Button>
              <Button
                onClick={() => setIsNewEntryOpen(true)}
                variant="default"
                className="gap-2 font-bold shadow-lg"
              >
                <Plus size={18} />
                Nuevo Ingreso
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Ingreso (Para productos que pueden o no estar en la tabla aún) */}
      <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
        <DialogContent 
          className="sm:max-w-md w-full"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-main)" }}
        >
          <form onSubmit={handleNewEntry}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Ingreso de Mercadería</DialogTitle>
              <DialogDescription>
                Busca un producto del catálogo para cargar stock en una sucursal.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase opacity-70">
                  Buscar Producto
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Nombre o código..."
                    value={entrySearch}
                    onChange={(e) => {
                      setEntrySearch(e.target.value);
                      searchEntryProducts(e.target.value);
                    }}
                  />
                  {entryProducts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-[var(--card)] border rounded-xl shadow-xl max-h-48 overflow-auto animate-in fade-in zoom-in-95 duration-200">
                      {entryProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-muted border-b last:border-0 transition-colors"
                          onClick={() => {
                            setEntrySelectedProduct(p);
                            setEntrySearch(p.name);
                            setEntryProducts([]);
                          }}
                        >
                          <p className="font-bold text-sm">{p.name}</p>
                          <p className="text-[10px] opacity-60">
                            {p.internalCode || "S/C"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {entrySelectedProduct && (
                <div className="p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                  <p className="text-xs font-bold text-[var(--primary)]">
                    Seleccionado: {entrySelectedProduct.name}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase opacity-70">
                    Cantidad
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={entryQty}
                    onChange={(e) => setEntryQty(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Se cargará en la sucursal actual:{" "}
                    <span className="font-bold text-[var(--primary)]">
                      {user?.branch || "Cargando..."}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Referencia / Documento</Label>
                <Input
                  value={entryRef}
                  onChange={(e) => setEntryRef(e.target.value)}
                  placeholder="Ej. Factura Compra #..."
                />
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-[var(--border)] gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewEntryOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading || !entrySelectedProduct || !entryQty}
                variant="default"
                className="font-bold shadow-xl px-8 rounded-xl h-11 flex-1"
              >
                {formLoading ? "Procesando..." : "Cargar Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="mb-6">
        <StateCards
          cards={[
            {
              label: "Productos",
              value: totalItemsCount,
              icon: Package,
              color: "var(--primary)",
            },
            {
              label: "Stock Bajo",
              value: lowStockCount,
              icon: TrendingDown,
              color: "#f59e0b",
            },
            {
              label: "Críticos",
              value: criticalStockCount,
              icon: AlertCircle,
              color: "#ef4444",
            },
            {
              label: "Valor Total",
              value: `$${totalValue.toLocaleString()}`,
              icon: TrendingUp,
              color: "#10b981",
            },
          ]}
        />
      </div>

      {/* Search & Filters */}
      <div className="mb-6 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <SmartFilter config={inventoryFilters} />
      </div>

      {/* Inventory Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-foreground">
                  Producto
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Categoría
                </TableHead>
                <TableHead className="text-center font-semibold text-foreground">
                  Existencia
                </TableHead>
                <TableHead className="text-center font-semibold text-foreground">
                  Estado
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Precio Público
                </TableHead>
                <TableHead className="text-center font-semibold text-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow
                  key={item.id}
                  className="group cursor-pointer hover:bg-[var(--bg)] transition-colors"
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-[var(--text-main)]">
                        {item.product.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold opacity-40 uppercase tracking-tighter text-[var(--text-sec)]">
                        {item.product.internalCode ||
                          item.product.barcode ||
                          "SIN-CÓDIGO"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="font-bold tracking-tight"
                    >
                      {item.product.category?.name || "General"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span
                        className="text-lg font-black"
                        style={{
                          color:
                            Number(item.quantity) <= Number(item.minStock)
                              ? "#ef4444"
                              : "var(--primary)",
                        }}
                      >
                        {Number(item.quantity)} {item.product.unit}
                      </span>
                      <span className="text-[9px] uppercase font-black opacity-30 text-[var(--text-sec)]">
                        MÍN: {Number(item.minStock)} {item.product.unit}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item)}
                  </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-[var(--text-main)]">
                          ${getPublicPrice(item.product).toFixed(4)}
                        </span>
                        <span className="text-[9px] font-bold opacity-40 text-[var(--text-sec)]">
                          / {item.product.unit}
                        </span>
                      </div>
                    </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {canAdjust && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedItem(item);
                              setMinStockVal(String(item.minStock));
                              setIsMinStockOpen(true);
                            }}
                            className="h-8 w-8 text-amber-500 hover:bg-amber-50 rounded-lg"
                            title="Fijar Stock Mínimo"
                          >
                            <TrendingDown size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedItem(item);
                              setIsAdjustOpen(true);
                            }}
                            className="h-8 w-8 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg"
                            title="Ajuste de Inventario"
                          >
                            <ClipboardList size={18} />
                          </Button>
                        </>
                      )}
                      {canTransfer && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedItem(item);
                            setIsTransferOpen(true);
                          }}
                          className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                        >
                          <ArrowLeftRight size={18} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredInventory.length === 0 && (
            <div
              className="p-12 text-center"
              style={{ color: "var(--text-sec)" }}
            >
              No se encontraron productos en el inventario.
            </div>
          )}
        </div>
      </div>

      {/* Modal Ajustar Stock */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent 
          className="sm:max-w-md w-full"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-main)" }}
        >
          {selectedItem && (
            <form onSubmit={handleAdjust}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black">Movimiento de Inventario</DialogTitle>
                <DialogDescription>
                  Registra una entrada, salida o ajuste manual para este producto.
                </DialogDescription>
              </DialogHeader>

              <div className="py-6 space-y-5">
                <div
                  className="p-4 rounded-xl border flex items-center gap-4 shadow-sm"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="p-3 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Package size={24} />
                  </div>
                  <div>
                    <p
                      className="font-bold text-sm"
                      style={{ color: "var(--text-main)" }}
                    >
                      {selectedItem.product.name}
                    </p>
                    <p
                      className="text-xs opacity-60"
                      style={{ color: "var(--text-sec)" }}
                    >
                      Stock actual: {Number(selectedItem.quantity)}{" "}
                      {selectedItem.product.unit}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Movimiento</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          v: "COMPRA",
                          l: "Compra",
                          icon: ArrowDownLeft,
                          color: "emerald",
                        },
                        {
                          v: "VENTA",
                          l: "Venta",
                          icon: ArrowUpRight,
                          color: "red",
                        },
                        {
                          v: "AJUSTE",
                          l: "Ajuste",
                          icon: ClipboardList,
                          color: "blue",
                        },
                      ].map((t) => (
                        <button
                          key={t.v}
                          type="button"
                          onClick={() =>
                            setAdjustData({ ...adjustData, type: t.v })
                          }
                          className={cn(
                            "flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all",
                            adjustData.type === t.v
                              ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-md"
                              : "bg-transparent border-[var(--border)] text-[var(--text-sec)] hover:bg-[var(--bg)]",
                          )}
                        >
                          <t.icon size={16} />
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qty">Cantidad</Label>
                    <Input
                      id="qty"
                      type="number"
                      step="0.01"
                      required
                      value={adjustData.quantity}
                      onChange={(e) =>
                        setAdjustData({
                          ...adjustData,
                          quantity: e.target.value,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase opacity-70">
                      Referencia (Opcional)
                    </Label>
                    <Textarea
                      id="ref"
                      rows={2}
                      value={adjustData.reference}
                      onChange={(e) =>
                        setAdjustData({
                          ...adjustData,
                          reference: e.target.value,
                        })
                      }
                      placeholder="Ej. Factura #123, Ajuste por merma..."
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-6 border-t border-[var(--border)] gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAdjustOpen(false)}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  variant="default"
                  className="font-bold shadow-xl px-8 rounded-xl h-11 flex-1"
                >
                  {formLoading ? "Procesando..." : "Aplicar Movimiento"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Transferencia */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent 
          className="sm:max-w-md w-full"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-main)" }}
        >
          {selectedItem && (
            <form onSubmit={handleTransfer}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black">Traslado de Mercadería</DialogTitle>
                <DialogDescription>
                  Envía productos de esta sucursal a otra de forma segura.
                </DialogDescription>
              </DialogHeader>

              <div className="py-6 space-y-5">
                <div className="p-4 rounded-xl border bg-emerald-500/5 flex flex-col items-center gap-3 border-emerald-500/10">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1 text-center bg-white p-2 rounded-lg shadow-sm border border-[var(--border)]">
                      <p className="text-[10px] uppercase font-bold opacity-50">
                        Origen
                      </p>
                      <p className="text-xs font-bold truncate">Actual</p>
                    </div>
                    <ArrowLeftRight
                      className="text-emerald-500 shrink-0"
                      size={24}
                    />
                    <div className="flex-1 text-center bg-emerald-500 text-white p-2 rounded-lg shadow-sm">
                      <p className="text-[10px] uppercase font-bold opacity-80">
                        Destino
                      </p>
                      <p className="text-xs font-bold truncate">Nueva</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 text-xs font-bold"
                    style={{ color: "var(--text-sec)" }}
                  >
                    <Package size={14} />
                    <span>
                      {selectedItem.product.name} (Disp:{" "}
                      {Number(selectedItem.quantity)})
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sucursal Destino</Label>
                    <Select
                      value={transferData.toBranchId}
                      onValueChange={(v) =>
                        setTransferData({ ...transferData, toBranchId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona sucursal..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branches
                          .filter((b) => b.id !== selectedItem.branchId)
                          .map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        max={Number(selectedItem.quantity)}
                        value={transferData.quantity}
                        onChange={(e) =>
                          setTransferData({
                            ...transferData,
                            quantity: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>UDM</Label>
                      <div
                        className="h-9 flex items-center px-4 rounded-md border bg-[var(--bg)] font-bold text-sm"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--text-sec)",
                        }}
                      >
                        {selectedItem.product.unit}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Referencia</Label>
                    <Input
                      type="text"
                      value={transferData.reference}
                      onChange={(e) =>
                        setTransferData({
                          ...transferData,
                          reference: e.target.value,
                        })
                      }
                      placeholder="Ej. Reabastecimiento urgente..."
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-6 border-t border-[var(--border)] gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsTransferOpen(false)}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading || !transferData.toBranchId}
                  variant="default"
                  className="font-bold shadow-xl px-8 rounded-xl h-11 flex-1"
                >
                  {formLoading ? "Enviando..." : "Confirmar Envío"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal Fijar Stock Mínimo */}
      <Dialog open={isMinStockOpen} onOpenChange={setIsMinStockOpen}>
        <DialogContent className="sm:max-w-sm w-full" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-main)" }}>
          <form onSubmit={handleUpdateMinStock}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Stock Mínimo</DialogTitle>
              <DialogDescription>
                Define el nivel de alerta para {selectedItem?.product.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label>Cantidad Mínima Requerida</Label>
                <Input
                  type="number"
                  required
                  value={minStockVal}
                  onChange={(e) => setMinStockVal(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter className="gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsMinStockOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={formLoading} variant="default">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bandeja de Alertas */}
      <Dialog open={isAlertsOpen} onOpenChange={setIsAlertsOpen}>
        <DialogContent className="sm:max-w-2xl w-full max-h-[80vh] overflow-auto" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-main)" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-500 flex items-center gap-2">
              <AlertCircle /> Bandeja de Alertas
            </DialogTitle>
            <DialogDescription>
              Productos con stock bajo o crítico que requieren atención.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingAlerts ? (
              <p className="text-center py-8">Cargando alertas...</p>
            ) : alerts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No hay alertas activas.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-500/10 flex justify-between items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.type === "CRITICAL" ? "destructive" : "warning"}>
                          {alert.type}
                        </Badge>
                        <span className="font-bold text-[var(--text-main)]">{alert.product?.name}</span>
                      </div>
                      <p className="text-sm opacity-80 mt-1 text-[var(--text-sec)]">{alert.message}</p>
                    </div>
                    <Button onClick={() => handleResolveAlert(alert.id)} variant="outline" size="sm">
                      Resolver
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
