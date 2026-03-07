import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import Manufacturers from "@/pages/admin/manufacturers/Manufacturers";
import ManufacturerForm from "@/pages/admin/manufacturers/ManufacturerForm";
import Retailers from "@/pages/admin/retailers/Retailers";
import RetailerForm from "@/pages/admin/retailers/RetailerForm";
import Distributors from "@/pages/admin/distributors/Distributors";
import DistributorForm from "@/pages/admin/distributors/DistributorForm";
import Products from "@/pages/admin/products/Products";
import ProductForm from "@/pages/admin/products/ProductForm";
import ProductDetail from "@/pages/admin/products/ProductDetail";
import Inventories from "@/pages/admin/inventory/Inventories";
import InventoryForm from "@/pages/admin/inventory/InventoryForm";
import InventoryProducts from "@/pages/admin/inventory/InventoryProducts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function AppRoutes() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard/admin/manufacturers" replace /> : <Navigate to="/login" replace />}
      />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/admin/manufacturers" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin/manufacturers" element={<Manufacturers />} />
        <Route path="admin/manufacturers/add" element={<ManufacturerForm />} />
        <Route path="admin/manufacturers/edit/:id" element={<ManufacturerForm />} />
        <Route path="admin/retailers" element={<Retailers />} />
        <Route path="admin/retailers/add" element={<RetailerForm />} />
        <Route path="admin/retailers/edit/:id" element={<RetailerForm />} />
        <Route path="admin/distributors" element={<Distributors />} />
        <Route path="admin/distributors/add" element={<DistributorForm />} />
        <Route path="admin/distributors/edit/:id" element={<DistributorForm />} />
        <Route path="admin/products" element={<Products />} />
        <Route path="admin/products/add" element={<ProductForm />} />
        <Route path="admin/products/edit/:id" element={<ProductForm />} />
        <Route path="admin/products/:id" element={<ProductDetail />} />
        <Route path="admin/inventory" element={<Inventories />} />
        <Route path="admin/inventory/add" element={<InventoryForm />} />
        <Route path="admin/inventory/edit/:id" element={<InventoryForm />} />
        <Route path="admin/inventory/:id/products" element={<InventoryProducts />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
