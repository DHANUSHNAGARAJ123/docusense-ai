// frontend/src/pages/LoginPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, Brain, BarChart3, CheckCircle, Shield, UserPlus, LogIn } from 'lucide-react';
import { registerUser, loginUser, saveSession, getSession } from '../services/firebase';

const FEATURES = [
  { icon: Brain,       label: 'AI-Powered Extraction', desc: 'Gemini 2.5 Flash accuracy' },
  { icon: Shield,      label: 'Confidence Scoring',    desc: 'Per-field validation' },
  { icon: BarChart3,   label: 'Analytics Dashboard',   desc: 'Real-time insights' },
  { icon: CheckCircle, label: 'Audit Trail',            desc: 'Complete compliance' },
];

const FLOATING_DOCS = [
  { emoji: '🏦', label: 'bank_statement_jan.pdf', conf: 94 },
  { emoji: '🏥', label: 'insurance_claim.jpg',    conf: 68 },
  { emoji: '🧾', label: 'invoice_vendor.png',     conf: 91 },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [form, setForm]         = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [activeDoc, setActiveDoc] = useState(0);

  useEffect(() => {
    if (getSession()) navigate('/dashboard');
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveDoc(p => (p + 1) % FLOATING_DOCS.length), 2500);
    return () => clearInterval(t);
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const validateLogin = () => {
    const errs: Record<string, string> = {};
    if (!form.email)    errs.email    = 'Email required';
    if (!form.password) errs.password = 'Password required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateRegister = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim())               errs.name            = 'Name required';
    if (!form.email)                     errs.email           = 'Email required';
    if (!form.password)                  errs.password        = 'Password required';
    else if (form.password.length < 6)   errs.password        = 'Min 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    try {
      const user = await loginUser(form.email, form.password);
      saveSession(user);
      toast.success(`Welcome back, ${user.displayName || form.email.split('@')[0]}! 🚀`);
      navigate('/dashboard');
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' ? 'Invalid email or password' :
        err.code === 'auth/user-not-found'     ? 'Account not found' :
        err.code === 'auth/wrong-password'     ? 'Wrong password' :
        'Login failed. Try again.';
      setErrors({ password: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setLoading(true);
    try {
      const user = await registerUser(form.email, form.password, form.name);
      saveSession(user);
      toast.success(`Account created! Welcome, ${form.name}! 🎉`);
      navigate('/dashboard');
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'Email already registered' :
        err.code === 'auth/weak-password'         ? 'Password too weak (min 6 chars)' :
        'Registration failed. Try again.';
      setErrors({ email: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setErrors({});
    setForm({ email: '', password: '', confirmPassword: '', name: '' });
  };

  return (
    <div className="min-h-screen flex bg-dark-950 overflow-hidden">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-[52%] flex-col relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-brand-950/30 to-dark-950" />
          <motion.div animate={{ scale: [1,1.2,1], opacity: [0.3,0.5,0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />
          <motion.div animate={{ scale: [1.2,1,1.2], opacity: [0.2,0.4,0.2] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col h-full p-14">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
              <Zap size={22} className="text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white">
              DocuSense <span className="text-brand-400">AI</span>
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="mb-10">
              <h1 className="font-display text-5xl font-bold text-white leading-tight mb-4">
                Intelligent<br />
                <span className="text-transparent bg-clip-text bg-gradient-brand">Document</span><br />
                Processing
              </h1>
              <p className="text-dark-300 text-lg max-w-sm">
                Extract, analyze and validate documents with AI precision.
              </p>
            </motion.div>

            <div className="space-y-3 mb-10">
              {FEATURES.map((f, i) => (
                <motion.div key={f.label} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
                  transition={{ delay: 0.4 + i * 0.1 }} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-950/60 border border-brand-800/40 flex items-center justify-center">
                    <f.icon size={15} className="text-brand-400" />
                  </div>
                  <span className="text-white text-sm font-medium">{f.label}</span>
                  <span className="text-dark-500 text-sm">— {f.desc}</span>
                </motion.div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-dark-500 text-xs uppercase tracking-widest">Live Processing</p>
              <div className="relative h-24">
                <AnimatePresence mode="wait">
                  {FLOATING_DOCS.map((doc, i) => i === activeDoc ? (
                    <motion.div key={doc.label}
                      initial={{ opacity:0, y:10, scale:0.95 }}
                      animate={{ opacity:1, y:0, scale:1 }}
                      exit={{ opacity:0, y:-10, scale:0.95 }}
                      className="absolute inset-0 card p-4 flex items-center gap-4 border border-white/5">
                      <span className="text-2xl">{doc.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{doc.label}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="confidence-bar flex-1">
                            <motion.div initial={{ width:0 }} animate={{ width:`${doc.conf}%` }}
                              transition={{ duration:0.8 }} className="h-full rounded-full"
                              style={{ background: doc.conf>90?'#34d399':doc.conf>75?'#fbbf24':'#fb7185' }} />
                          </div>
                          <span className="text-xs font-mono text-dark-400">{doc.conf}%</span>
                        </div>
                      </div>
                      <span className={`badge text-xs ${doc.conf>75?'badge-green':'badge-yellow'}`}>
                        {doc.conf>75?'Approved':'Review'}
                      </span>
                    </motion.div>
                  ) : null)}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex gap-8 pt-6 border-t border-white/5">
            {[{val:'99.2%',label:'Accuracy'},{val:'<30s',label:'Processing'},{val:'3 Types',label:'Documents'}].map(s=>(
              <div key={s.label}>
                <div className="font-display text-2xl font-bold text-white">{s.val}</div>
                <div className="text-dark-500 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[48%] flex items-center justify-center p-8">
        <motion.div initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} className="w-full max-w-md">

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">DocuSense AI</span>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-dark-900/60 p-1 rounded-xl border border-white/5 mb-6">
            <button onClick={() => switchMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
                ${mode==='login' ? 'bg-brand-950/80 text-brand-300 border border-brand-800/40' : 'text-dark-500 hover:text-dark-300'}`}>
              <LogIn size={15} /> Sign In
            </button>
            <button onClick={() => switchMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
                ${mode==='register' ? 'bg-brand-950/80 text-brand-300 border border-brand-800/40' : 'text-dark-500 hover:text-dark-300'}`}>
              <UserPlus size={15} /> Register
            </button>
          </div>

          <div className="gradient-border">
            <div className="bg-dark-900/90 backdrop-blur-xl rounded-2xl p-8">
              <AnimatePresence mode="wait">

                {/* LOGIN */}
                {mode === 'login' && (
                  <motion.div key="login" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}>
                    <div className="mb-6">
                      <h2 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h2>
                      <p className="text-dark-400 text-sm">Sign in to your account</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4" noValidate>
                      <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1.5">Email</label>
                        <input type="email" value={form.email} onChange={handleChange('email')}
                          placeholder="you@example.com"
                          className={`input-field ${errors.email ? 'border-rose-500/50' : ''}`} />
                        {errors.email && <p className="mt-1 text-rose-400 text-xs">⚠ {errors.email}</p>}
                      </div>
                      <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1.5">Password</label>
                        <div className="relative">
                          <input type={showPass?'text':'password'} value={form.password}
                            onChange={handleChange('password')} placeholder="••••••••"
                            className={`input-field pr-11 ${errors.password ? 'border-rose-500/50' : ''}`} />
                          <button type="button" onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 p-1">
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.password && <p className="mt-1 text-rose-400 text-xs">⚠ {errors.password}</p>}
                      </div>
                      <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex items-center justify-center gap-2">
                        {loading
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
                          : <><LogIn size={16} />Sign In</>}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* REGISTER */}
                {mode === 'register' && (
                  <motion.div key="register" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                    <div className="mb-6">
                      <h2 className="font-display text-2xl font-bold text-white mb-1">Create account</h2>
                      <p className="text-dark-400 text-sm">Join DocuSense AI today</p>
                    </div>
                    <form onSubmit={handleRegister} className="space-y-4" noValidate>
                      <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1.5">Full Name</label>
                        <input type="text" value={form.name} onChange={handleChange('name')}
                          placeholder="Your full name"
                          className={`input-field ${errors.name ? 'border-rose-500/50' : ''}`} />
                        {errors.name && <p className="mt-1 text-rose-400 text-xs">⚠ {errors.name}</p>}
                      </div>
                      <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1.5">Email</label>
                        <input type="email" value={form.email} onChange={handleChange('email')}
                          placeholder="you@example.com"
                          className={`input-field ${errors.email ? 'border-rose-500/50' : ''}`} />
                        {errors.email && <p className="mt-1 text-rose-400 text-xs">⚠ {errors.email}</p>}
                      </div>
                      <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1.5">Password</label>
                        <div className="relative">
                          <input type={showPass?'text':'password'} value={form.password}
                            onChange={handleChange('password')} placeholder="Min 6 characters"
                            className={`input-field pr-11 ${errors.password ? 'border-rose-500/50' : ''}`} />
                          <button type="button" onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 p-1">
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.password && <p className="mt-1 text-rose-400 text-xs">⚠ {errors.password}</p>}
                      </div>
                      <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1.5">Confirm Password</label>
                        <input type="password" value={form.confirmPassword}
                          onChange={handleChange('confirmPassword')} placeholder="••••••••"
                          className={`input-field ${errors.confirmPassword ? 'border-rose-500/50' : ''}`} />
                        {errors.confirmPassword && <p className="mt-1 text-rose-400 text-xs">⚠ {errors.confirmPassword}</p>}
                      </div>
                      <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex items-center justify-center gap-2">
                        {loading
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
                          : <><UserPlus size={16} />Create Account</>}
                      </button>
                    </form>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>

          <p className="text-center text-dark-600 text-xs mt-6">
            🔒 Secured with Firebase Authentication
          </p>
        </motion.div>
      </div>
    </div>
  );
}