import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Phone, Mail, CreditCard, 
  AlertCircle, Edit2, Trash2, MoreVertical
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import { apiRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { CustomerDialog } from '../components/customers/CustomerDialog';
import { CreditLimitDialog } from '../components/customers/CreditLimitDialog';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge as UIBadge } from '../components/ui/badge';
import { InlinePills } from '../components/ui/inline-pills';
import { SmartFilter, FilterConfig } from '../components/ui/smart-filter';

const customerFilters: FilterConfig[] = [
  { id: 'search', label: 'Buscar clientes...', type: 'text', placeholder: 'Nombre, NIT o NRC...' },
  { id: 'type', label: 'Tipo de Cliente', type: 'category', options: [
    { label: 'Consumidor Final', value: 'CONSUMIDOR_FINAL' },
    { label: 'Contribuyente', value: 'CONTRIBUYENTE' },
    { label: 'Sujeto Excluido', value: 'SUJETO_EXCLUIDO' }
  ]},
  { id: 'showInactive', label: 'Mostrar inactivos', type: 'boolean' }
];

// --- Types ---
interface Customer {
  id: number;
  name: string;
  customerType: 'CONSUMIDOR_FINAL' | 'CONTRIBUYENTE' | 'SUJETO_EXCLUIDO';
  nit?: string;
  nrc?: string;
  documentType?: string;
  documentNumber?: string;
  phone?: string;
  email?: string;
  creditLimit: string | number;
  creditBalance: string | number;
  isActive: boolean;
  comercialName?: string;
  department?: string;
  municipality?: string;
  district?: string;
  addressComplement?: string;
  activityCode?: string;
  activityDescription?: string;
  _count?: {
    sales: number;
    quotes: number;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function Customers() {
  const { user } = useAuth();
  const isAdmin = user?.roleId === 1 || user?.roleId === 2;

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const showInactive = searchParams.get('showInactive') === 'true';
  const typeFilter = searchParams.get('type') || 'all';

  // Modals
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getBadgeVariant = (type: string) => {
    switch(type) {
      case 'CONSUMIDOR_FINAL': return 'secondary';
      case 'CONTRIBUYENTE': return 'default';
      case 'SUJETO_EXCLUIDO': return 'outline';
      default: return 'outline';
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, searchTerm, showInactive, typeFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: showInactive ? 'all' : 'active',
      });

      if (searchTerm) query.append('search', searchTerm);
      if (typeFilter !== 'all') query.append('customerType', typeFilter);

      const response = await apiRequest<any>(`/customers?${query.toString()}`);
      
      // La API devuelve directamente { data, total, page, limit, totalPages }
      // apiRequest desempaqueta el { success: true, data: ... } si existe.
      // Así que response es el objeto con la data.
      
      if (response && response.data) {
        const freshData: Customer[] = response.data;
        setCustomers(freshData);
        setSelectedCustomer(prev => prev ? (freshData.find(c => c.id === prev.id) ?? prev) : prev);
        setPagination({
          total: response.total,
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages
        });
      }
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de desactivar este cliente?')) return;
    try {
      await apiRequest(`/customers/${id}`, { method: 'DELETE' });
      toast.success('Cliente desactivado correctamente');
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo desactivar el cliente');
    }
  };

  const toggleStatus = async (customer: Customer) => {
    try {
      const newStatus = !customer.isActive;
      await apiRequest(`/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });
      toast.success(`Cliente ${newStatus ? 'activado' : 'desactivado'} correctamente`);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar el estado del cliente');
    }
  };

  const totalCustomers = pagination?.total || 0;
  const totalCredit = customers.reduce((sum, c) => sum + Number(c.creditBalance), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">Clientes</h1>
          <InlinePills
            metrics={[
              { label: 'Total Clientes', value: totalCustomers, icon: Users, color: 'var(--primary)' },
              { label: 'Activos', value: totalCustomers, icon: Users, color: '#10b981' },
              ...(isAdmin ? [
                { label: 'Crédito Total', value: `$${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: CreditCard, color: '#f59e0b' },
                { label: 'Con Deuda', value: customers.filter(c => Number(c.creditBalance) > 0).length, icon: AlertCircle, color: '#ef4444' },
              ] : []),
            ]}
          />
        </div>
        <Button
          variant="default"
          className="gap-2 font-bold shadow-lg"
          onClick={() => { setSelectedCustomer(null); setIsDialogOpen(true); }}
        >
          <Plus size={20} />
          Nuevo Cliente
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <SmartFilter config={customerFilters} />
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--bg)]/50 border-b border-[var(--border)]">
                <TableHead className="font-bold text-[var(--text-main)]">Cliente</TableHead>
                <TableHead className="font-bold text-[var(--text-main)]">Contacto</TableHead>
                {isAdmin && <TableHead className="text-right font-bold text-[var(--text-main)]">Límite</TableHead>}
                <TableHead className="text-right font-bold text-[var(--text-main)]">Deuda</TableHead>
                <TableHead className="text-center font-bold text-[var(--text-main)]">Estado</TableHead>
                <TableHead className="text-center font-bold text-[var(--text-main)]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-[var(--text-sec)] animate-pulse">
                      <Users className="animate-bounce" />
                      <span className="font-bold">Cargando clientes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-[var(--text-sec)] font-medium">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} className="group hover:bg-[var(--bg)]/30 transition-colors border-b border-[var(--border)]">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--text-main)]">{customer.name}</span>
                        <span className="text-xs font-mono font-bold opacity-60 uppercase tracking-tight text-[var(--text-sec)]">
                          {customer.customerType === 'CONSUMIDOR_FINAL' ? (customer.documentNumber || 'Consumidor Final') : (customer.nit || 'Sin NIT')}
                          {customer.nrc && ` • NRC: ${customer.nrc}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-sec)]">
                            <Phone size={12} className="text-[var(--primary)]" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-sec)]">
                            <Mail size={12} className="text-[var(--primary)]" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <span className="font-black text-[var(--text-main)]">
                          ${Number(customer.creditLimit).toFixed(4)}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <span 
                        className={cn(
                          "font-black",
                          Number(customer.creditBalance) > Number(customer.creditLimit) ? "text-destructive" : "text-[var(--primary)]"
                        )}
                      >
                        ${Number(customer.creditBalance).toFixed(4)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <UIBadge 
                        onClick={() => toggleStatus(customer)}
                        variant={customer.isActive ? "success" : "destructive"}
                        className="cursor-pointer font-bold px-2"
                      >
                        <div className={cn("size-1.5 rounded-full bg-current mr-1.5", !customer.isActive && "animate-pulse")} />
                        {customer.isActive ? 'Activo' : 'Inactivo'}
                      </UIBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg">
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[var(--card)] border-[var(--border)] rounded-xl shadow-xl">
                            <DropdownMenuItem onClick={() => { setSelectedCustomer(customer); setIsDialogOpen(true); }} className="gap-2 font-bold focus:bg-[var(--primary)]/10 cursor-pointer">
                              <Edit2 size={14} className="text-[var(--primary)]" /> Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => { setSelectedCustomer(customer); setIsCreditDialogOpen(true); }} className="gap-2 font-bold focus:bg-amber-500/10 cursor-pointer text-amber-500">
                                <CreditCard size={14} className="text-amber-500" /> Asignar Crédito
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => handleDelete(customer.id)} className="gap-2 font-bold text-destructive focus:bg-destructive/10 cursor-pointer">
                                <Trash2 size={14} /> Desactivar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/5">
            <p className="text-xs font-bold text-[var(--text-sec)]">
              Mostrando página {currentPage} de {pagination.totalPages} ({pagination.total} clientes)
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="h-8 rounded-lg font-bold"
              >
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="h-8 rounded-lg font-bold"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <CustomerDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        customer={selectedCustomer} 
        onSuccess={fetchCustomers}
      />
      <CreditLimitDialog
        open={isCreditDialogOpen}
        onOpenChange={setIsCreditDialogOpen}
        customer={selectedCustomer}
        onSuccess={fetchCustomers}
      />
    </div>
  );
}
