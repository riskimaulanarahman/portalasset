import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SectionsPage from './pages/SectionsPage';
import EstatesPage from './pages/EstatesPage';
import CategoriesPage from './pages/CategoriesPage';
import MaterialsPage from './pages/MaterialsPage';
import AssetRegsPage from './pages/AssetRegsPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import DashboardPage from './pages/DashboardPage';
import ApprovalsPage from './pages/ApprovalsPage';
import TransactionsPage from './pages/TransactionsPage';
import TransfersPage from './pages/TransfersPage';
import AnggotaPage from './pages/AnggotaPage';
import CostCentersPage from './pages/CostCentersPage';
import SoftwarePage from './pages/SoftwarePage';
import ManufacturersPage from './pages/ManufacturersPage';
import AssetTypesPage from './pages/AssetTypesPage';
import GuidePage from './pages/GuidePage';
import UnitsPage from './pages/UnitsPage';
import VendorsPage from './pages/VendorsPage';
import BusinessUnitsPage from './pages/BusinessUnitsPage';

// Admin pages
import AdminWorkflowsPage from './pages/admin/AdminWorkflowsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
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
        <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
        <Route path="/business-units" element={<ProtectedRoute requiredPermissions={routePermissions['/business-units']}><BusinessUnitsPage /></ProtectedRoute>} />
        <Route path="/sections" element={<ProtectedRoute requiredPermissions={routePermissions['/sections']}><SectionsPage /></ProtectedRoute>} />
        <Route path="/estates" element={<ProtectedRoute requiredPermissions={routePermissions['/estates']}><EstatesPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute requiredPermissions={routePermissions['/categories']}><CategoriesPage /></ProtectedRoute>} />
        <Route path="/materials" element={<ProtectedRoute requiredPermissions={routePermissions['/materials']}><MaterialsPage /></ProtectedRoute>} />
        <Route path="/asset-regs" element={<ProtectedRoute requiredPermissions={routePermissions['/asset-regs']}><AssetRegsPage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute requiredPermissions={routePermissions['/transactions']}><TransactionsPage /></ProtectedRoute>} />
        <Route path="/transfers" element={<ProtectedRoute><TransfersPage /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute requiredPermissions={routePermissions['/assets']}><AssetsPage /></ProtectedRoute>} />
        <Route path="/assets/:regId" element={<ProtectedRoute requiredPermissions={routePermissions['/assets/:regId']}><AssetDetailPage /></ProtectedRoute>} />
        <Route path="/anggotas" element={<ProtectedRoute requiredPermissions={routePermissions['/anggotas']}><AnggotaPage /></ProtectedRoute>} />
        <Route path="/cost-centers" element={<ProtectedRoute requiredPermissions={routePermissions['/cost-centers']}><CostCentersPage /></ProtectedRoute>} />
        <Route path="/software" element={<ProtectedRoute requiredPermissions={routePermissions['/software']}><SoftwarePage /></ProtectedRoute>} />
        <Route path="/manufacturers" element={<ProtectedRoute requiredPermissions={routePermissions['/manufacturers']}><ManufacturersPage /></ProtectedRoute>} />
        <Route path="/asset-types" element={<ProtectedRoute requiredPermissions={routePermissions['/asset-types']}><AssetTypesPage /></ProtectedRoute>} />
        <Route path="/guide" element={<ProtectedRoute><GuidePage /></ProtectedRoute>} />
        <Route path="/units" element={<ProtectedRoute requiredPermissions={routePermissions['/units']}><UnitsPage /></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute requiredPermissions={routePermissions['/vendors']}><VendorsPage /></ProtectedRoute>} />

        {/* Administration */}
        <Route path="/admin/workflows" element={<ProtectedRoute requiredPermissions={routePermissions['/admin/workflows']}><AdminWorkflowsPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requiredPermissions={routePermissions['/admin/users']}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/roles" element={<ProtectedRoute requiredPermissions={routePermissions['/admin/roles']}><AdminRolesPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute requiredPermissions={routePermissions['/settings']}><SettingsPage /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
