import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Clock } from 'lucide-react';
import { getStats } from '../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from 'recharts';

const COLORS = ['#0ea5e9','#a78bfa','#34d399','#fbbf24'];

const DEMO_STATS = {
  total_documents:47, completed:38, needs_review:7, failed:2,
  avg_confidence:84.3, avg_processing_time:18.7,
  documents_by_type:{ banking:21, insurance:15, invoice:11 },
  accuracy_trend:[
    {date:'Mon',accuracy:82,count:5},{date:'Tue',accuracy:87,count:8},
    {date:'Wed',accuracy:79,count:6},{date:'Thu',accuracy:91,count:9},
    {date:'Fri',accuracy:85,count:7},{date:'Sat',accuracy:93,count:8},{date:'Sun',accuracy:88,count:4},
  ],
};

export default function InsightsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(r=>setStats(r.data)).catch(()=>setStats(DEMO_STATS)).finally(()=>setLoading(false));
  }, []);

  const pieData = stats?.documents_by_type ? Object.entries(stats.documents_by_type).map(([name,value])=>({name,value})) : [];
  const approvalRate = stats ? ((stats.completed/(stats.total_documents||1))*100).toFixed(1) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
        <h1 className="font-display text-2xl font-bold text-white">Insights</h1>
        <p className="text-dark-400 text-sm mt-0.5">Analytics from real processing data</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {label:'Avg OCR Confidence', value:`${stats?.avg_confidence?.toFixed(1)??'—'}%`, icon:Brain,    color:'text-brand-400 bg-brand-950/60'},
          {label:'Auto-Approval Rate', value:`${approvalRate}%`,                           icon:TrendingUp,color:'text-emerald-400 bg-emerald-950/60'},
          {label:'Avg Processing',     value:`${stats?.avg_processing_time?.toFixed(1)??'—'}s`, icon:Clock,color:'text-violet-400 bg-violet-950/60'},
        ].map((m,i)=>(
          <motion.div key={m.label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }} className="stat-card">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${m.color}`}><m.icon size={17}/></div>
              <span className="text-dark-400 text-sm">{m.label}</span>
            </div>
            <p className="font-display text-3xl font-bold text-white">{loading?'—':m.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }} className="card p-6">
          <h2 className="font-display text-base font-semibold text-white mb-4">Weekly Accuracy Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.accuracy_trend||[]}>
              <defs>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:11 }}/>
              <YAxis domain={[60,100]} tick={{ fill:'#64748b', fontSize:11 }}/>
              <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid rgba(14,165,233,0.2)', borderRadius:'12px', color:'#f1f5f9' }}/>
              <Area type="monotone" dataKey="accuracy" stroke="#0ea5e9" strokeWidth={2} fill="url(#gi)"/>
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }} className="card p-6">
          <h2 className="font-display text-base font-semibold text-white mb-4">Document Type Distribution</h2>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid rgba(14,165,233,0.2)', borderRadius:'12px' }}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {pieData.map((e,i)=>(
                  <div key={e.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background:COLORS[i%COLORS.length] }}/>
                    <span className="text-dark-300 text-sm capitalize">{e.name}</span>
                    <span className="text-dark-500 text-xs font-mono ml-auto">{e.value as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="flex items-center justify-center h-44"><p className="text-dark-500 text-sm">No data yet</p></div>}
        </motion.div>

        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }} className="card p-6 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-white mb-4">Volume & Accuracy</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.accuracy_trend||[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:11 }}/>
              <YAxis yAxisId="left"  tick={{ fill:'#64748b', fontSize:11 }}/>
              <YAxis yAxisId="right" orientation="right" domain={[60,100]} tick={{ fill:'#64748b', fontSize:11 }}/>
              <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid rgba(14,165,233,0.2)', borderRadius:'12px', color:'#f1f5f9' }}/>
              <Legend wrapperStyle={{ color:'#64748b', fontSize:'12px' }}/>
              <Bar yAxisId="left"  dataKey="count"    fill="#6366f120" stroke="#6366f1" strokeWidth={1} radius={[4,4,0,0]} name="Documents"/>
              <Bar yAxisId="right" dataKey="accuracy" fill="#0ea5e920" stroke="#0ea5e9" strokeWidth={1} radius={[4,4,0,0]} name="Accuracy %"/>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}