// frontend/src/components/layout/AppLayout.tsx
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Upload, ClipboardList, ScrollText,
  BarChart3, Zap, ChevronLeft, ChevronRight,
  Bell, Search, LogOut, Menu, X, FileText, Clock,
} from 'lucide-react';
import { getSession, clearSession, logoutUser } from '../../services/firebase';
import { getReviewQueue, getDocuments } from '../../services/api';
import { useNavigate as useNav } from 'react-router-dom';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',   path: '/dashboard' },
  { icon: Upload,          label: 'Upload',       path: '/upload' },
  { icon: ClipboardList,   label: 'Review Queue', path: '/review', badge: true },
  { icon: BarChart3,       label: 'Insights',     path: '/insights' },
  { icon: ScrollText,      label: 'Audit Log',    path: '/audit' },
];

const DOC_EMOJI: Record<string, string> = {
  banking: '🏦', insurance: '🏥', invoice: '🧾',
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [reviewCount,  setReviewCount]  = useState(0);

  // Search state
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [allDocs,       setAllDocs]       = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const session   = getSession();
  const userName  = session?.name  || 'User';
  const userEmail = session?.email || '';
  const initials  = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  // Load all docs for search
  useEffect(() => {
    if (!session) { navigate('/login'); return; }
    getDocuments({ limit: 200 })
      .then(r => setAllDocs(r.data?.documents || []))
      .catch(() => {});
    getReviewQueue()
      .then(r => {
        const docs = r.data?.documents || [];
        setReviewCount(docs.filter((d: any) => d.status === 'needs_review').length);
      })
      .catch(() => {});
  }, [location.pathname]);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    const q = searchQuery.toLowerCase();
    const results = allDocs.filter(doc =>
      doc.filename?.toLowerCase().includes(q) ||
      doc.document_type?.toLowerCase().includes(q) ||
      doc.status?.toLowerCase().includes(q)
    ).slice(0, 6);
    setSearchResults(results);
    setSearchOpen(true);
  }, [searchQuery, allDocs]);

  // Click outside to close search
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    try { await logoutUser(); } catch {}
    clearSession();
    navigate('/login');
  };

  const handleSearchSelect = (doc: any) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate(`/results/${doc.id}`);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 p-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow flex-shrink-0">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="font-display text-lg font-bold text-white tracking-tight">
            DocuSense <span className="text-brand-400">AI</span>
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
              <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
                className={`nav-item relative ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}>
                <item.icon size={18} className={active ? 'text-brand-400' : ''} />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {item.badge && reviewCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className={`bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center
                      ${collapsed ? 'absolute -top-1 -right-1 w-4 h-4 text-[10px]' : 'w-5 h-5'}`}>
                    {reviewCount}
                  </motion.span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <div className={`flex items-center gap-3 p-3 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-dark-500 text-xs truncate">{userEmail}</p>
            </div>
          )}
        </div>
        <button onClick={handleSignOut}
          className={`nav-item w-full text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 z-20 lg:hidden" />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col bg-dark-900/80 backdrop-blur-xl border-r border-white/5 relative z-10 overflow-hidden">
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-dark-800 border border-white/10
                     flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-all shadow-card z-20">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-dark-900 border-r border-white/5 z-30 lg:hidden">
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header with WORKING search */}
        <header className="h-14 border-b border-white/5 bg-dark-900/50 backdrop-blur-xl flex items-center px-4 gap-4 flex-shrink-0">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-dark-400 hover:text-white p-1">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Search bar */}
          <div ref={searchRef} className="flex-1 max-w-md relative hidden md:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setSearchOpen(true)}
              placeholder="Search documents by name, type, status..."
              className="w-full bg-dark-800/60 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-dark-300
                         placeholder-dark-600 focus:outline-none focus:border-brand-500/30 transition-all"
            />

            {/* Search results dropdown */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  className="absolute top-full mt-1 left-0 right-0 bg-dark-900 border border-white/10 rounded-xl shadow-card overflow-hidden z-50"
                >
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-dark-500 text-sm">
                      No documents found for "{searchQuery}"
                    </div>
                  ) : (
                    <>
                      <div className="px-3 py-2 border-b border-white/5">
                        <span className="text-dark-600 text-xs">{searchResults.length} result{searchResults.length > 1 ? 's' : ''}</span>
                      </div>
                      {searchResults.map(doc => {
                        const conf = doc.confidence ?? 0;
                        const confColor = conf >= 90 ? '#34d399' : conf >= 75 ? '#fbbf24' : '#fb7185';
                        return (
                          <button key={doc.id} onClick={() => handleSearchSelect(doc)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-800/60 transition-colors text-left">
                            <span className="text-base flex-shrink-0">{DOC_EMOJI[doc.document_type] || '📄'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">{doc.filename}</p>
                              <p className="text-dark-600 text-xs capitalize">{doc.document_type} · {doc.status?.replace('_', ' ')}</p>
                            </div>
                            <span className="text-xs font-mono flex-shrink-0" style={{ color: confColor }}>
                              {conf.toFixed(0)}%
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800 transition-all">
              <Bell size={17} />
              {reviewCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800/60 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
              <span className="text-xs text-dark-400">API Online</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }} className="h-full">
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}