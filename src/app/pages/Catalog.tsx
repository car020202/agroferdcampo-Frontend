import React, { useState, useEffect, useMemo } from "react";
import {
  Store,
  Search,
  Plus,
  Trash2,
  PackagePlus,
  Tag,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { apiRequest } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { InlinePills } from "../components/ui/inline-pills";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Edit } from "lucide-react";
import { cn } from "../components/ui/utils";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Card } from "../components/ui/card";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SmartFilter, FilterConfig } from "../components/ui/smart-filter";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ProductPrice {
  id?: number;
  priceType: string;
  branchId: number | null;
  price: string | number;
}

interface CatalogProduct {
  id: number;
  name: string;
  internalCode?: string;
  barcode?: string;
  description?: string;
  costPrice?: number | string;
  unit: string;
  trackStock: boolean;
  isActive: boolean;
  category?: { id: number; name: string };
  prices: ProductPrice[];
  units?: {
    id: number;
    unit: string;
    factor: number | string;
    priceDetalle?: number | string;
    priceMayorista?: number | string;
    barcode?: string;
  }[];
  inventory?: { branchId: number; quantity: string; minStock: string }[];
}

interface Category {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface StockRow {
  branchId: string;
  quantity: string;
  minStock: string;
}

interface PriceRow {
  priceType: string;
  branchId: string; // 'global' = null (precio global), o string del branchId
  price: string;
}

const UNITS = [
  "UNIDAD", "KG", "LB", "QUINTAL", "CAJA", "LITRO",
  "ARROBA", "KINTALE", "METRO", "YARDA", "PIE", "GALON",
  "CUBETA", "CUARTO_GALON", "GRAMO", "CENTIMETRO",
  "PULGADA", "ONZA", "SACO", "BULTO", "PAQUETE", "TONELADA"
];
const PRICE_TYPES = ["PUBLICO", "MAYOREO", "ESPECIAL"];

// --- Validation Schema ---
const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  internalCode: z.string(),
  barcode: z.string(),
  description: z.string(),
  unit: z.string().min(1, "La unidad es obligatoria"),
  categoryId: z.string(),
  costPrice: z.string(),
  trackStock: z.boolean(),
  prices: z
    .array(
      z.object({
        id: z.number().optional(),
        priceType: z.string(),
        branchId: z.string(),
        price: z.string(),
      }),
    )
    .min(1, "Al menos un precio es requerido"),
  units: z.array(
    z.object({
      id: z.number().optional(),
      unit: z.string().min(1, "Unidad requerida"),
      factor: z.string().min(1, "Factor requerido"),
      priceDetalle: z.string().optional(),
      priceMayorista: z.string().optional(),
      barcode: z.string().optional(),
    })
  ).optional(),
  stockRows: z.array(
    z.object({
      branchId: z.string(),
      quantity: z.string(),
      minStock: z.string(),
    }),
  ),
});

type ProductFormData = z.infer<typeof productSchema>;

function getPublicPrice(prices: ProductPrice[]): string {
  const pub = prices.find((p) => p.priceType === "PUBLICO");
  if (pub) return Number(pub.price).toFixed(4);
  if (prices.length > 0) return Number(prices[0].price).toFixed(4);
  return "0.00";
}

// ── Component ──────────────────────────────────────────────────────────────────
export function Catalog({ hideTitle }: { hideTitle?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const searchTerm = searchParams.get('search') || '';
  const showInactive = searchParams.get('showInactive') === 'true';
  const categoryFilter = searchParams.get('category') || 'all';

  const catalogFilters: FilterConfig[] = useMemo(() => [
    { id: 'search', label: 'Buscar producto...', type: 'text', placeholder: 'Buscar por nombre, código o categoría...' },
    { id: 'category', label: 'Categoría', type: 'category', options: categories.map(c => ({ label: c.name, value: c.id.toString() })) },
    { id: 'showInactive', label: 'Ver inactivos', type: 'boolean' }
  ], [categories]);

  // Form state
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const isOwner = user?.roleId === 1;
  const canCreate = user?.roleId === 1 || user?.roleId === 2;

  // React Hook Form
  const { register, control, handleSubmit, reset, setValue, watch } =
    useForm<ProductFormData>({
      resolver: zodResolver(productSchema),
      defaultValues: {
        name: "",
        internalCode: "",
        barcode: "",
        description: "",
        unit: "UNIDAD",
        categoryId: "",
        costPrice: "",
        trackStock: true,
        prices: [{ priceType: "PUBLICO", branchId: "global", price: "" }],
        stockRows: [],
      },
    });

  const {
    fields: priceFields,
    append: appendPrice,
    remove: removePrice,
  } = useFieldArray({
    control,
    name: "prices",
  });

  const {
    fields: unitFields,
    append: appendUnit,
    remove: removeUnit,
  } = useFieldArray({
    control,
    name: "units",
  });

  const {
    fields: stockFields,
    append: appendStock,
    remove: removeStock,
  } = useFieldArray({
    control,
    name: "stockRows",
  });

  const watchTrackStock = watch("trackStock");

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const fetchData = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("limit", "100");
      if (showInactive) {
        queryParams.append("isActive", "false");
      }

      const [prodData, catData, brData] = await Promise.all([
        apiRequest<{ data: CatalogProduct[]; total: number }>(
          `/catalog/products?${queryParams.toString()}`,
        ),
        apiRequest<Category[]>("/catalog/categories").catch(() => []),
        apiRequest<Branch[]>("/branches").catch(() => []),
      ]);

      let allProducts = Array.isArray(prodData?.data) ? prodData.data : [];

      if (showInactive) {
        const activeRes = await apiRequest<{ data: CatalogProduct[] }>(
          "/catalog/products?isActive=true&limit=100",
        );
        if (activeRes?.data) {
          allProducts = [...allProducts, ...activeRes.data];
        }
      }

      setProducts(allProducts);
      setCategories(Array.isArray(catData) ? catData : []);
      setBranches(Array.isArray(brData) ? brData : []);
    } catch {
      toast.error("Error al cargar el catálogo");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (product?: CatalogProduct) => {
    if (product) {
      setEditingProduct(product);
      reset({
        name: product.name,
        internalCode: product.internalCode || "",
        barcode: product.barcode || "",
        description: product.description || "",
        unit: product.unit,
        categoryId: product.category?.id ? String(product.category.id) : "",
        costPrice: product.costPrice?.toString() || "",
        trackStock: product.trackStock,
        prices: product.prices.map((p) => ({
          id: p.id,
          priceType: p.priceType,
          branchId: p.branchId === null ? "global" : String(p.branchId),
          price: String(p.price),
        })),
        units: product.units ? product.units.map((u) => ({
          id: u.id,
          unit: u.unit,
          factor: String(u.factor),
          priceDetalle: u.priceDetalle ? String(u.priceDetalle) : "",
          priceMayorista: u.priceMayorista ? String(u.priceMayorista) : "",
          barcode: u.barcode || "",
        })) : [],
        stockRows: [],
      });
    } else {
      setEditingProduct(null);
      reset({
        name: "",
        internalCode: "",
        barcode: "",
        description: "",
        unit: "UNIDAD",
        categoryId: "",
        costPrice: "",
        trackStock: true,
        prices: [{ priceType: "PUBLICO", branchId: "global", price: "" }],
        units: [],
        stockRows: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (id: number) => {
    try {
      await apiRequest(`/catalog/products/${id}/toggle`, { method: "PATCH" });
      toast.success("Estado actualizado");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (
      !confirm("¿Estás seguro de eliminar este producto? (Eliminación lógica)")
    )
      return;
    try {
      await apiRequest(`/catalog/products/${id}`, { method: "DELETE" });
      toast.success("Producto eliminado");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar producto");
    }
  };

  const onSubmitProduct = async (data: ProductFormData) => {
    const body: Record<string, unknown> = {
      name: data.name.trim(),
      unit: data.unit,
      trackStock: data.trackStock,
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      costPrice: data.costPrice ? Number(data.costPrice) : null,
      internalCode: data.internalCode?.trim() || undefined,
      barcode: data.barcode?.trim() || undefined,
      description: data.description?.trim() || undefined,
      units: data.units?.map((u) => ({
        unit: u.unit,
        factor: Number(u.factor),
        priceDetalle: u.priceDetalle ? Number(u.priceDetalle) : null,
        priceMayorista: u.priceMayorista ? Number(u.priceMayorista) : null,
        barcode: u.barcode?.trim() || undefined,
      })) || [],
    };

    if (!editingProduct) {
      body.prices = data.prices.map((p) => ({
        priceType: p.priceType,
        branchId: p.branchId === "global" ? null : Number(p.branchId),
        price: Number(p.price),
      }));

      const validStock =
        data.stockRows?.filter((s) => s.branchId && Number(s.quantity) > 0) ||
        [];
      if (validStock.length > 0) {
        body.initialStock = validStock.map((s) => ({
          branchId: Number(s.branchId),
          quantity: Number(s.quantity),
          minStock: s.minStock ? Number(s.minStock) : 0,
        }));
      }
    }

    setFormLoading(true);
    try {
      if (editingProduct) {
        await apiRequest(`/catalog/products/${editingProduct.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });

        for (const p of data.prices) {
          await apiRequest(`/catalog/products/${editingProduct.id}/prices`, {
            method: "POST",
            body: JSON.stringify({
              priceType: p.priceType,
              branchId: p.branchId === "global" ? null : Number(p.branchId),
              price: Number(p.price),
            }),
          });
        }
        toast.success("Producto actualizado exitosamente");
      } else {
        await apiRequest("/catalog/products", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Producto creado exitosamente");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el producto");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setFormLoading(true);
    try {
      await apiRequest("/catalog/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      toast.success("Categoría creada exitosamente");
      setNewCatName("");
      setIsCatDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al crear la categoría");
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      (categoryFilter === 'all' || p.category?.id.toString() === categoryFilter) &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internalCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-accent animate-pulse">
        <Store size={48} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {!hideTitle && (
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: "var(--text-main)" }}
            >
              Catálogo
            </h1>
            <p style={{ color: "var(--text-sec)" }}>
              Gestión de productos y precios
            </p>
          </div>
        )}
        <div className={hideTitle ? "w-full flex justify-end gap-2" : "flex gap-2"}>
          {!hideTitle && (
            <Button variant="outline" onClick={() => navigate("/inventory")}>
              <PackagePlus size={16} />
              Ver Inventario
            </Button>
          )}
          {canCreate && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCatDialogOpen(true)}
                className="gap-2"
              >
                <Tag size={16} />
                Nueva Categoría
              </Button>
              <Button
                onClick={() => openDialog()}
                variant="default"
                size="lg"
                className="gap-2 font-bold"
              >
                <Plus size={18} />
                Nuevo Producto
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <InlinePills
          metrics={[
            {
              label: "Total Productos",
              value: products.length,
              icon: Store,
              color: "var(--primary)",
            },
            {
              label: "Activos",
              value: products.filter((p) => p.isActive).length,
              icon: ToggleRight,
              color: "#34d399",
            },
            {
              label: "Categorías",
              value: new Set(
                products.map((p) => p.category?.name).filter(Boolean),
              ).size,
              icon: Tag,
              color: "#f59e0b",
            },
          ]}
        />
      </div>

      {/* Search & Filters */}
      <div className="mb-6 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <SmartFilter config={catalogFilters} />
      </div>

      {/* Table Section */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead className="text-right">Precio Público</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-32 text-center text-[var(--text-sec)]"
              >
                No se encontraron productos en el catálogo.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((product) => (
              <TableRow key={product.id} className="group cursor-pointer">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                      {product.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold opacity-40 uppercase tracking-tighter text-[var(--text-sec)]">
                      {product.internalCode || product.barcode || "SIN-CÓDIGO"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="font-bold tracking-tight"
                  >
                    {product.category?.name || "General"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono font-bold text-[var(--text-sec)]">
                    {product.unit}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-black text-[var(--primary)] text-base">
                      ${getPublicPrice(product.prices)}
                    </span>
                    <span className="text-[9px] font-bold opacity-40 text-[var(--text-sec)]">
                      / {product.unit}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Badge
                      onClick={() => handleToggleActive(product.id)}
                      variant={product.isActive ? "success" : "destructive"}
                      className="cursor-pointer hover:scale-105 transition-all px-2"
                    >
                      <div
                        className={cn(
                          "size-1.5 rounded-full bg-current mr-1.5",
                          product.isActive && "animate-pulse",
                        )}
                      />
                      {product.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1 transition-all">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(product)}
                      className="h-8 w-8 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg"
                    >
                      <Edit size={16} />
                    </Button>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-6xl w-full max-h-[95vh] overflow-y-auto custom-scrollbar"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--text-main)",
          }}
        >
          <DialogHeader className="px-2">
            <DialogTitle
              style={{ color: "var(--text-main)" }}
              className="text-2xl font-black"
            >
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmitProduct)}
            className="space-y-6 mt-4 px-2"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Columna Izquierda: Información Básica */}
              <div className="space-y-6">
                <div className="p-6 rounded-xl border border-[var(--border)] space-y-6 bg-transparent">
                  <p className="text-xs font-black uppercase tracking-widest opacity-60 text-[var(--text-sec)]">
                    Información General
                  </p>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold">
                      Nombre del Producto{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...register("name")}
                      placeholder="Ej. Fertilizante 18-46-0"
                      className="h-11 rounded-xl bg-[var(--card)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">
                        Código Interno
                      </Label>
                      <Input
                        {...register("internalCode")}
                        placeholder="FERT-001"
                        className="h-11 rounded-xl bg-[var(--card)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">
                        Código de Barras
                      </Label>
                      <Input
                        {...register("barcode")}
                        placeholder="7501234567890"
                        className="h-11 rounded-xl bg-[var(--card)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">
                        Unidad <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={watch("unit")}
                        onValueChange={(v) => setValue("unit", v)}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-[var(--card)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Categoría</Label>
                      <Select
                        value={watch("categoryId")}
                        onValueChange={(v) => setValue("categoryId", v)}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-[var(--card)]">
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Descripción</Label>
                    <Textarea
                      {...register("description")}
                      placeholder="Describe brevemente el producto..."
                      className="rounded-xl bg-[var(--card)] min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold">
                      Costo de Adquisición
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.0001"
                        {...register("costPrice")}
                        placeholder="0.0000"
                        className="h-11 pl-7 rounded-xl bg-[var(--card)]"
                      />
                    </div>
                    <p className="text-[10px] opacity-60 ml-1">
                      Lo que te cuesta comprarlo (Opcional)
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-sm font-bold">Rastrear Inventario</p>
                        <p className="text-[10px] opacity-60">
                          Controlar entradas y salidas automáticamente
                        </p>
                      </div>
                      <Switch
                        checked={watchTrackStock}
                        onCheckedChange={(v) => setValue("trackStock", v)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Precios y Stock */}
              <div className="space-y-6">
                {/* Sección Precios */}
                <div className="p-6 rounded-xl border border-[var(--border)] space-y-6 bg-transparent">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60 text-[var(--text-sec)]">
                      Precios de Venta
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendPrice({
                          priceType: "MAYOREO",
                          branchId: "global",
                          price: "",
                        })
                      }
                      className="h-8"
                    >
                      <Plus size={14} className="mr-1" /> Agregar Precio
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {priceFields.map((field, i) => (
                      <div
                        key={field.id}
                        className="p-3 rounded-xl border bg-[var(--card)] border-[var(--border)] relative group"
                      >
                        <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end">
                          <div className="col-span-5 sm:col-span-4 space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-50">
                              Tipo
                            </Label>
                            <Select
                              value={watch(`prices.${i}.priceType`)}
                              onValueChange={(v) =>
                                setValue(`prices.${i}.priceType`, v)
                              }
                            >
                              <SelectTrigger className="h-9 rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRICE_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4 sm:col-span-4 space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-50">
                              Sucursal
                            </Label>
                            <Select
                              value={watch(`prices.${i}.branchId`)}
                              onValueChange={(v) =>
                                setValue(`prices.${i}.branchId`, v)
                              }
                            >
                              <SelectTrigger className="h-9 rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="global">Global</SelectItem>
                                {branches.map((b) => (
                                  <SelectItem key={b.id} value={String(b.id)}>
                                    {b.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3 sm:col-span-4 space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-50">
                              Precio
                            </Label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                {...register(`prices.${i}.price`)}
                                className="h-9 pl-6 rounded-lg font-bold"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                        {priceFields.length > 1 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const priceId = watch(`prices.${i}.id`);
                              if (priceId && editingProduct) {
                                if (!confirm("¿Eliminar este precio? Se aplicará inmediatamente.")) return;
                                try {
                                  await apiRequest(`/catalog/products/${editingProduct.id}/prices/${priceId}`, { method: "DELETE" });
                                  toast.success("Precio eliminado");
                                } catch (e: any) {
                                  toast.error(e.message || "Error al eliminar precio");
                                  return; // Stop removal from UI if failed
                                }
                              }
                              removePrice(i);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10 hover:scale-110"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sección Unidades Secundarias */}
                <div className="p-6 rounded-xl border border-[var(--border)] space-y-6 bg-[var(--surface)]">
                  <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest opacity-60 text-[var(--text-sec)]">
                        Unidades de Venta Adicionales
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Si vendes este producto en otras presentaciones (Ej. por Caja, Docena, etc.), agrégalas aquí.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendUnit({
                          unit: "",
                          factor: "",
                          priceDetalle: "",
                          priceMayorista: "",
                          barcode: "",
                        })
                      }
                      className="rounded-full gap-2 border-[var(--border)] bg-transparent hover:bg-[var(--border)]"
                    >
                      <Plus size={16} />
                      Agregar Presentación
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {unitFields.map((field, i) => (
                      <div
                        key={field.id}
                        className="p-4 rounded-xl border bg-[var(--card)] border-[var(--border)] space-y-4 relative group"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase opacity-50 block">Selecciona la Unidad Alternativa</Label>
                            <Select
                              value={watch(`units.${i}.unit`)}
                              onValueChange={(v) => setValue(`units.${i}.unit`, v)}
                            >
                              <SelectTrigger className="h-9 rounded-lg font-bold">
                                <SelectValue placeholder="Ej. CAJA, DOCENA..." />
                              </SelectTrigger>
                              <SelectContent>
                                {UNITS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex flex-col gap-2 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] border-dashed relative">
                            <Label className="text-[9px] font-bold uppercase opacity-60 absolute -top-2 left-3 bg-[var(--card)] px-1.5">¿Equivalencia?</Label>
                            <p className="text-[10px] font-bold opacity-60 mt-1">
                              1 {watch(`units.${i}.unit`) || 'Nueva'} =
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                {...register(`units.${i}.factor`)}
                                className="h-9 flex-1 min-w-0 text-center font-bold text-sm bg-[var(--card)] border-[var(--border)] focus-visible:ring-1 focus-visible:ring-[var(--border)] focus-visible:ring-offset-0"
                                placeholder="0"
                              />
                              <span className="text-xs font-bold text-[var(--primary)] whitespace-nowrap shrink-0">
                                {watch("unit") || 'Base'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-50 block">Precio (Detalle)</Label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                {...register(`units.${i}.priceDetalle`)}
                                className="h-9 pl-6 rounded-lg font-bold"
                                placeholder="0.00"
                              />
                            </div>
                            <p className="text-[9px] font-bold text-[var(--primary)] opacity-70 leading-none pt-0.5">Dejar vacío para auto-calcular</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-50 block">Precio (Mayorista)</Label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                {...register(`units.${i}.priceMayorista`)}
                                className="h-9 pl-6 rounded-lg font-bold"
                                placeholder="0.00"
                              />
                            </div>
                            <p className="text-[9px] font-bold text-[var(--primary)] opacity-70 leading-none pt-0.5">Dejar vacío para auto-calcular</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase opacity-50 block">Cód. Barras</Label>
                            <Input
                              type="text"
                              {...register(`units.${i}.barcode`)}
                              className="h-9 rounded-lg"
                              placeholder="Opcional..."
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            const unitId = watch(`units.${i}.id`);
                            if (unitId && editingProduct) {
                              if (!confirm("¿Eliminar esta presentación? Se aplicará inmediatamente.")) return;
                            }
                            removeUnit(i);
                          }}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-md z-10 hover:scale-110 hover:bg-red-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sección Stock Inicial */}
                {!editingProduct && watchTrackStock && (
                  <div className="p-6 rounded-xl border border-[var(--border)] space-y-6 bg-transparent">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest opacity-60 text-[var(--text-sec)]">
                        Stock Inicial
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          appendStock({
                            branchId: "",
                            quantity: "",
                            minStock: "",
                          })
                        }
                        className="h-8"
                      >
                        <Plus size={14} className="mr-1" /> Sucursal
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {stockFields.map((field, i) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl border bg-[var(--card)] border-[var(--border)] relative group"
                        >
                          <div className="col-span-12 space-y-1">
                            <Label className="text-[10px] font-bold opacity-50">
                              Sucursal
                            </Label>
                            <Select
                              value={watch(`stockRows.${i}.branchId`)}
                              onValueChange={(v) =>
                                setValue(`stockRows.${i}.branchId`, v)
                              }
                            >
                              <SelectTrigger className="h-9 rounded-lg">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {branches.map((b) => (
                                  <SelectItem key={b.id} value={String(b.id)}>
                                    {b.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-6 space-y-1">
                            <Label className="text-[10px] font-bold opacity-50">
                              Cant.
                            </Label>
                            <Input
                              type="number"
                              {...register(`stockRows.${i}.quantity`)}
                              className="h-9 rounded-lg"
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-6 space-y-1">
                            <Label className="text-[10px] font-bold opacity-50">
                              Mín.
                            </Label>
                            <Input
                              type="number"
                              {...register(`stockRows.${i}.minStock`)}
                              className="h-9 rounded-lg"
                              placeholder="0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStock(i)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {stockFields.length === 0 && (
                        <p className="text-[10px] text-center opacity-40 py-2">
                          Sin stock inicial (opcional)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-[var(--border)] gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                variant="default"
                className="font-bold shadow-xl px-12 rounded-xl h-12"
              >
                {formLoading
                  ? "Guardando..."
                  : editingProduct
                    ? "Guardar Cambios"
                    : "Crear Producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Gestionar Categorías */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Categorías</DialogTitle>
            <DialogDescription>
              Crea o elimina categorías para organizar tus productos.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Formulario Crear */}
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="catName">Nombre de la Nueva Categoría</Label>
                <div className="flex gap-2">
                  <Input
                    id="catName"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ej: Fertilizantes..."
                    required
                  />
                  <Button
                    type="submit"
                    disabled={formLoading}
                    variant="default"
                    size="icon"
                  >
                    {formLoading ? "..." : <Plus size={18} />}
                  </Button>
                </div>
              </div>
            </form>

            <div className="space-y-3">
              <Label>Categorías Existentes</Label>
              <div
                className="max-h-[200px] overflow-y-auto rounded-xl border p-2 space-y-1"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg)",
                }}
              >
                {categories.length === 0 && (
                  <p
                    className="text-xs text-center py-4 opacity-50"
                    style={{ color: "var(--text-sec)" }}
                  >
                    Sin categorías registradas.
                  </p>
                )}
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--card)] transition-colors group"
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-main)" }}
                    >
                      {cat.name}
                    </span>
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Eliminar categoría "${cat.name}"?`))
                          return;
                        try {
                          await apiRequest(`/catalog/categories/${cat.id}`, {
                            method: "DELETE",
                          });
                          toast.success("Categoría eliminada");
                          fetchData();
                        } catch (err: any) {
                          toast.error(
                            err.message || "No se puede eliminar la categoría",
                          );
                        }
                      }}
                      className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsCatDialogOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
