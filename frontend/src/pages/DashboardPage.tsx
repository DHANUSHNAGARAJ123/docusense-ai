// frontend/src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import {
  FileText, CheckCircle, AlertTriangle, Clock,
  TrendingUp, Upload, ArrowRight, Zap,
} from 'lucide-react';
import { getStats, getDocuments } from '../services/api';
import { getSession } from '../services/firebase';

const COLORS = {
  banking:   '#0ea5e9',
  insurance: '#a78bfa',
  invoice:   '#34d399',
  unknown:   '#64748b',
};
const CONF_COLOR = (v: number) => v >= 90 ? '#34d399' : v >= 75 ? '#fbbf24' : '#fb7185';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const session  = getSession();
  const [stats,  setStats]  = useState<any>(null);
  const [docs,   setDocs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getDocuments({ limit: 50 })])
      .then(([sRes, dRes]) => {
        setStats(sRes.data);
        setDocs(dRes.data?.documents || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Chart data ──────────────────────────────────────────────
  const pieData = stats
    ? Object.entries(stats.by_document_type || {}).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: COLORS[name as keyof typeof COLORS] || COLORS.unknown,
      }))
    : [];

  // Weekly upload trend (last 7 days)
  const weekData = (() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString('en', { weekday: 'short' })] = 0;
    }
    docs.forEach(doc => {
      if (!doc.uploaded_at) return;
      const d = new Date(doc.uploaded_at);
      const label = d.toLocaleDateString('en', { weekday: 'short' });
      if (label in days) days[label]++;
    });
    return Object.entries(days).map(([day, count]) => ({ day, count }));
  })();

  // Confidence distribution
  const confData = [
    { range: '90-100%', count: docs.filter(d => (d.confidence || 0) >= 90).length,               color: '#34d399' },
    { range: '75-90%',  count: docs.filter(d => (d.confidence || 0) >= 75 && (d.confidence || 0) < 90).length, color: '#fbbf24' },
    { range: '<75%',    count: docs.filter(d => (d.confidence || 0) < 75).length,                color: '#fb7185' },
  ];

  const STAT_CARDS = [
    {
      label:   'Total Documents',
      value:   stats?.total_documents ?? 0,
      icon:    FileText,
      color:   'text-brand-400',
      bg:      'bg-brand-950/40',
      border:  'border-brand-800/20',
    },
    {
      label:   'Completed',
      value:   stats?.completed ?? 0,
      icon:    CheckCircle,
      color:   'text-emerald-400',
      bg:      'bg-emerald-950/40',
      border:  'border-emerald-800/20',
    },
    {
      label:   'Needs Review',
      value:   stats?.needs_review ?? 0,
      icon:    AlertTriangle,
      color:   'text-amber-400',
      bg:      'bg-amber-950/40',
      border:  'border-amber-800/20',
    },
    {
      label:   'Avg Confidence',
      value:   `${stats?.avg_confidence?.toFixed(1) ?? 0}%`,
      icon:    TrendingUp,
      color:   'text-violet-400',
      bg:      'bg-violet-950/40',
      border:  'border-violet-800/20',
    },
  ];

  const recentDocs = docs.slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">

      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Welcome back, <span className="text-brand-400">{session?.name?.split(' ')[0] || 'User'}</span> 👋
          </h1>
          <p className="text-dark-500 text-sm mt-1">
            {stats?.total_documents
              ? `You have ${stats.total_documents} document${stats.total_documents > 1 ? 's' : ''} processed`
              : 'Upload your first document to get started'}
          </p>
        </div>
        <button onClick={() => navigate('/upload')} className="btn-primary py-2.5 px-5">
          <Upload size={16} /> Upload Document
        </button>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {STAT_CARDS.map(card => (
          <motion.div key={card.label} variants={cardVariants}
            className={`card p-5 border ${card.border} hover:scale-[1.02] transition-transform cursor-default`}>
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon size={18} className={card.color} />
            </div>
            <div className="font-display text-3xl font-bold text-white mb-1">{card.value}</div>
            <div className="text-dark-500 text-xs">{card.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Weekly Upload Bar Chart */}
        <motion.div variants={cardVariants} initial="hidden" animate="show"
          className="lg:col-span-2 card p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart size={15} className="text-brand-400" /> Weekly Uploads
          </h3>
          {weekData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#0ea5e9' }}
                  cursor={{ fill: 'rgba(14,165,233,0.05)' }}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]}
                  label={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-dark-600 text-sm">
              No uploads this week yet
            </div>
          )}
        </motion.div>

        {/* Pie Chart — Doc Types */}
        <motion.div variants={cardVariants} initial="hidden" animate="show"
          className="card p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Zap size={15} className="text-brand-400" /> Document Types
          </h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-dark-400">{d.name}</span>
                    </div>
                    <span className="text-white font-mono">{d.value as number}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-44 text-dark-600 text-sm">
              No data yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Confidence Distribution */}
      <motion.div variants={cardVariants} initial="hidden" animate="show" className="card p-5">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-brand-400" /> Confidence Distribution
        </h3>
        {confData.some(d => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={confData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              {confData.map((d, i) => (
                <Bar key={i} dataKey="count" fill={d.color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-dark-600 text-sm">
            Process some documents to see confidence distribution
          </div>
        )}
      </motion.div>

      {/* Recent Documents */}
      <motion.div variants={cardVariants} initial="hidden" animate="show" className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Clock size={15} className="text-brand-400" /> Recent Documents
          </h3>
          <button onClick={() => navigate('/review')}
            className="text-brand-400 text-xs hover:text-brand-300 flex items-center gap-1 transition-colors">
            View all <ArrowRight size={12} />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="text-center py-8 text-dark-600 text-sm">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            No documents yet — <button onClick={() => navigate('/upload')} className="text-brand-400 hover:underline">upload one!</button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDocs.map((doc, i) => {
              const conf  = doc.confidence ?? 0;
              const color = CONF_COLOR(conf);
              const emoji = doc.document_type === 'banking' ? '🏦' : doc.document_type === 'insurance' ? '🏥' : '🧾';
              return (
                <motion.div key={doc.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/results/${doc.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-800/40 cursor-pointer transition-all group">
                  <span className="text-xl">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{doc.filename}</p>
                    <p className="text-dark-600 text-xs capitalize">{doc.document_type} · {doc.status?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-1.5 bg-dark-800 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full rounded-full" style={{ width: `${conf}%`, background: color }} />
                    </div>
                    <span className="text-xs font-mono" style={{ color }}>{conf.toFixed(0)}%</span>
                  </div>
                  <ArrowRight size={13} className="text-dark-700 group-hover:text-brand-400 transition-colors" />
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

    </div>
  );
}