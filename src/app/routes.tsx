import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { OtpVerification } from './pages/OtpVerification';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Finance } from './pages/Finance';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ThemeCustomizer } from './pages/ThemeCustomizer';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />
  },
  {
    path: '/reset-password',
    element: <ResetPassword />
  },
  {
    path: '/verify-otp',
    element: <OtpVerification />
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'pos',
        element: <POS />
      },
      {
        path: 'inventory',
        element: <Inventory />
      },
      {
        path: 'customers',
        element: <Customers />
      },
      {
        path: 'suppliers',
        element: <Suppliers />
      },
      {
        path: 'finance',
        element: <Finance />
      },
      {
        path: 'reports',
        element: <Reports />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'settings/theme',
        element: <ThemeCustomizer />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
