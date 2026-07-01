import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RequirePermission, GuestOnly } from './guards';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';

function wrap(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32"><Spinner /></div>}>
      <Component />
    </Suspense>
  );
}

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const ProductsListPage = lazy(() => import('@/features/products/ProductsListPage'));
const ProductFormPage = lazy(() => import('@/features/products/ProductFormPage'));
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'));
const OrdersListPage = lazy(() => import('@/features/orders/OrdersListPage'));
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage'));
const CustomersListPage = lazy(() => import('@/features/customers/CustomersListPage'));
const CustomerDetailPage = lazy(() => import('@/features/customers/CustomerDetailPage'));
const StaffPage = lazy(() => import('@/features/staff/StaffPage'));
const CouponsPage = lazy(() => import('@/features/coupons/CouponsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestOnly>
        <Suspense fallback={<div className="flex items-center justify-center h-32"><Spinner /></div>}>
          <LoginPage />
        </Suspense>
      </GuestOnly>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: wrap(DashboardPage) },

      {
        path: 'products',
        element: <RequirePermission permission="manage-products">{wrap(ProductsListPage)}</RequirePermission>,
      },
      {
        path: 'products/new',
        element: <RequirePermission permission="manage-products">{wrap(ProductFormPage)}</RequirePermission>,
      },
      {
        path: 'products/:id/edit',
        element: <RequirePermission permission="manage-products">{wrap(ProductFormPage)}</RequirePermission>,
      },
      {
        path: 'categories',
        element: <RequirePermission permission="manage-products">{wrap(CategoriesPage)}</RequirePermission>,
      },

      {
        path: 'orders',
        element: <RequirePermission permission="view-orders">{wrap(OrdersListPage)}</RequirePermission>,
      },
      {
        path: 'orders/:id',
        element: <RequirePermission permission="view-orders">{wrap(OrderDetailPage)}</RequirePermission>,
      },

      {
        path: 'customers',
        element: <RequirePermission permission="manage-customers">{wrap(CustomersListPage)}</RequirePermission>,
      },
      {
        path: 'customers/:id',
        element: <RequirePermission permission="manage-customers">{wrap(CustomerDetailPage)}</RequirePermission>,
      },

      {
        path: 'staff',
        element: <RequirePermission permission="manage-staff">{wrap(StaffPage)}</RequirePermission>,
      },
      {
        path: 'coupons',
        element: <RequirePermission permission="manage-products">{wrap(CouponsPage)}</RequirePermission>,
      },
      {
        path: 'settings',
        element: <RequirePermission permission="manage-settings">{wrap(SettingsPage)}</RequirePermission>,
      },
    ],
  },
]);
