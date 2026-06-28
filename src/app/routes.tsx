import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { OtpVerification } from "./pages/OtpVerification";
import { Users as UsersPage } from "./pages/Users";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { POS } from "./pages/POS";
import { Inventory } from "./pages/Inventory";
import { Customers } from "./pages/Customers";
import { Finance } from "./pages/Finance";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { ThemeCustomizer } from "./pages/ThemeCustomizer";
import { Branches as BranchesPage } from "./pages/Branches";
import { CashRegisters } from "./pages/CashRegisters";
import { HumanResources } from "./pages/HumanResources";
import { Catalog } from "./pages/Catalog";
import { UIComponentsShowcase } from "./pages/UIComponentsShowcase";
import { SalesHistory } from "./pages/SalesHistory";
import { SystemConfig } from "./pages/SystemConfig";
import { Quotes } from "./pages/Quotes";
import { NewQuote } from "./pages/NewQuote";
import { Purchases } from "./pages/Purchases";
import { DeliveryNotes } from "./pages/DeliveryNotes";
import { Credit } from "./pages/Credit";
import Vehicles from "./pages/Vehicles";
import DeliveryRoutes from "./pages/DeliveryRoutes";
import { Audit } from "./pages/Audit";
import { Caja } from "./pages/Caja";

// Roles definidos como strings — coinciden exactamente con el enum BranchRole del backend
const ROLES = {
  PROPIETARIO: "PROPIETARIO",
  ADMINISTRADOR: "ADMINISTRADOR",
  SUPERVISOR: "SUPERVISOR",
  CAJERO: "CAJERO",
  BODEGUERO: "BODEGUERO",
  CONDUCTOR: "CONDUCTOR",
  VENDEDOR: "VENDEDOR",
} as const;

const { PROPIETARIO, ADMINISTRADOR, SUPERVISOR, CAJERO, BODEGUERO, VENDEDOR } = ROLES;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/verify-otp",
    element: <OtpVerification />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "ui-showcase",
        element: <UIComponentsShowcase />,
      },
      // POS + Cotizaciones: Admins + CAJERO + VENDEDOR
      {
        element: <ProtectedRoute allowedRoles={[PROPIETARIO, ADMINISTRADOR, SUPERVISOR, CAJERO, VENDEDOR]} />,
        children: [
          { path: "pos", element: <POS /> },
          { path: "quotes", element: <Quotes /> },
          { path: "quotes/new", element: <NewQuote /> },
          { path: "customers", element: <Customers /> },
        ],
      },
      // Caja + Ventas + Finanzas + Crédito: Admins + CAJERO
      {
        element: <ProtectedRoute allowedRoles={[PROPIETARIO, ADMINISTRADOR, SUPERVISOR, CAJERO]} />,
        children: [
          { path: "caja", element: <Caja /> },
          { path: "sales", element: <SalesHistory /> },
          { path: "credit", element: <Credit /> },
          { path: "finance", element: <Finance /> },
        ],
      },
      // Todos los roles — inventario, compras, albaranes
      {
        element: <ProtectedRoute allowedRoles={[PROPIETARIO, ADMINISTRADOR, SUPERVISOR, CAJERO, BODEGUERO, ROLES.CONDUCTOR]} />,
        children: [
          { path: "inventory", element: <Inventory /> },
          { path: "delivery-notes", element: <DeliveryNotes /> },
          { path: "purchases", element: <Purchases /> },
        ],
      },
      // Propietario, Admin, Supervisor
      {
        element: <ProtectedRoute allowedRoles={[PROPIETARIO, ADMINISTRADOR, SUPERVISOR]} />,
        children: [
          { path: "rrhh", element: <HumanResources /> },
        ],
      },
      // Solo Propietario y Admin
      {
        element: <ProtectedRoute allowedRoles={[PROPIETARIO, ADMINISTRADOR]} />,
        children: [
          { path: "catalog", element: <Catalog /> },
          { path: "users", element: <UsersPage /> },
          { path: "vehicles", element: <Vehicles /> },
          { path: "delivery-routes", element: <DeliveryRoutes /> },
          { path: "reports", element: <Reports /> },
          { path: "audit", element: <Audit /> },
          { path: "settings", element: <Settings /> },
          { path: "settings/theme", element: <ThemeCustomizer /> },
          { path: "settings/branches", element: <BranchesPage /> },
          { path: "settings/cash-registers", element: <CashRegisters /> },
          { path: "settings/global", element: <SystemConfig /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
