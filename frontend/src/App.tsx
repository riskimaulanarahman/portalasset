import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SectionsPage from './pages/SectionsPage';
import EstatesPage from './pages/EstatesPage';
import CategoriesPage from './pages/CategoriesPage';
import MaterialsPage from './pages/MaterialsPage';
import MaterialStockOpnamesPage from './pages/MaterialStockOpnamesPage';
import AssetRegsPage from './pages/AssetRegsPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import DashboardPage from './pages/DashboardPage';
import ApprovalsPage from './pages/ApprovalsPage';
import TransactionsPage from './pages/TransactionsPage';
import TransfersPage from './pages/TransfersPage';
import AnggotaPage from './pages/AnggotaPage';
import CostCentersPage from './pages/CostCentersPage';
import UserActivationsPage from './pages/UserActivationsPage';
import ManufacturersPage from './pages/ManufacturersPage';
import AssetTypesPage from './pages/AssetTypesPage';
import AssetDepartmentsPage from './pages/AssetDepartmentsPage';
import AssetDivisionsPage from './pages/AssetDivisionsPage';
import GuidePage from './pages/GuidePage';
import UnitsPage from './pages/UnitsPage';
import VendorsPage from './pages/VendorsPage';
import BusinessUnitsPage from './pages/BusinessUnitsPage';
import AssetConditionsPage from './pages/AssetConditionsPage';
import AccessRequestPage from './pages/AccessRequestPage';

// Admin pages
import AdminWorkflowsPage from './pages/admin/AdminWorkflowsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminDataResetPage from './pages/admin/AdminDataResetPage';
import SettingsPage from './pages/admin/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { routePermissions } from './lib/access';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/access-request" element={<ProtectedRoute><AccessRequestPage /></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
        <Route path="/business-units" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/business-units']}><BusinessUnitsPage /></ProtectedRoute>} />
        <Route path="/sections" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/sections']}><SectionsPage /></ProtectedRoute>} />
        <Route path="/estates" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/estates']}><EstatesPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/categories']}><CategoriesPage /></ProtectedRoute>} />
        <Route path="/materials" element={<ProtectedRoute requiredPermissions={routePermissions['/materials']}><MaterialsPage /></ProtectedRoute>} />
        <Route path="/material-stock-opnames" element={<ProtectedRoute requiredPermissions={routePermissions['/material-stock-opnames']}><MaterialStockOpnamesPage /></ProtectedRoute>} />
        <Route path="/asset-regs" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/asset-regs']}><AssetRegsPage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute requiredPermissions={routePermissions['/transactions']}><TransactionsPage /></ProtectedRoute>} />
        <Route path="/transfers" element={<ProtectedRoute requiredPermissions={routePermissions['/transfers']}><TransfersPage /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute requiredPermissions={routePermissions['/assets']}><AssetsPage /></ProtectedRoute>} />
        <Route path="/assets/:regId" element={<ProtectedRoute requiredPermissions={routePermissions['/assets/:regId']}><AssetDetailPage /></ProtectedRoute>} />
        <Route path="/asset-conditions" element={<ProtectedRoute requiredPermissions={routePermissions['/asset-conditions']}><AssetConditionsPage /></ProtectedRoute>} />
        <Route path="/anggotas" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/anggotas']}><AnggotaPage /></ProtectedRoute>} />
        <Route path="/cost-centers" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/cost-centers']}><CostCentersPage /></ProtectedRoute>} />
        <Route path="/user-activations" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/user-activations']}><UserActivationsPage /></ProtectedRoute>} />
        <Route path="/software" element={<Navigate to="/dashboard" replace />} />
        <Route path="/manufacturers" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/manufacturers']}><ManufacturersPage /></ProtectedRoute>} />
        <Route path="/asset-types" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/asset-types']}><AssetTypesPage /></ProtectedRoute>} />
        <Route path="/asset-departments" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/asset-departments']}><AssetDepartmentsPage /></ProtectedRoute>} />
        <Route path="/asset-divisions" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/asset-divisions']}><AssetDivisionsPage /></ProtectedRoute>} />
        <Route path="/guide" element={<ProtectedRoute><GuidePage /></ProtectedRoute>} />
        <Route path="/units" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/units']}><UnitsPage /></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute adminOnly requiredPermissions={routePermissions['/vendors']}><VendorsPage /></ProtectedRoute>} />

        {/* Administration */}
        <Route path="/admin/workflows" element={<ProtectedRoute requiredPermissions={routePermissions['/admin/workflows']}><AdminWorkflowsPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requiredPermissions={routePermissions['/admin/users']}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/roles" element={<ProtectedRoute requiredPermissions={routePermissions['/admin/roles']}><AdminRolesPage /></ProtectedRoute>} />
        <Route path="/admin/data-reset" element={<ProtectedRoute requiredPermissions={routePermissions['/admin/data-reset']}><AdminDataResetPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute requiredPermissions={routePermissions['/settings']}><SettingsPage /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
