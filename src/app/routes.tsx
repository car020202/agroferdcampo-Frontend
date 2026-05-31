import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout/Layout";
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
import { HumanResources } from "./pages/HumanResources";
import { Catalog } from "./pages/Catalog";
import { UIComponentsShowcase } from "./pages/UIComponentsShowcase";
import { SalesHistory } from "./pages/SalesHistory";
import { SystemConfig } from "./pages/SystemConfig";
import { Quotes } from "./pages/Quotes";
import { Purchases } from "./pages/Purchases";
import { DeliveryNotes } from "./pages/DeliveryNotes";
import { Credit } from "./pages/Credit";
import Vehicles from "./pages/Vehicles";
import DeliveryRoutes from "./pages/DeliveryRoutes";

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
        path: "pos",
        element: <POS />,
      },
      {
        path: "sales",
        element: <SalesHistory />,
      },
      {
        path: "quotes",
        element: <Quotes />,
      },
      {
        path: "catalog",
        element: <Catalog />,
      },
      {
        path: "inventory",
        element: <Inventory />,
      },
      {
        path: "customers",
        element: <Customers />,
      },
      {
        path: "users",
        element: <UsersPage />,
      },
      {
        path: "purchases",
        element: <Purchases />,
      },
      {
        path: "delivery-notes",
        element: <DeliveryNotes />,
      },
      {
        path: "vehicles",
        element: <Vehicles />,
      },
      {
        path: "delivery-routes",
        element: <DeliveryRoutes />,
      },
      {
        path: "finance",
        element: <Finance />,
      },
      {
        path: "credit",
        element: <Credit />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "settings/theme",
        element: <ThemeCustomizer />,
      },
      {
        path: "settings/branches",
        element: <BranchesPage />,
      },
      {
        path: "settings/global",
        element: <SystemConfig />,
      },
      {
        path: "rrhh",
        element: <HumanResources />,
      },
      {
        path: "ui-showcase",
        element: <UIComponentsShowcase />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
