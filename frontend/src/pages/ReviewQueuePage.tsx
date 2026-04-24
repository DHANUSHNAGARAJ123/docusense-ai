// frontend/src/pages/ReviewQueuePage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Eye, Filter, Trash2, X,
  AlertTriangle, Clock, FileText, ChevronRight,
  BarChart2, Info,
} from 'lucide-react';
import { getReviewQueue, approveDocument, deleteDocument } from '../services/api';
import toast from 'react-hot-toast';

interface ConfScore {
  field_name:       string;
  field_value:      string;
  confidence_score: number;
  ocr_confidence:   number;
  llm_confidence:   number;
  validation_score: number;
  needs_review:     boolean;
}

interface Doc {
  id:               string;
  filename:         string;
  document_type:    string;
  status:           string;
  confidence:       number;
  uploaded_at:      string;
  processed_at:     string;
  confidence_scores: ConfScore[];
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  completed:    { label: 'Completed',    badge: 'badge-green',  icon: CheckCircle },
  needs_review: { label: 'Needs Review', badge: 'badge-yellow', icon: AlertTriangle },
  processing:   { label: 'Processing',   badge: 'badge-blue',   icon: Clock },
  failed:       { label: 'Failed',       badge: 'badge-red',    icon: X },
  pending:      { label: 'Pending',      badge: 'badge-blue',   icon: Clock },
};

const DOC_TYPE_EMOJI: Record<string, string> = {
  banking:   '🏦',
  insurance: '🏥',
  invoice:   '🧾',
};

function ConfBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs font-mono text-dark-400 w-9 text-right">{score.toFixed(0)}%</span>
    </div>
  );
}

function ConfidencePanel({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const scores = doc.confidence_scores || [];
  const avg = scores.length
    ? scores.reduce((s, c) => s + c.confidence_score, 0) / scores.length
    : doc.confidence || 0;

  const getColor = (v: number) =>
    v >= 90 ? '#34d399' : v >= 75 ? '#fbbf24' : '#fb7185';

  const needsReviewFields = scores.filter(s => s.needs_review);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-80 border-l border-white/5 bg-dark-900/95 backdrop-blur-xl flex flex-col flex-shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BarChart2 size={15} className="text-brand-400" />
          <span className="text-white text-sm font-semibold">Confidence Scores</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-800 transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* File info */}
      <div className="p-4 border-b border-white/5 bg-dark-950/40">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{DOC_TYPE_EMOJI[doc.document_type] || '📄'}</span>
          <p className="text-white text-sm font-medium truncate">{doc.filename}</p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-dark-500 text-xs">Overall Confidence</span>
              <span className="text-xs font-mono" style={{ color: getColor(avg) }}>
                {avg.toFixed(1)}%
              </span>
            </div>
            <ConfBar score={avg} color={getColor(avg)} />
          </div>
        </div>
        {needsReviewFields.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-amber-400 text-xs">
            <AlertTriangle size={11} />
            <span>{needsReviewFields.length} fields need review</span>
          </div>
        )}
      </div>

      {/* Scores list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {scores.length === 0 ? (
          <div className="text-center py-8 text-dark-500 text-sm">
            <Info size={24} className="mx-auto mb-2 opacity-50" />
            No confidence scores yet
          </div>
        ) : (
          scores.map((score, i) => (
            <motion.div
              key={score.field_name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`p-3 rounded-xl border transition-all ${
                score.needs_review
                  ? 'border-amber-900/30 bg-amber-950/10'
                  : 'border-white/5 bg-dark-800/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-medium capitalize">
                      {score.field_name.replace(/_/g, ' ')}
                    </span>
                    {score.needs_review && (
                      <AlertTriangle size={9} className="text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  {score.field_value && (
                    <p className="text-dark-500 text-[10px] truncate mt-0.5">
                      {score.field_value}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs font-bold font-mono ml-2 flex-shrink-0"
                  style={{ color: getColor(score.confidence_score) }}
                >
                  {score.confidence_score.toFixed(0)}%
                </span>
              </div>

              {/* Sub-scores */}
              <div className="space-y-1">
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-dark-600 text-[10px]">OCR</span>
                    <span className="text-dark-500 text-[10px] font-mono">{score.ocr_confidence.toFixed(0)}%</span>
                  </div>
                  <ConfBar score={score.ocr_confidence} color="#0ea5e9" />
                </div>
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-dark-600 text-[10px]">AI</span>
                    <span className="text-dark-500 text-[10px] font-mono">{score.llm_confidence.toFixed(0)}%</span>
                  </div>
                  <ConfBar score={score.llm_confidence} color="#a78bfa" />
                </div>
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-dark-600 text-[10px]">Validation</span>
                    <span className="text-dark-500 text-[10px] font-mono">{score.validation_score.toFixed(0)}%</span>
                  </div>
                  <ConfBar score={score.validation_score} color="#34d399" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export default function ReviewQueuePage() {
  const navigate = useNavigate();
  const [documents, setDocuments]       = useState<Doc[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<string>('all');
  const [selectedDoc, setSelectedDoc]   = useState<Doc | null>(null);
  const [approvingId, setApprovingId]   = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getReviewQueue();
      setDocuments(res.data?.documents || []);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    setApprovingId(doc.id);
    try {
      await approveDocument(doc.id);
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'completed' } : d));
      if (selectedDoc?.id === doc.id) setSelectedDoc(prev => prev ? { ...prev, status: 'completed' } : null);
      toast.success('Document approved! ✅');
    } catch {
      toast.error('Approve failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${doc.filename}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
      toast.success('Deleted!');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleView = (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/results/${doc.id}`);
  };

  const handleRowClick = (doc: Doc) => {
    setSelectedDoc(prev => prev?.id === doc.id ? null : doc);
  };

  const filtered = documents.filter(d =>
    filter === 'all' ? true : d.status === filter
  );

  const counts = {
    all:          documents.length,
    needs_review: documents.filter(d => d.status === 'needs_review').length,
    completed:    documents.filter(d => d.status === 'completed').length,
    processing:   documents.filter(d => d.status === 'processing').length,
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Review Queue</h1>
          <p className="text-dark-500 text-sm mt-0.5">
            {counts.needs_review} need review · {counts.completed} completed
          </p>
        </div>
        <button onClick={fetchQueue} className="btn-secondary py-2 px-4 text-sm">
          Refresh
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-1 px-6 py-3 border-b border-white/5 flex-shrink-0">
        {[
          { key: 'all',          label: 'All',          count: counts.all },
          { key: 'needs_review', label: 'Needs Review', count: counts.needs_review },
          { key: 'completed',    label: 'Completed',    count: counts.completed },
          { key: 'processing',   label: 'Processing',   count: counts.processing },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${filter === tab.key
                ? 'bg-brand-950/80 text-brand-300 border border-brand-800/40'
                : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800/40'}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${filter === tab.key ? 'bg-brand-800/60 text-brand-300' : 'bg-dark-800 text-dark-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">

        {/* DOCUMENT LIST */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-dark-500">
              <FileText size={32} className="mb-3 opacity-40" />
              <p className="text-sm">No documents in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((doc, i) => {
                const cfg  = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                const conf = doc.confidence ?? 0;
                const confColor = conf >= 90 ? '#34d399' : conf >= 75 ? '#fbbf24' : '#fb7185';
                const isSelected = selectedDoc?.id === doc.id;
                const isApproving = approvingId === doc.id;
                const needsReviewCount = (doc.confidence_scores || []).filter(s => s.needs_review).length;

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => handleRowClick(doc)}
                    className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all group
                      ${isSelected ? 'bg-brand-950/20 border-l-2 border-brand-500' : 'hover:bg-dark-800/20 border-l-2 border-transparent'}`}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-dark-800/60 flex items-center justify-center text-xl flex-shrink-0">
                      {DOC_TYPE_EMOJI[doc.document_type] || '📄'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white text-sm font-medium truncate">{doc.filename}</p>
                        <span className={`badge text-[10px] ${cfg.badge} flex-shrink-0`}>
                          {cfg.label}
                        </span>
                        {needsReviewCount > 0 && (
                          <span className="badge badge-yellow text-[10px] flex-shrink-0">
                            {needsReviewCount} fields
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-dark-500 text-xs capitalize">{doc.document_type}</span>
                        <span className="text-dark-700 text-xs">·</span>
                        <span className="text-dark-500 text-xs">{formatDate(doc.uploaded_at)}</span>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20 hidden sm:block">
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-dark-600">Confidence</span>
                          <span className="text-[10px] font-mono" style={{ color: confColor }}>{conf.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${conf}%`, background: confColor }} />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Confidence detail */}
                      <button
                        onClick={e => { e.stopPropagation(); handleRowClick(doc); }}
                        title="View confidence scores"
                        className={`p-2 rounded-lg transition-all ${
                          isSelected
                            ? 'text-brand-400 bg-brand-950/60'
                            : 'text-dark-500 hover:text-brand-400 hover:bg-dark-800'
                        }`}
                      >
                        <BarChart2 size={14} />
                      </button>

                      {/* View results */}
                      <button
                        onClick={e => handleView(doc, e)}
                        title="View extracted data"
                        className="p-2 rounded-lg text-dark-500 hover:text-brand-400 hover:bg-dark-800 transition-all"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Approve */}
                      {doc.status === 'needs_review' && (
                        <button
                          onClick={e => handleApprove(doc, e)}
                          disabled={isApproving}
                          title="Approve document"
                          className="p-2 rounded-lg text-dark-500 hover:text-emerald-400 hover:bg-emerald-950/30 transition-all"
                        >
                          {isApproving
                            ? <div className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                            : <CheckCircle size={14} />}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={e => handleDelete(doc, e)}
                        title="Delete document"
                        className="p-2 rounded-lg text-dark-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <ChevronRight size={14} className={`text-dark-700 flex-shrink-0 transition-transform ${isSelected ? 'rotate-90 text-brand-400' : ''}`} />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* CONFIDENCE SIDE PANEL */}
        <AnimatePresence>
          {selectedDoc && (
            <ConfidencePanel
              doc={selectedDoc}
              onClose={() => setSelectedDoc(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}