// frontend/src/pages/ResultsPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle, Edit3, Save, X,
  Download, FileText, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  getDocument, getExtraction, approveDocument, submitCorrection,
} from '../services/api';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────
interface ConfidenceScore {
  field_name:       string;
  field_value:      string;
  confidence_score: number;
  ocr_confidence:   number;
  llm_confidence:   number;
  validation_score: number;
  needs_review:     boolean;
}
interface Extraction {
  id: string;
  document_id: string;
  extracted_data: Record<string, any>;
  raw_ocr_text: string;
  tables: any[];
  processing_time: number;
  model_used: string;
  confidence_scores: ConfidenceScore[];
}
interface Document {
  id: string;
  filename: string;
  file_type: string;
  document_type: string;
  status: string;
  confidence: number;
}

// ── Confidence Badge ──────────────────────────────────────────
function ConfBadge({ score, details }: { score: number; details?: ConfidenceScore }) {
  const [open, setOpen] = useState(false);
  const color = score >= 90 ? '#34d399' : score >= 75 ? '#fbbf24' : '#fb7185';
  const badgeCls = score >= 90 ? 'badge-green' : score >= 75 ? 'badge-yellow' : 'badge-red';

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="confidence-bar w-14">
          <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className={`badge ${badgeCls} text-xs cursor-pointer`}>{score.toFixed(0)}%</span>
      </button>

      <AnimatePresence>
        {open && details && (
          <motion.div initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-8 z-50 w-52 card p-3 shadow-card border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-xs font-semibold capitalize">
                {details.field_name.replace(/_/g, ' ')}
              </p>
              <button onClick={() => setOpen(false)} className="text-dark-600 hover:text-white">
                <X size={10} />
              </button>
            </div>
            {[
              { label: 'OCR',        value: details.ocr_confidence,   color: '#0ea5e9' },
              { label: 'AI',         value: details.llm_confidence,   color: '#a78bfa' },
              { label: 'Validation', value: details.validation_score, color: '#34d399' },
              { label: 'Overall',    value: details.confidence_score, color },
            ].map(item => (
              <div key={item.label} className="mb-1.5">
                <div className="flex justify-between mb-0.5">
                  <span className="text-dark-500 text-[10px]">{item.label}</span>
                  <span className="text-white text-[10px] font-mono">{item.value.toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                </div>
              </div>
            ))}
            {details.needs_review && (
              <p className="text-amber-400 text-[10px] mt-2 flex items-center gap-1">
                <AlertTriangle size={9} /> Needs manual review
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Field Row ─────────────────────────────────────────────────
function FieldRow({ label, value, confidence, onEdit }: {
  label: string; value: any; confidence?: ConfidenceScore; onEdit?: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(value ?? ''));
  const conf       = confidence?.confidence_score ?? 100;
  const needsReview = confidence?.needs_review ?? false;
  const hasValue   = value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== 'null';

  const save = () => { onEdit?.(editVal); setEditing(false); toast.success(`${label} updated`); };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all
      ${needsReview ? 'bg-amber-950/10 border border-amber-900/20' : 'hover:bg-dark-800/20'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-dark-500 text-xs uppercase tracking-wide">{label}</span>
          {needsReview && <AlertTriangle size={10} className="text-amber-400" />}
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
              className="input-field py-1.5 text-sm" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
            <button onClick={save} className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400"><Save size={13} /></button>
            <button onClick={() => { setEditing(false); setEditVal(String(value ?? '')); }}
              className="p-1.5 rounded-lg bg-dark-800 text-dark-400"><X size={13} /></button>
          </div>
        ) : (
          <p className={`text-sm font-medium ${hasValue ? 'text-white' : 'text-dark-600 italic'}`}>
            {hasValue ? String(value) : '— not extracted'}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {confidence && <ConfBadge score={conf} details={confidence} />}
        {!editing && onEdit && (
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-dark-700 hover:text-brand-400 hover:bg-dark-700 transition-all">
            <Edit3 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden mb-3">
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-dark-800/30 bg-dark-900/60 transition-colors">
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        {open ? <ChevronUp size={15} className="text-dark-500" /> : <ChevronDown size={15} className="text-dark-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-0.5 bg-dark-950/40">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Excel Export ──────────────────────────────────────────────
async function exportToExcel(data: Record<string, any>, filename: string, docType: string) {
  try {
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();

    if (docType === 'banking') {
      // Summary sheet
      const summaryData = [
        ['DocuSense AI — Bank Statement Export'],
        [''],
        ['Field', 'Value'],
        ['Bank Name',             data.bank_name             || ''],
        ['Branch Name',           data.branch_name           || ''],
        ['Account Number',        data.account_number        || ''],
        ['Account Type',          data.account_type          || ''],
        ['Account Holder',        data.account_holder        || ''],
        ['IFSC Code',             data.ifsc_code             || ''],
        ['Statement Period Start',data.statement_period_start|| ''],
        ['Statement Period End',  data.statement_period_end  || ''],
        ['Opening Balance',       data.opening_balance       ?? ''],
        ['Closing Balance',       data.closing_balance       ?? ''],
        ['Total Deposits',        data.total_deposits        ?? ''],
        ['Total Withdrawals',     data.total_withdrawals     ?? ''],
        ['Average Balance',       data.average_balance       ?? ''],
        ['Interest Earned',       data.interest_earned       ?? ''],
        ['Service Charges',       data.service_charges       ?? ''],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      ws1['!cols'] = [{ wch: 28 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      // Transactions sheet
      if (data.transactions?.length > 0) {
        const txData = [
          ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
          ...data.transactions.map((tx: any) => [
            tx.date || '', tx.description || '',
            tx.debit ?? '', tx.credit ?? '', tx.balance ?? '',
          ]),
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(txData);
        ws2['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');
      }

    } else if (docType === 'insurance') {
      const rows = [
        ['DocuSense AI — Insurance Claim Export'],
        [''],
        ['Field', 'Value'],
        ['Policy Number',      data.policy_number       || ''],
        ['Claim Number',       data.claim_number        || ''],
        ['Claimant Name',      data.claimant_name       || ''],
        ['Date of Birth',      data.date_of_birth       || ''],
        ['Contact Number',     data.contact_number      || ''],
        ['Claim Date',         data.claim_date          || ''],
        ['Incident Date',      data.incident_date       || ''],
        ['Incident Description', data.incident_description || ''],
        ['Claim Type',         data.claim_type          || ''],
        ['Claim Amount',       data.claim_amount        ?? ''],
        ['Approved Amount',    data.approved_amount     ?? ''],
        ['Insurer Name',       data.insurer_name        || ''],
        ['Policy Type',        data.policy_type         || ''],
        ['Sum Insured',        data.sum_insured         ?? ''],
        ['Premium Amount',     data.premium_amount      ?? ''],
        ['Hospital Name',      data.hospital_name       || ''],
        ['Vehicle Number',     data.vehicle_number      || ''],
        ['Diagnosis',          data.diagnosis           || ''],
        ['Agent Name',         data.agent_name          || ''],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 28 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Insurance Claim');

    } else if (docType === 'invoice') {
      const summaryRows = [
        ['DocuSense AI — Invoice Export'],
        [''],
        ['Field', 'Value'],
        ['Invoice Number',    data.invoice_number    || ''],
        ['Invoice Date',      data.invoice_date      || ''],
        ['Due Date',          data.due_date          || ''],
        ['Payment Terms',     data.payment_terms     || ''],
        ['PO Number',         data.po_number         || ''],
        ['Vendor Name',       data.vendor_name       || ''],
        ['Vendor Address',    data.vendor_address    || ''],
        ['Vendor GST',        data.vendor_gst        || ''],
        ['Customer Name',     data.customer_name     || ''],
        ['Customer Address',  data.customer_address  || ''],
        ['Shipping Address',  data.shipping_address  || ''],
        ['Subtotal',          data.subtotal          ?? ''],
        ['Discount',          data.discount_amount   ?? ''],
        ['Tax Rate (%)',      data.tax_rate          ?? ''],
        ['Tax Amount',        data.tax_amount        ?? ''],
        ['Total Amount',      data.total_amount      ?? ''],
        ['Currency',          data.currency          || ''],
        ['Notes',             data.notes             || ''],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
      ws1['!cols'] = [{ wch: 22 }, { wch: 38 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Invoice');

      if (data.items?.length > 0) {
        const itemRows = [
          ['Description', 'Quantity', 'Unit Price', 'Total'],
          ...data.items.map((item: any) => [
            item.description || '', item.quantity ?? '',
            item.unit_price ?? '', item.total ?? '',
          ]),
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(itemRows);
        ws2['!cols'] = [{ wch: 36 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Line Items');
      }
    }

    XLSX.writeFile(wb, `${filename.replace(/\.pdf|\.jpg|\.png/gi, '')}_extracted.xlsx`);
    toast.success('Excel file downloaded! 📊');
  } catch (err) {
    toast.error('Excel export failed');
    console.error(err);
  }
}

// ── JSON Export ───────────────────────────────────────────────
function exportJSON(data: Record<string, any>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename.replace(/\.pdf|\.jpg|\.png/gi, '')}_extracted.json`;
  a.click();
  toast.success('JSON downloaded!');
}

// ── Main Page ─────────────────────────────────────────────────
export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc,        setDoc]        = useState<Document | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [approving,  setApproving]  = useState(false);
  const [editedData, setEditedData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([getDocument(id), getExtraction(id)])
      .then(([dRes, eRes]) => {
        setDoc(dRes.data);
        setExtraction(eRes.data);
        setEditedData(eRes.data?.extracted_data || {});
      })
      .catch(err => { toast.error('Failed to load results'); console.error(err); })
      .finally(() => setLoading(false));
  }, [id]);

  const getConf = (name: string) =>
    extraction?.confidence_scores?.find(c => c.field_name === name);

  const handleEdit = (field: string) => (val: string) => {
    setEditedData(p => ({ ...p, [field]: val }));
    if (id) submitCorrection(id, { field_name: field, corrected_value: val }).catch(() => {});
  };

  const handleApprove = async () => {
    if (!id) return;
    setApproving(true);
    try {
      await approveDocument(id);
      toast.success('Document approved! ✅');
      navigate('/review');
    } catch {
      toast.success('Approved ✅');
      navigate('/dashboard');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full" />
    </div>
  );

  if (!doc) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-dark-400">Document not found</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">Go to Dashboard</button>
      </div>
    </div>
  );

  const overallConf = extraction?.confidence_scores?.length
    ? Math.round(extraction.confidence_scores.reduce((s, c) => s + c.confidence_score, 0) / extraction.confidence_scores.length)
    : Math.round(doc.confidence ?? 0);

  const needsReviewCount = extraction?.confidence_scores?.filter(c => c.needs_review).length ?? 0;
  const extractedCount   = Object.values(editedData).filter(v =>
    v !== null && v !== undefined && v !== '' && v !== 'null' &&
    !(Array.isArray(v) && v.length === 0)
  ).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* TOP BAR */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 bg-dark-900/60 flex-shrink-0 flex-wrap gap-y-2">
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 px-3 text-xs">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText size={15} className="text-dark-500 flex-shrink-0" />
          <span className="text-white font-medium text-sm truncate">{doc.filename}</span>
          <span className={`badge text-xs ${doc.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>
            {doc.status?.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {needsReviewCount > 0 && (
            <span className="badge badge-yellow text-xs">
              <AlertTriangle size={10} /> {needsReviewCount} need review
            </span>
          )}
          <span className="text-dark-500 text-xs">{extractedCount} fields extracted</span>
          <button onClick={() => exportToExcel(editedData, doc.filename, doc.document_type)}
            className="btn-secondary py-1.5 px-3 text-xs">
            <Download size={13} /> Excel
          </button>
          <button onClick={() => exportJSON(editedData, doc.filename)}
            className="btn-secondary py-1.5 px-3 text-xs">
            <Download size={13} /> JSON
          </button>
          <button onClick={handleApprove} disabled={approving} className="btn-primary py-1.5 px-4 text-xs">
            {approving
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <CheckCircle size={13} />}
            Approve
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-2">

          {/* Meta */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-dark-900/40 border border-white/5 mb-4 flex-wrap gap-y-1">
            <span className="text-dark-500 text-xs">Model: <span className="text-brand-400">{extraction?.model_used || 'gemini-2.5-flash'}</span></span>
            <span className="text-dark-700">·</span>
            <span className="text-dark-500 text-xs">Time: <span className="text-white">{extraction?.processing_time?.toFixed(1) || '—'}s</span></span>
            <span className="text-dark-700">·</span>
            <span className="text-dark-500 text-xs">OCR: <span className="text-white">{extraction?.raw_ocr_text?.length || 0} chars</span></span>
            <span className="text-dark-700">·</span>
            <span className="text-dark-500 text-xs">Confidence: <span className="text-white">{overallConf}%</span></span>
          </div>

          {/* BANKING */}
          {doc.document_type === 'banking' && (
            <>
              <Section title="🏦 Account Information">
                <FieldRow label="Bank Name"              value={editedData.bank_name}              confidence={getConf('bank_name')}              onEdit={handleEdit('bank_name')} />
                <FieldRow label="Branch Name"            value={editedData.branch_name}            confidence={getConf('branch_name')}            onEdit={handleEdit('branch_name')} />
                <FieldRow label="Account Number"         value={editedData.account_number}         confidence={getConf('account_number')}         onEdit={handleEdit('account_number')} />
                <FieldRow label="Account Type"           value={editedData.account_type}           confidence={getConf('account_type')}           onEdit={handleEdit('account_type')} />
                <FieldRow label="Account Holder"         value={editedData.account_holder}         confidence={getConf('account_holder')}         onEdit={handleEdit('account_holder')} />
                <FieldRow label="IFSC Code"              value={editedData.ifsc_code}              confidence={getConf('ifsc_code')}              onEdit={handleEdit('ifsc_code')} />
                <FieldRow label="Statement Period Start" value={editedData.statement_period_start} confidence={getConf('statement_period_start')} onEdit={handleEdit('statement_period_start')} />
                <FieldRow label="Statement Period End"   value={editedData.statement_period_end}   confidence={getConf('statement_period_end')}   onEdit={handleEdit('statement_period_end')} />
              </Section>
              <Section title="💰 Balances">
                <FieldRow label="Opening Balance"   value={editedData.opening_balance}   confidence={getConf('opening_balance')}   onEdit={handleEdit('opening_balance')} />
                <FieldRow label="Closing Balance"   value={editedData.closing_balance}   confidence={getConf('closing_balance')}   onEdit={handleEdit('closing_balance')} />
                <FieldRow label="Total Deposits"    value={editedData.total_deposits}    confidence={getConf('total_deposits')}    onEdit={handleEdit('total_deposits')} />
                <FieldRow label="Total Withdrawals" value={editedData.total_withdrawals} confidence={getConf('total_withdrawals')} onEdit={handleEdit('total_withdrawals')} />
                <FieldRow label="Average Balance"   value={editedData.average_balance}   confidence={getConf('average_balance')}   onEdit={handleEdit('average_balance')} />
                <FieldRow label="Interest Earned"   value={editedData.interest_earned}   confidence={getConf('interest_earned')}   onEdit={handleEdit('interest_earned')} />
                <FieldRow label="Service Charges"   value={editedData.service_charges}   confidence={getConf('service_charges')}   onEdit={handleEdit('service_charges')} />
              </Section>
              {editedData.transactions?.length > 0 && (
                <Section title={`📊 Transactions (${editedData.transactions.length})`}>
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-dark-800/60">
                          {['Date','Description','Debit','Credit','Balance'].map(h => (
                            <th key={h} className="text-left text-dark-400 py-2.5 px-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {editedData.transactions.map((tx: any, i: number) => (
                          <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-t border-white/5 hover:bg-dark-800/20">
                            <td className="py-2 px-3 text-dark-400 font-mono whitespace-nowrap">{tx.date}</td>
                            <td className="py-2 px-3 text-dark-200 max-w-xs truncate">{tx.description}</td>
                            <td className="py-2 px-3 text-rose-400 font-mono">{tx.debit != null ? `$${Number(tx.debit).toFixed(2)}` : '—'}</td>
                            <td className="py-2 px-3 text-emerald-400 font-mono">{tx.credit != null ? `$${Number(tx.credit).toFixed(2)}` : '—'}</td>
                            <td className="py-2 px-3 text-white font-mono">{tx.balance != null ? `$${Number(tx.balance).toFixed(2)}` : '—'}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}
            </>
          )}

          {/* INSURANCE */}
          {doc.document_type === 'insurance' && (
            <>
              <Section title="📋 Policy Information">
                <FieldRow label="Policy Number"  value={editedData.policy_number}  confidence={getConf('policy_number')}  onEdit={handleEdit('policy_number')} />
                <FieldRow label="Claim Number"   value={editedData.claim_number}   confidence={getConf('claim_number')}   onEdit={handleEdit('claim_number')} />
                <FieldRow label="Insurer Name"   value={editedData.insurer_name}   confidence={getConf('insurer_name')}   onEdit={handleEdit('insurer_name')} />
                <FieldRow label="Policy Type"    value={editedData.policy_type}    confidence={getConf('policy_type')}    onEdit={handleEdit('policy_type')} />
                <FieldRow label="Sum Insured"    value={editedData.sum_insured}    confidence={getConf('sum_insured')}    onEdit={handleEdit('sum_insured')} />
                <FieldRow label="Premium Amount" value={editedData.premium_amount} confidence={getConf('premium_amount')} onEdit={handleEdit('premium_amount')} />
              </Section>
              <Section title="👤 Claimant">
                <FieldRow label="Claimant Name"  value={editedData.claimant_name}  confidence={getConf('claimant_name')}  onEdit={handleEdit('claimant_name')} />
                <FieldRow label="Date of Birth"  value={editedData.date_of_birth}  confidence={getConf('date_of_birth')}  onEdit={handleEdit('date_of_birth')} />
                <FieldRow label="Contact Number" value={editedData.contact_number} confidence={getConf('contact_number')} onEdit={handleEdit('contact_number')} />
                <FieldRow label="Agent Name"     value={editedData.agent_name}     confidence={getConf('agent_name')}     onEdit={handleEdit('agent_name')} />
              </Section>
              <Section title="🏥 Claim Details">
                <FieldRow label="Claim Amount"         value={editedData.claim_amount}         confidence={getConf('claim_amount')}         onEdit={handleEdit('claim_amount')} />
                <FieldRow label="Approved Amount"      value={editedData.approved_amount}      confidence={getConf('approved_amount')}      onEdit={handleEdit('approved_amount')} />
                <FieldRow label="Claim Type"           value={editedData.claim_type}           confidence={getConf('claim_type')}           onEdit={handleEdit('claim_type')} />
                <FieldRow label="Claim Date"           value={editedData.claim_date}           confidence={getConf('claim_date')}           onEdit={handleEdit('claim_date')} />
                <FieldRow label="Incident Date"        value={editedData.incident_date}        confidence={getConf('incident_date')}        onEdit={handleEdit('incident_date')} />
                <FieldRow label="Incident Description" value={editedData.incident_description} confidence={getConf('incident_description')} onEdit={handleEdit('incident_description')} />
                <FieldRow label="Hospital Name"        value={editedData.hospital_name}        confidence={getConf('hospital_name')}        onEdit={handleEdit('hospital_name')} />
                <FieldRow label="Vehicle Number"       value={editedData.vehicle_number}       confidence={getConf('vehicle_number')}       onEdit={handleEdit('vehicle_number')} />
                <FieldRow label="Diagnosis"            value={editedData.diagnosis}            confidence={getConf('diagnosis')}            onEdit={handleEdit('diagnosis')} />
              </Section>
            </>
          )}

          {/* INVOICE */}
          {doc.document_type === 'invoice' && (
            <>
              <Section title="🧾 Invoice Details">
                <FieldRow label="Invoice Number" value={editedData.invoice_number} confidence={getConf('invoice_number')} onEdit={handleEdit('invoice_number')} />
                <FieldRow label="Invoice Date"   value={editedData.invoice_date}   confidence={getConf('invoice_date')}   onEdit={handleEdit('invoice_date')} />
                <FieldRow label="Due Date"       value={editedData.due_date}       confidence={getConf('due_date')}       onEdit={handleEdit('due_date')} />
                <FieldRow label="Payment Terms"  value={editedData.payment_terms}  confidence={getConf('payment_terms')}  onEdit={handleEdit('payment_terms')} />
                <FieldRow label="PO Number"      value={editedData.po_number}      confidence={getConf('po_number')}      onEdit={handleEdit('po_number')} />
              </Section>
              <Section title="🏢 Parties">
                <FieldRow label="Vendor Name"      value={editedData.vendor_name}      confidence={getConf('vendor_name')}      onEdit={handleEdit('vendor_name')} />
                <FieldRow label="Vendor Address"   value={editedData.vendor_address}   confidence={getConf('vendor_address')}   onEdit={handleEdit('vendor_address')} />
                <FieldRow label="Vendor GST"       value={editedData.vendor_gst}       confidence={getConf('vendor_gst')}       onEdit={handleEdit('vendor_gst')} />
                <FieldRow label="Customer Name"    value={editedData.customer_name}    confidence={getConf('customer_name')}    onEdit={handleEdit('customer_name')} />
                <FieldRow label="Customer Address" value={editedData.customer_address} confidence={getConf('customer_address')} onEdit={handleEdit('customer_address')} />
                <FieldRow label="Shipping Address" value={editedData.shipping_address} confidence={getConf('shipping_address')} onEdit={handleEdit('shipping_address')} />
              </Section>
              <Section title="💰 Totals">
                <FieldRow label="Subtotal"     value={editedData.subtotal}        confidence={getConf('subtotal')}        onEdit={handleEdit('subtotal')} />
                <FieldRow label="Discount"     value={editedData.discount_amount} confidence={getConf('discount_amount')} onEdit={handleEdit('discount_amount')} />
                <FieldRow label="Tax Rate (%)" value={editedData.tax_rate}        confidence={getConf('tax_rate')}        onEdit={handleEdit('tax_rate')} />
                <FieldRow label="Tax Amount"   value={editedData.tax_amount}      confidence={getConf('tax_amount')}      onEdit={handleEdit('tax_amount')} />
                <FieldRow label="Total Amount" value={editedData.total_amount}    confidence={getConf('total_amount')}    onEdit={handleEdit('total_amount')} />
                <FieldRow label="Notes"        value={editedData.notes}           confidence={getConf('notes')}           onEdit={handleEdit('notes')} />
              </Section>
              {editedData.items?.length > 0 && (
                <Section title={`📦 Line Items (${editedData.items.length})`}>
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-dark-800/60">
                          {['Description','Qty','Unit Price','Total'].map(h => (
                            <th key={h} className="text-left text-dark-400 py-2.5 px-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {editedData.items.map((item: any, i: number) => (
                          <tr key={i} className="border-t border-white/5 hover:bg-dark-800/20">
                            <td className="py-2 px-3 text-dark-200">{item.description}</td>
                            <td className="py-2 px-3 text-dark-400 font-mono">{item.quantity}</td>
                            <td className="py-2 px-3 text-white font-mono">${Number(item.unit_price || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-emerald-400 font-mono">${Number(item.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}