import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Filter, Clock } from 'lucide-react';
import { getAuditLogs } from '../services/api';
import { formatDistanceToNow, format } from 'date-fns';

const ACTION_CFG: Record<string,{icon:string;color:string;label:string}> = {
  uploaded:             {icon:'📤',color:'bg-brand-950/40 border-brand-800/30',   label:'Document Uploaded'},
  processing_started:   {icon:'⚙️',color:'bg-violet-950/40 border-violet-800/30', label:'Processing Started'},
  extraction_completed: {icon:'🧠',color:'bg-emerald-950/40 border-emerald-800/30',label:'Extraction Completed'},
  approved:             {icon:'✅',color:'bg-emerald-950/40 border-emerald-800/30',label:'Approved'},
  corrected:            {icon:'✏️',color:'bg-amber-950/40 border-amber-800/30',   label:'Field Corrected'},
  rejected:             {icon:'❌',color:'bg-rose-950/40 border-rose-800/30',     label:'Rejected'},
  deleted:              {icon:'🗑️',color:'bg-dark-800/60 border-dark-700/30',     label:'Deleted'},
};

const DEMO_LOGS = [
  {id:'1',document_id:'doc-1',action:'uploaded',           user:'admin@docusense.ai',details:{filename:'bank_statement.pdf',size:245000},timestamp:new Date(Date.now()-1800000).toISOString()},
  {id:'2',document_id:'doc-1',action:'processing_started', user:'system',            details:{model:'gemini-1.5-flash'},              timestamp:new Date(Date.now()-1790000).toISOString()},
  {id:'3',document_id:'doc-1',action:'extraction_completed',user:'system',           details:{confidence:88.5,fields:10},             timestamp:new Date(Date.now()-1770000).toISOString()},
  {id:'4',document_id:'doc-1',action:'approved',           user:'admin@docusense.ai',details:{method:'manual_review'},                timestamp:new Date(Date.now()-1200000).toISOString()},
  {id:'5',document_id:'doc-2',action:'uploaded',           user:'admin@docusense.ai',details:{filename:'insurance_claim.jpg'},         timestamp:new Date(Date.now()-3600000).toISOString()},
  {id:'6',document_id:'doc-2',action:'corrected',          user:'admin@docusense.ai',details:{field:'claim_amount',original:'5000',corrected:'5500'},timestamp:new Date(Date.now()-900000).toISOString()},
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getAuditLogs().then(r=>setLogs(r.data?.logs||[])).catch(()=>setLogs(DEMO_LOGS)).finally(()=>setLoading(false));
  }, []);

  const filtered = filter==='all' ? logs : logs.filter(l=>l.action===filter);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-dark-400 text-sm mt-0.5">Complete audit trail of all document actions</p>
        </div>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="input-field py-2 w-auto">
          <option value="all">All Actions</option>
          <option value="uploaded">Uploads</option>
          <option value="extraction_completed">Extractions</option>
          <option value="approved">Approvals</option>
          <option value="corrected">Corrections</option>
        </select>
      </motion.div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
      ) : filtered.length===0 ? (
        <div className="card p-12 flex flex-col items-center gap-4">
          <ScrollText size={40} className="text-dark-700"/>
          <p className="text-dark-500">No audit logs yet</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-white/5"/>
          <div className="space-y-3 ml-3">
            {filtered.map((log,i)=>{
              const cfg = ACTION_CFG[log.action]||{icon:'📋',color:'bg-dark-800/60 border-dark-700/30',label:log.action};
              return (
                <motion.div key={log.id} initial={{ opacity:0, x:-15 }} animate={{ opacity:1, x:0 }}
                  transition={{ delay:i*0.05 }}
                  className={`ml-6 flex gap-4 p-4 rounded-xl border ${cfg.color} relative`}>
                  <div className="absolute -left-[27px] top-5 w-5 h-5 rounded-full bg-dark-900 border-2 border-dark-700 flex items-center justify-center text-xs">
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{cfg.label}</span>
                      {log.details?.filename && <span className="text-dark-400 text-xs truncate max-w-[200px]">— {log.details.filename}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-dark-500 text-xs">{log.user}</span>
                      <span className="text-dark-700 text-xs">·</span>
                      <span className="text-dark-500 text-xs flex items-center gap-1">
                        <Clock size={10}/>{formatDistanceToNow(new Date(log.timestamp),{addSuffix:true})}
                      </span>
                    </div>
                    {Object.keys(log.details||{}).length>0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(log.details).slice(0,3).map(([k,v])=>(
                          <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800/60 text-dark-400 border border-white/5 font-mono">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-dark-600 text-xs font-mono flex-shrink-0 hidden sm:block">
                    {format(new Date(log.timestamp),'HH:mm:ss')}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}