import React, { useState, useRef, useCallback } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Database, Map, Layers, Package,
  ClipboardList, History, LogOut, Menu, User as UserIcon,
  ArrowLeftRight, Bell, Search, Moon, Sun, ChevronRight,
  Users, Wallet, Monitor, HelpCircle, Factory, Tag, ClipboardCheck, Play,
  Settings, UserCog, Workflow, Shield, Ruler, ShoppingCart, Building2, Activity, Trash2
} from 'lucide-react';
import { cn, getStoredUser, toggleDarkMode, isDarkMode } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { showConfirm } from '../utils/SwalUtils';
import { useSettings } from '../hooks/useSettings';
import { useEffect } from 'react';
import { hasAnyStoredPermission, routePermissions } from '../lib/access';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '../hooks/usePermissions';
import api from '../api/axios';
import Modal from '../components/Modal';
import ChangePasswordForm from '../components/forms/ChangePasswordForm';

// ── Types ──────────────────────────────────────────────────────────────────────
// ── Types ──────────────────────────────────────────────────────────────────────
interface NavSection {
  label: string;
  items: NavItem[];
}
interface NavItem {
  to?: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  children?: NavItem[];
}

// ── Navigation config ──────────────────────────────────────────────────────────
const navigation: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard' },
      { to: '/approvals', icon: <ClipboardCheck className="h-4 w-4" />, label: 'My Approvals' },
    ],
  },
  {
    label: 'Master Data',
    items: [
      {
        label: 'Organization',
        icon: <Users className="h-4 w-4" />,
        children: [
          { to: '/business-units', icon: <Building2 className="h-4 w-4" />,    label: 'Business Units' },
          { to: '/sections',       icon: <Database className="h-4 w-4" />,      label: 'Sections'       },
          { to: '/estates',        icon: <Map className="h-4 w-4" />,           label: 'Estates'        },
          { to: '/cost-centers',   icon: <Wallet className="h-4 w-4" />,        label: 'Cost Centers'   },
          { to: '/anggotas',       icon: <Users className="h-4 w-4" />,         label: 'Members'        },
        ]
      },
      {
        label: 'Asset Info',
        icon: <Package className="h-4 w-4" />,
        children: [
          { to: '/asset-types',   icon: <Tag className="h-4 w-4" />,           label: 'Asset Types'  },
          { to: '/asset-regs',    icon: <ClipboardList className="h-4 w-4" />, label: 'Asset Reg'    },
          { to: '/categories',    icon: <Layers className="h-4 w-4" />,        label: 'Categories'   },
          { to: '/manufacturers', icon: <Factory className="h-4 w-4" />,       label: 'Manufacturers'},
          { to: '/units',         icon: <Ruler className="h-4 w-4" />,         label: 'Units'        },
          { to: '/vendors',       icon: <ShoppingCart className="h-4 w-4" />,  label: 'Vendors'      },
        ]
      }
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/assets',            icon: <History className="h-4 w-4" />,   label: 'Assets'        },
      { to: '/asset-conditions',  icon: <Activity className="h-4 w-4" />,  label: 'Kondisi Aset'  },
      { to: '/materials',         icon: <Package className="h-4 w-4" />,   label: 'Materials'     },
      { to: '/software',          icon: <Monitor className="h-4 w-4" />,   label: 'Software'      },
    ],
  },
  {
    label: 'In/Out',
    items: [
      { to: '/transactions', icon: <ArrowLeftRight className="h-4 w-4" />,label: 'Transactions' },
      { to: '/transfers',    icon: <Play className="h-4 w-4" />,          label: 'Transfers'    },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/workflows', icon: <Workflow className="h-4 w-4" />, label: 'Approval Workflows' },
      { to: '/admin/users',     icon: <UserCog className="h-4 w-4" />,  label: 'User Management' },
      { to: '/admin/roles',     icon: <Shield className="h-4 w-4" />,   label: 'Role Management' },
      { to: '/admin/data-reset',icon: <Trash2 className="h-4 w-4" />,   label: 'Reset Data UAT' },
      { to: '/settings',        icon: <Settings className="h-4 w-4" />, label: 'System Settings' },
    ],
  },
];

// ── Sidebar Item ───────────────────────────────────────────────────────────────
const SidebarItem: React.FC<{ item: NavItem; collapsed: boolean; depth?: number }> = ({ item, collapsed, depth = 0 }) => {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  
  const isChildActive = (it: NavItem): boolean => {
    if (it.to && (location.pathname === it.to || location.pathname.startsWith(it.to + '/'))) return true;
    if (it.children) return it.children.some(c => isChildActive(c));
    return false;
  };

  const [isOpen, setIsOpen] = useState(() => {
    if (hasChildren) return isChildActive(item);
    return false;
  });

  const isActive = item.to ? (location.pathname === item.to || location.pathname.startsWith(item.to + '/')) : isChildActive(item);

  const content = (
    <div className={cn(
      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative cursor-pointer',
      isActive && !hasChildren
        ? 'bg-primary text-white shadow-inner shadow-black/20'
        : isActive && hasChildren
        ? 'text-white bg-white/5'
        : 'text-forest-300 hover:bg-white/10 hover:text-white',
      collapsed && 'justify-center px-2',
      depth > 0 && !collapsed && 'ml-4 py-2 text-xs font-medium',
    )}>
      {/* Active indicator */}
      {isActive && !collapsed && !hasChildren && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-wood-primary rounded-r-full" />
      )}

      <span className={cn(
        'shrink-0 transition-colors',
        isActive ? 'text-wood-primary' : 'text-forest-400 group-hover:text-forest-200',
      )}>
        {item.icon}
      </span>

      {!collapsed && (
        <span className="sidebar-item-label flex-1 truncate">{item.label}</span>
      )}

      {!collapsed && item.badge && (
        <span className="shrink-0 bg-wood-primary text-forest-900 text-[10px] font-black px-1.5 rounded-full">
          {item.badge}
        </span>
      )}

      {hasChildren && !collapsed && (
        <ChevronRight className={cn(
          "h-3.5 w-3.5 transition-transform duration-200",
          isOpen && "rotate-90"
        )} />
      )}
    </div>
  );

  if (hasChildren) {
    return (
      <div className="space-y-0.5">
        <div onClick={() => setIsOpen(!isOpen)} title={collapsed ? item.label : undefined}>
          {content}
        </div>
        <div 
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            isOpen && !collapsed ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-0.5 pt-0.5">
              {item.children?.map((child, idx) => (
                <SidebarItem key={child.to || idx} item={child} collapsed={collapsed} depth={depth + 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NavLink to={item.to || '#'} title={collapsed ? item.label : undefined} className="block">
      {content}
    </NavLink>
  );
};


// ── Global Search Result type ──────────────────────────────────────────────────
interface SearchResult {
  type: 'asset' | 'material' | 'transfer'
  id: string | number
  label: string
  subtitle: string
  url: string
}

// ── Main Layout ────────────────────────────────────────────────────────────────
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getSetting } = useSettings();
  const [collapsed,        setCollapsed]        = useState(false);
  const [mobileSidebar,    setMobileSidebar]    = useState(false);
  const [dark,             setDark]             = useState(isDarkMode);
  const [changePassOpen,   setChangePassOpen]   = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user     = getStoredUser();
  const { success } = useToast();
  const queryClient = useQueryClient();

  // #6 FIX: Auto-refresh permissions dari server setiap 5 menit
  usePermissions();

  // #16 FIX: Global search state
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = useCallback((val: string) => {
    setSearchQuery(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (val.length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    searchDebounce.current = setTimeout(async () => {
      try {
        const response = await api.get('/search', { params: { q: val } });
        setSearchResults(response.data.data ?? []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }, []);

  // #15 FIX: Poll jumlah approval pending setiap 60 detik untuk badge notifikasi
  const { data: approvalsData } = useQuery<{ data: unknown[] }>({
    queryKey: ['notification-approvals'],
    queryFn: async () => {
      const response = await api.get('/approvals/my-approvals');
      return response.data;
    },
    refetchInterval: 60_000,
    staleTime:       55_000,
    retry: false,
  });

  const pendingApprovalCount = (approvalsData?.data ?? []).filter(
    (a: any) => a.status === 'Pending'
  ).length;

  const appName = getSetting('app_name', 'Portal Asset');
  const visibleNavigation = navigation
    .map((section) => ({
      ...section,
      items: filterNavItems(section.items).map((item) =>
        item.to === '/approvals' && pendingApprovalCount > 0
          ? { ...item, badge: pendingApprovalCount > 99 ? '99+' : String(pendingApprovalCount) }
          : item
      ),
    }))
    .filter((section) => section.items.length > 0);

  // Dynamic Browser Title
  useEffect(() => {
    const pageLabel = getPageLabel(visibleNavigation.flatMap((s) => s.items));
    document.title = pageLabel ? `${pageLabel} | ${appName}` : appName;
  }, [location.pathname, appName]);

  const handleLogout = async () => {
    const result = await showConfirm('Sign Out', 'Are you sure you want to log out?', 'Yes, sign out');
    if (result.isConfirmed) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      queryClient.clear();
      success('Signed out', 'See you next time!');
      setTimeout(() => navigate('/login'), 500);
    }
  };

  const handleDark = () => setDark(toggleDarkMode());

  // Page title helper
  const getPageLabel = (items: NavItem[]): string | undefined => {
    for (const item of items) {
      if (item.to && (location.pathname === item.to || location.pathname.startsWith(item.to + '/'))) {
        return item.label;
      }
      if (item.children) {
        const childLabel = getPageLabel(item.children);
        if (childLabel) return childLabel;
      }
    }
    return undefined;
  };

  const pageName = getPageLabel(visibleNavigation.flatMap((s) => s.items)) ?? appName;

  function filterNavItems(items: NavItem[]): NavItem[] {
    return items.reduce<NavItem[]>((acc, item) => {
      if (item.children?.length) {
        const children = filterNavItems(item.children);
        if (children.length > 0) {
          acc.push({ ...item, children });
        }
        return acc;
      }

      const requiredPermissions = item.to ? routePermissions[item.to] : undefined;
      if (!requiredPermissions || hasAnyStoredPermission(requiredPermissions)) {
        acc.push(item);
      }

      return acc;
    }, []);
  }

  // ── Sidebar markup ─────────────────────────────────────────────────────────
  const sidebarContent = (isMobile = false) => (
    <div
      className={cn(
        'flex flex-col h-full bg-(--color-sidebar-bg) transition-all duration-300 ease-in-out shadow-2xl',
        !isMobile && (collapsed ? 'w-16' : 'w-60'),
        isMobile && 'w-72',
      )}
    >
      {/* Logo */}
      <div className="h-16 border-b border-forest-800/60 flex items-center shrink-0">
        <Link
          to="/dashboard"
          className={cn(
            'flex items-center gap-2.5 px-4 min-w-0 overflow-hidden',
            collapsed && !isMobile && 'justify-center px-0 w-full',
          )}
        >
          <div className="shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-forest-900/40 p-1">
            <img src={getSetting('app_logo_url', '/favicon.png')} alt="Logo" className="w-full h-full object-contain" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <p className="text-white font-black text-base tracking-tight leading-none">
                {appName}
              </p>
              <p className="text-forest-400 text-[10px] font-semibold tracking-wide mt-0.5">
                {getSetting('footer_text', 'Management System')}
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5 custom-scrollbar">
        {visibleNavigation.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[9px] font-black text-forest-600 uppercase tracking-[0.18em]">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item, idx) => (
                <SidebarItem key={item.to || item.label || idx} item={item} collapsed={collapsed && !isMobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="shrink-0 border-t border-forest-800/60 p-3 space-y-1">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-forest-800/40">
            <div className="w-7 h-7 bg-forest-700 rounded-lg flex items-center justify-center shrink-0">
              <UserIcon className="h-3.5 w-3.5 text-wood-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.name || 'User'}</p>
              <p className="text-[10px] text-forest-400 font-medium truncate uppercase tracking-widest">
                {user.role?.name || user.role_id || 'Role'}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Sign out"
          className={cn(
            'flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-forest-400 rounded-xl hover:bg-red-900/40 hover:text-red-300 transition-all duration-200',
            (collapsed && !isMobile) && 'justify-center',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || isMobile) && 'Sign Out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden md:flex shrink-0 z-20">
        {sidebarContent(false)}
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────────── */}
      {mobileSidebar && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileSidebar(false)}
          />
          <div className="relative z-10 animate-slide-left">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center gap-4 px-5 sticky top-0 z-10 shadow-sm shadow-black/3">
          {/* Toggle (desktop collapse / mobile open) */}
          <button
            onClick={() => {
              if (window.innerWidth < 768) setMobileSidebar((v) => !v);
              else setCollapsed((v) => !v);
            }}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-forest-500 hover:bg-forest-50 hover:text-forest-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          {/* Breadcrumb / page title */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-forest-500 font-medium">
            <span>{appName}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary font-bold">{pageName}</span>
          </div>

          {/* #16 FIX: Global search with autocomplete */}
          <div className="flex-1 max-w-xs hidden lg:block relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-forest-300 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                placeholder="Search assets, materials, transfers…"
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-forest-800 placeholder:text-forest-300 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all"
              />
            </div>
            {/* Dropdown results */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
                {searchResults.map((result, i) => (
                  <Link
                    key={`${result.type}-${result.id}-${i}`}
                    to={result.url}
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-forest-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className={cn(
                      'shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded',
                      result.type === 'asset'    && 'bg-blue-100 text-blue-700',
                      result.type === 'material' && 'bg-green-100 text-green-700',
                      result.type === 'transfer' && 'bg-amber-100 text-amber-700',
                    )}>
                      {result.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-forest-900 truncate">{result.label}</p>
                      <p className="text-xs text-forest-500">{result.subtitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {searchOpen && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 px-4 py-3 text-sm text-forest-400 italic">
                No results for "{searchQuery}"
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={handleDark}
              title={dark ? 'Switch to Light' : 'Switch to Dark'}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-forest-500 hover:bg-forest-50 hover:text-forest-700 transition-colors"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Help Guide */}
            <Link
              to="/guide"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-forest-500 hover:bg-forest-50 hover:text-forest-700 transition-colors"
              title="Help Guide"
            >
              <HelpCircle className="h-4 w-4" />
            </Link>

            {/* #15 FIX: Notification bell dengan real pending approval count */}
            <Link
              to="/approvals"
              className="relative flex items-center justify-center w-8 h-8 rounded-lg text-forest-500 hover:bg-forest-50 hover:text-forest-700 transition-colors"
              title={pendingApprovalCount > 0 ? `${pendingApprovalCount} pending approval` : 'Approvals'}
            >
              <Bell className="h-4 w-4" />
              {pendingApprovalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-red-500 rounded-full ring-2 ring-white flex items-center justify-center px-1">
                  <span className="text-[9px] font-black text-white leading-none">
                    {pendingApprovalCount > 99 ? '99+' : pendingApprovalCount}
                  </span>
                </span>
              )}
            </Link>

            {/* Profile — click avatar to change password (#14 FIX) */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-forest-900 leading-tight">
                  {user.name || 'User'}
                </span>
                <span className="text-[10px] text-forest-500 font-medium uppercase tracking-widest">
                  {user.role?.name || user.role_id || 'Role'}
                </span>
              </div>
              <button
                onClick={() => setChangePassOpen(true)}
                title="Ubah Password"
                className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center ring-2 ring-primary/10 shadow-sm hover:ring-4 transition-all"
              >
                <UserIcon className="h-3.5 w-3.5 text-wood-primary" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7 animate-fade-in">
          {children}
        </main>
      </div>

      {/* #14 FIX: Change Password Modal */}
      <Modal
        isOpen={changePassOpen}
        onClose={() => setChangePassOpen(false)}
        title="Ubah Password"
        description="Masukkan password saat ini dan password baru Anda."
        size="sm"
      >
        <ChangePasswordForm onCancel={() => setChangePassOpen(false)} />
      </Modal>
    </div>
  );
};

export default MainLayout;
