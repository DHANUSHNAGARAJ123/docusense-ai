import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, CheckCircle, AlertCircle, Building2, Heart, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadDocument } from '../services/api';

const DOC_TYPES = [
  {
    id: 'banking', icon: Building2, emoji: '🏦', label: 'Bank Statement',
    desc: 'Account statements, transaction history',
    fields: ['Account Number', 'Balance', 'Transactions'],
    color: 'from-brand-500/20 to-brand-600/10 border-brand-500/30', iconColor: 'text-brand-400',
  },
  {
    id: 'insurance', icon: Heart, emoji: '🏥', label: 'Insurance Claim',
    desc: 'Health, vehicle, property claims',
    fields: ['Policy Number', 'Claim Amount', 'Incident Date'],
    color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30', iconColor: 'text-rose-400',
  },
  {
    id: 'invoice', icon: Receipt, emoji: '🧾', label: 'Invoice',
    desc: 'Vendor invoices, billing documents',
    fields: ['Invoice Number', 'Total Amount', 'Line Items'],
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30', iconColor: 'text-emerald-400',
  },
];

const MAX_SIZE = 50 * 1024 * 1024;
const ACCEPTED = { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg','.jpeg'], 'image/png': ['.png'] };

export default function UploadPage() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState('banking');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      const code = rejected[0].errors[0]?.code;
      if (code === 'file-too-large') toast.error('File too large! Max 50MB allowed');
      else if (code === 'file-invalid-type') toast.error('Only PDF, JPG, PNG files accepted');
      else toast.error('File rejected');
      return;
    }
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop, accept: ACCEPTED, maxSize: MAX_SIZE, maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first');
    setUploading(true); setProgress(0);
    try {
      const res = await uploadDocument(file, docType, (pct) => setProgress(pct));
      const docId = res.data?.document_id;
      toast.success('Document uploaded! Processing started 🚀');
      navigate(`/processing/${docId}`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  const formatSize = (b: number) => b < 1024*1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/1024/1024).toFixed(1)} MB`;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-white">Upload Document</h1>
        <p className="text-dark-400 text-sm mt-1">Select document type and upload for AI extraction</p>
      </motion.div>

      {/* Step 1 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-sm font-medium text-dark-400 uppercase tracking-widest mb-4">Step 1 — Document Type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DOC_TYPES.map((type) => (
            <motion.button key={type.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => setDocType(type.id)}
              className={`relative p-5 rounded-2xl border text-left transition-all duration-200 ${
                docType === type.id ? `bg-gradient-to-br ${type.color}` : 'bg-dark-900/60 border-white/5 hover:border-white/15'
              }`}>
              {docType === type.id && (
                <motion.div layoutId="selected" className="absolute top-3 right-3" initial={false}>
                  <CheckCircle size={16} className={type.iconColor} />
                </motion.div>
              )}
              <span className="text-3xl mb-3 block">{type.emoji}</span>
              <p className="text-white font-semibold text-sm">{type.label}</p>
              <p className="text-dark-400 text-xs mt-1">{type.desc}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {type.fields.map((f) => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800/60 text-dark-400 border border-white/5">{f}</span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Step 2 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-sm font-medium text-dark-400 uppercase tracking-widest mb-4">Step 2 — Upload File</h2>
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
                ${isDragActive && !isDragReject ? 'border-brand-500 bg-brand-950/20' : ''}
                ${isDragReject ? 'border-rose-500 bg-rose-950/20' : ''}
                ${!isDragActive ? 'border-dark-700 hover:border-brand-600/50 bg-dark-900/40' : ''}`}>
              <input {...getInputProps()} />
              {isDragActive && !isDragReject && <div className="scan-line" />}
              <motion.div animate={{ y: isDragActive ? [-5,5,-5] : 0 }}
                transition={{ duration: 1, repeat: isDragActive ? Infinity : 0 }}
                className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDragReject ? 'bg-rose-950/60' : 'bg-brand-950/60'}`}>
                  {isDragReject
                    ? <AlertCircle size={28} className="text-rose-400" />
                    : <Upload size={28} className={isDragActive ? 'text-brand-400' : 'text-dark-500'} />}
                </div>
                {isDragReject ? <p className="text-rose-400 font-medium">Invalid file type!</p>
                 : isDragActive ? <p className="text-brand-400 font-semibold text-lg">Drop it here!</p>
                 : <>
                    <div>
                      <p className="text-white font-semibold text-lg">Drop your document here</p>
                      <p className="text-dark-400 text-sm mt-1">or <span className="text-brand-400 cursor-pointer hover:text-brand-300">browse files</span></p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                      {['PDF','JPG','PNG'].map(e=><span key={e} className="badge badge-blue text-xs">{e}</span>)}
                      <span className="text-dark-600 text-xs">Max 50MB</span>
                    </div>
                   </>}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} className="card p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-950/60 border border-brand-800/40 flex items-center justify-center flex-shrink-0">
                <FileText size={24} className="text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{file.name}</p>
                <p className="text-dark-500 text-sm mt-0.5">{formatSize(file.size)} · {file.type.split('/')[1].toUpperCase()}</p>
                {file.size <= MAX_SIZE
                  ? <div className="flex items-center gap-1 mt-1"><CheckCircle size={12} className="text-emerald-400" /><span className="text-emerald-400 text-xs">Ready to upload</span></div>
                  : <div className="flex items-center gap-1 mt-1"><AlertCircle size={12} className="text-rose-400" /><span className="text-rose-400 text-xs">File too large</span></div>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-2 rounded-lg text-dark-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Progress */}
      <AnimatePresence>
        {uploading && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="card p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm font-medium">Uploading...</p>
              <span className="text-brand-400 text-sm font-mono">{progress}%</span>
            </div>
            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
              <motion.div animate={{ width: `${progress}%` }} className="h-full bg-gradient-brand rounded-full" transition={{ duration: 0.3 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="flex items-center justify-between">
        <div className="text-dark-500 text-xs">
          Type: <span className="text-brand-400 font-medium capitalize">{docType}</span>
        </div>
        <div className="flex gap-3">
          {file && <button onClick={() => setFile(null)} className="btn-secondary">Clear</button>}
          <button onClick={handleUpload} disabled={!file || uploading || (file?.size ?? 0) > MAX_SIZE} className="btn-primary">
            {uploading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</>
              : <><Upload size={15} />Process Document</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}