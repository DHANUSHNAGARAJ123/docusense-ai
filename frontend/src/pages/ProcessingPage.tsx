import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, FileText, Cpu, ScanLine, BarChart3, Brain, Zap, Shield } from 'lucide-react';
import { getProcessingStatus } from '../services/api';

const STEPS = [
  { id: 'upload',             label: 'File Received',       icon: FileText,  desc: 'Document stored securely' },
  { id: 'preprocessing',      label: 'Image Enhancement',   icon: Cpu,       desc: 'Denoise, deskew, rotate correction' },
  { id: 'ocr',                label: 'OCR Extraction',      icon: ScanLine,  desc: 'Tesseract text extraction' },
  { id: 'layout',             label: 'Layout Detection',    icon: BarChart3, desc: 'Detecting tables & sections' },
  { id: 'llm_extraction',     label: 'AI Data Extraction',  icon: Brain,     desc: 'Gemini AI structured extraction' },
  { id: 'confidence_scoring', label: 'Confidence Scoring',  icon: Zap,       desc: 'Per-field confidence calculation' },
  { id: 'validation',         label: 'Validation Check',    icon: Shield,    desc: 'Rule-based field validation' },
];

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [dots, setDots] = useState('');
  const intervalRef = useRef<any>(null);
  const simRef = useRef<any>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    const d = setInterval(() => setDots(p => p.length >= 3 ? '' : p + '.'), 500);
    return () => clearInterval(d);
  }, []);

  // Simulate steps visually (always runs so UI never freezes)
  const startSimulation = (startFrom = 0) => {
    if (simRef.current) return;
    let idx = startFrom;
    simRef.current = setInterval(() => {
      if (idx < STEPS.length) {
        setCurrentStep(idx);
        idx++;
      }
    }, 2000);
  };

  // Poll backend
  useEffect(() => {
    if (!id) return;
    startSimulation(0);

    intervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      try {
        const res = await getProcessingStatus(id);
        const data = res.data;

        if (data.status === 'completed' || data.status === 'needs_review') {
          clearInterval(intervalRef.current);
          clearInterval(simRef.current);
          setCurrentStep(STEPS.length);
          setDone(true);
          setTimeout(() => navigate(`/results/${id}`), 800);
          return;
        }

        if (data.status === 'failed') {
          clearInterval(intervalRef.current);
          clearInterval(simRef.current);
          setError(data.error || 'Processing failed. Please try again.');
          return;
        }

        // If backend says processing, speed up simulation
        if (data.status === 'processing' && data.progress > 0) {
          const backendStep = Math.floor((data.progress / 100) * STEPS.length);
          setCurrentStep(prev => Math.max(prev, backendStep));
        }

        // Safety: if polling > 60s and still no result, go to results anyway
        if (pollCountRef.current > 40) {
          clearInterval(intervalRef.current);
          clearInterval(simRef.current);
          navigate(`/results/${id}`);
        }

      } catch {
        // Backend error — just keep simulating, redirect after sim ends
        if (pollCountRef.current > 20) {
          clearInterval(intervalRef.current);
          clearInterval(simRef.current);
          navigate(`/results/${id}`);
        }
      }
    }, 1500);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(simRef.current);
    };
  }, [id]);

  // When simulation reaches end, redirect
  useEffect(() => {
    if (currentStep >= STEPS.length && !done) {
      clearInterval(intervalRef.current);
      clearInterval(simRef.current);
      setTimeout(() => navigate(`/results/${id}`), 600);
    }
  }, [currentStep]);

  const progress = Math.round((Math.min(currentStep, STEPS.length) / STEPS.length) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
        <div className="text-center mb-10">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-5 shadow-glow">
            <Brain size={28} className="text-white" />
          </motion.div>
          <h1 className="font-display text-2xl font-bold text-white">
            {error ? 'Processing Failed' : done ? 'Complete! Redirecting...' : `Processing Document${dots}`}
          </h1>
          <p className="text-dark-400 text-sm mt-2">
            {error || 'AI is analyzing your document with OCR and Gemini'}
          </p>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-sm">Overall Progress</span>
            <span className="text-brand-400 text-sm font-mono">{progress}%</span>
          </div>
          <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
              className="h-full bg-gradient-brand rounded-full relative">
              {progress > 0 && progress < 100 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-glow" />
              )}
            </motion.div>
          </div>
        </div>

        <div className="space-y-2">
          {STEPS.map((step, i) => {
            const isDone   = i < currentStep;
            const isActive = i === currentStep;
            const isPending = i > currentStep;
            return (
              <motion.div key={step.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                  isActive  ? 'bg-brand-950/40 border-brand-700/40 shadow-glow'
                : isDone   ? 'bg-emerald-950/20 border-emerald-900/20'
                : isPending ? 'bg-dark-900/40 border-white/5 opacity-40'
                : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-brand-900/60' : isDone ? 'bg-emerald-900/40' : 'bg-dark-800'}`}>
                  {isDone
                    ? <CheckCircle size={16} className="text-emerald-400" />
                    : isActive
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                        <step.icon size={16} className="text-brand-400" />
                      </motion.div>
                    : <step.icon size={16} className="text-dark-600" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isActive ? 'text-brand-300' : isDone ? 'text-emerald-300' : 'text-dark-500'}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-dark-400 text-xs mt-0.5">
                      {step.desc}
                    </motion.p>
                  )}
                </div>
                {isActive && (
                  <div className="flex gap-1">
                    {[0, 1, 2].map(j => (
                      <motion.div key={j}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity, delay: j * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
            <p className="text-rose-400 text-sm mb-4">{error}</p>
            <button onClick={() => navigate('/upload')} className="btn-primary">Try Again</button>
          </motion.div>
        )}

        <p className="text-center text-dark-600 text-xs mt-6">
          Document ID: <span className="font-mono text-dark-400">{id}</span>
        </p>
      </motion.div>
    </div>
  );
}