import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom';

const getAdminApi = () => {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return '/api';
  }
  return '/api';
};

const API = getAdminApi();

const getUploadUrl = (urlPath: string) => {
  if (!urlPath) return '';
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath;
  const base = API.replace(/\/api\/?$/, '');
  return `${base}${urlPath.startsWith('/') ? urlPath : '/' + urlPath}`;
};



/* ─── Blob Download Helper ────────────────────────────────────────────────── */
const downloadFile = async (url: string, name: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { alert('Download failed. Please try again.'); }
};

/* ─── Inline SVG Icons (proper, clean) ───────────────────────────────────── */
const Icons = {
  Sun: () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="6" fill="#EAB308">
        <animate attributeName="r" values="5;7;5" dur="3s" repeatCount="indefinite" />
      </circle>
      {[0,45,90,135,180,225,270,315].map((deg, i) => (
        <line key={i}
          x1={16 + 9 * Math.cos(deg * Math.PI / 180)}
          y1={16 + 9 * Math.sin(deg * Math.PI / 180)}
          x2={16 + 13 * Math.cos(deg * Math.PI / 180)}
          y2={16 + 13 * Math.sin(deg * Math.PI / 180)}
          stroke="#EAB308" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="1;0.3;1" dur={`${1.5 + i * 0.15}s`} repeatCount="indefinite" />
        </line>
      ))}
    </svg>
  ),
  Dashboard: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12.01"/>
    </svg>
  ),
  Zap: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  CreditCard: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  Bell: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  RotateCw: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  TrendUp: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Key: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 2l-2 2m-1.5 1.5L16 7l-1.5-1.5L13 7l-1-1-1.5 1.5A7 7 0 102 14a7 7 0 0010.5-6.06L21 2z"/>
    </svg>
  ),
  FileText: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Upload: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Gift: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  Truck: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
};

/* ─── Status Badge ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    'Document Upload': { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500' },
    'UPCL Approval':   { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500'    },
    'Loan Apply':      { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'  },
    'Loan Process':    { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
    'Installation':    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500'},
  };
  const s = map[status] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text} border border-current/10`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {status || 'Pending'}
    </span>
  );
}

/* ─── Stat Card ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, gradient, icon }: {
  label: string; value: number; sub: string; gradient: string; icon: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-xl ${gradient} hover:-translate-y-1 transition-transform duration-300 cursor-default`}>
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
      <div className="absolute -bottom-8 -left-4 w-20 h-20 bg-white/5 rounded-full" />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-sm">{icon}</div>
          <div className="flex items-center gap-1 text-white/70 text-xs">
            <Icons.TrendUp />{sub}
          </div>
        </div>
        <p className="text-white/70 text-sm font-medium">{label}</p>
        <p className="text-4xl font-black mt-1">{value}</p>
      </div>
    </div>
  );
}

/* ─── Workflow Step Access Configuration ───────────────────────────────────── */
const PATH_ALLOWED_STEPS: Record<string, number[]> = {
  '/upcl':         [1],
  '/registration': [1],
  '/quotation':    [2],
  '/agreement':    [3],
  '/loan':         [4],
  '/bank':         [5],
  '/loan-disbursed': [5],
  '/dispatch':     [6],
  '/store':        [6],
  '/installation': [7],
  '/upload-inst':  [9],
  '/subsidy':      [10],
};

const ROLE_ALLOWED_STEPS: Record<string, number[]> = {
  upcl:            [1],
  bo_registration: [1],
  bo_quotation:    [2],
  bo_agreement:    [3],
  bo_loan:         [4],
  bank:            [5, 8],
  store:           [6],
  installation:    [7],
  bo_upload_inst:  [9],
  bo_subsidy:      [10],
};

const WORKFLOW_STEPS = [
  { id: 1, status: 'Registration',          desc: 'Files login & details fill (UPCL if transfer)', role: 'bo_registration', dept: 'Registration / UPCL' },
  { id: 2, status: 'Quotation + Sign',      desc: 'Quotation + upload sign document', role: 'bo_quotation', dept: 'Quotation (BO)' },
  { id: 3, status: 'Agreement',             desc: 'Upload agreement + quotation', role: 'bo_agreement', dept: 'Agreement (BO)' },
  { id: 4, status: 'Loan Apply',            desc: 'Loan apply submitted', role: 'bo_loan', dept: 'Loan Apply (BO)' },
  { id: 5, status: 'Loan Disbursed',        desc: 'Loan disbursed (or tag with remark)', role: 'bank', dept: 'Bank (1st Disbursed)' },
  { id: 6, status: 'Material Dispatch',     desc: 'Materials dispatched to site', role: 'store', dept: 'Store / Dispatch' },
  { id: 7, status: 'Complete Installation', desc: 'Panel & Inverter # with Geotag photo', role: 'installation', dept: 'Installation' },
  { id: 8, status: 'Second Disbursed',      desc: 'Second loan amount disbursed', role: 'bank', dept: 'Bank (2nd Disbursed)' },
  { id: 9, status: 'Upload Inst. (DCR)',    desc: 'Upload installation with DCR', role: 'bo_upload_inst', dept: 'Upload Inst. (BO)' },
  { id: 10, status: 'Subsidy Redeem',       desc: 'Subsidy claimed and redeemed', role: 'bo_subsidy', dept: 'Subsidy Redeem (BO)' },
];

function getAllowedSteps(pathname: string, user?: any): number[] {
  // If user has a department role (not admin), their role strictly defines what they can mark:
  if (user && user.role && user.role !== 'admin') {
    return ROLE_ALLOWED_STEPS[user.role] || [];
  }
  // If user is on a specific BO department path, only that department's step(s) can be marked:
  if (PATH_ALLOWED_STEPS[pathname]) {
    return PATH_ALLOWED_STEPS[pathname];
  }
  // Master overview (/ or /projects) for Admin: all steps allowed
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

const TRANSFER_DESTINATIONS = [
  { key: 'step_1_reg', id: 1, is_upcl: false, status: 'Registration', desc: 'Files login & details review', dept: 'Registration (BO)' },
  { key: 'step_1_upcl', id: 1, is_upcl: true, status: 'UPCL Verification', desc: 'Electricity Bill / Name / Meter Issue', dept: 'UPCL Department' },
  { key: 'step_2', id: 2, is_upcl: false, status: 'Quotation + Sign', desc: 'Quotation + upload sign document', dept: 'Quotation (BO)' },
  { key: 'step_3', id: 3, is_upcl: false, status: 'Agreement', desc: 'Upload agreement + quotation', dept: 'Agreement (BO)' },
  { key: 'step_4', id: 4, is_upcl: false, status: 'Loan Apply', desc: 'Loan apply submitted', dept: 'Loan Apply (BO)' },
  { key: 'step_5', id: 5, is_upcl: false, status: 'Loan Disbursed', desc: 'Loan disbursed (or tag with remark)', dept: 'Bank (1st Disbursed)' },
  { key: 'step_6', id: 6, is_upcl: false, status: 'Material Dispatch', desc: 'Materials dispatched to site', dept: 'Store / Dispatch' },
  { key: 'step_7', id: 7, is_upcl: false, status: 'Complete Installation', desc: 'Panel & Inverter # with Geotag photo', dept: 'Installation' },
  { key: 'step_8', id: 8, is_upcl: false, status: 'Second Disbursed', desc: 'Second loan amount disbursed', dept: 'Bank (2nd Disbursed)' },
  { key: 'step_9', id: 9, is_upcl: false, status: 'Upload Inst. (DCR)', desc: 'Upload installation with DCR', dept: 'Upload Inst. (BO)' },
  { key: 'step_10', id: 10, is_upcl: false, status: 'Subsidy Redeem', desc: 'Subsidy claimed and redeemed', dept: 'Subsidy Redeem (BO)' },
];

/* ─── Project Transfer Modal (Worker to Worker / Step 1 to 10) ─────────────── */
function TransferModal({ project, initialStep, currentUser, onClose, onTransferred }: {
  project: any;
  initialStep?: number;
  currentUser?: any;
  onClose: () => void;
  onTransferred: (message: string) => void;
}) {
  const cur = project.step ?? 1;
  const initialDestKey = initialStep ? (initialStep === 1 && project.status?.includes('UPCL') ? 'step_1_upcl' : `step_${initialStep}`) : (cur === 1 ? 'step_2' : 'step_1_reg');
  const [selectedKey, setSelectedKey] = useState<string>(
    TRANSFER_DESTINATIONS.find(d => d.key === initialDestKey || d.id === initialStep)?.key || 'step_2'
  );
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const currentStepObj = WORKFLOW_STEPS.find(s => s.id === cur);
  const targetDest = TRANSFER_DESTINATIONS.find(d => d.key === selectedKey) || TRANSFER_DESTINATIONS[0];

  useEffect(() => {
    fetch(`${API}/projects/${project.id}/transfers`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setHistory(data); })
      .catch(() => {});
  }, [project.id]);

  const handleTransfer = async () => {
    if (!reason.trim()) {
      alert('Please write a reason or note for transferring this project.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/projects/${project.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_step: targetDest.id,
          status: targetDest.status,
          is_upcl: targetDest.is_upcl,
          reason: reason.trim(),
          transferred_by: currentUser?.role || currentUser?.email || 'Worker'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transfer failed');
      }
      onTransferred(`Project #${project.id} transferred to "${targetDest.status}" (${targetDest.dept}) ✓`);
    } catch (e: any) {
      alert(e.message || 'Transfer failed. Please check connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-100"
        style={{ animation: 'slideUp .25s ease', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-5 sm:px-6 py-4 flex justify-between items-center text-slate-950 flex-shrink-0 shadow-sm">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">Transfer Project to Worker / Dept</h2>
            <p className="text-xs font-semibold text-slate-900/80 mt-0.5">
              Project #{project.id} · {project.customer_name || project.customer || '—'}
            </p>
          </div>
          <button onClick={onClose} className="bg-black/10 hover:bg-black/20 text-slate-950 rounded-xl p-2 transition-colors cursor-pointer">
            <Icons.X />
          </button>
        </div>

        {/* Current Location Bar */}
        <div className="bg-amber-50/80 px-5 sm:px-6 py-2.5 border-b border-amber-200/60 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500">Current Step:</span>
            <span className="font-extrabold px-2 py-0.5 rounded-md bg-amber-200 text-amber-950">
              Step {cur}: {currentStepObj?.status} {project.needs_upcl || project.status?.includes('UPCL') ? '(UPCL Issue)' : ''}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Sender: <strong className="text-slate-700">{currentUser?.role || currentUser?.email || 'Worker'}</strong>
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Target Step Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Select Destination Step / Worker (1 to 10):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TRANSFER_DESTINATIONS.map(s => {
                const isSelected = selectedKey === s.key;
                const isCurrent = cur === s.id && (s.is_upcl ? (project.needs_upcl || project.status?.includes('UPCL')) : !(project.needs_upcl || project.status?.includes('UPCL')));
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSelectedKey(s.key)}
                    className={`text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-yellow-500 bg-yellow-50/80 shadow-sm ring-2 ring-yellow-400/40'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold ${isSelected ? 'text-slate-950' : 'text-slate-700'}`}>
                          {s.is_upcl ? '🏛️ UPCL' : `Step ${s.id}`}: {s.status}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Current
                          </span>
                        )}
                        {s.is_upcl && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                            Bill Issue
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{s.dept} · {s.desc}</p>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 ml-2">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason / Remarks Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Reason / Note for Receiving Worker <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Aadhar card not clear, please re-upload in Step 1. Or: Client approved loan, forwarding for dispatch..."
              className="w-full text-xs sm:text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-slate-50/50 focus:bg-white resize-none"
            />
          </div>

          {/* Transfer History Accordion */}
          {history.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left flex justify-between items-center text-xs font-bold text-slate-600 transition-colors cursor-pointer"
              >
                <span>Transfer History ({history.length} movement{history.length > 1 ? 's' : ''})</span>
                <span>{showHistory ? '▲ Hide' : '▼ View'}</span>
              </button>
              {showHistory && (
                <div className="p-3 bg-white divide-y divide-slate-100 space-y-2 max-h-40 overflow-y-auto">
                  {history.map((h: any, idx: number) => (
                    <div key={idx} className="pt-2 first:pt-0 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">
                          Step {h.from_step} ➔ Step {h.to_step}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        By <strong className="text-slate-800">{h.transferred_by || 'Staff'}</strong>: "{h.reason}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={busy || !reason.trim()}
            className="px-5 sm:px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            {busy ? <span className="animate-spin text-sm">↻</span> : <span>Confirm Transfer</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Project Edit Modal ───────────────────────────────────────────────────── */
function EditModal({ project, onClose, onUpdate, onLoanApprove, onSaveApplicant, onDelete, onOpenTransfer, currentUser, currentPath }: {
  project: any; onClose: () => void;
  onUpdate: (id: number, step: number, status: string, failed_doc?: string | null, reason?: string | null, bank_remarks?: string | null) => Promise<void>;
  onLoanApprove: (id: number) => Promise<void>;
  onSaveApplicant: (id: number, data: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onOpenTransfer?: (project: any, preselectStep?: number) => void;
  currentUser?: any;
  currentPath?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'steps' | 'edit'>('steps');
  const [formData, setFormData] = useState({
    customer_name: project.customer_name || project.customer || '',
    address: project.address || '',
    site_location: project.site_location || '',
    contact_number: project.contact_number || '',
    kw_capacity: project.kw_capacity || '',
    aadhar_number: project.aadhar_number || '',
    pan_number: project.pan_number || '',
    meter_number: project.meter_number || '',
  });
  const steps = WORKFLOW_STEPS;
  const cur = project.step ?? 1;
  const pct = Math.min(100, Math.round(((Math.max(1, cur) - 1) / 10) * 100));
  const allowedSteps = getAllowedSteps(currentPath || '', currentUser);

  const [rejectDoc, setRejectDoc] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const handleDocUpload = async (field: 'quotation' | 'agreement' | 'site_photo' | 'inst_photo_1' | 'inst_photo_2', file: File) => {
    try {
      setUploadingDoc(field);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
      
      const updateRes = await fetch(`${API}/projects/${project.id}/document`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: data.filePath })
      });
      if (!updateRes.ok) throw new Error('Failed to update project with document');
      
      project[field] = data.filePath;
      alert(`${field === 'quotation' ? 'Quotation + Sign' : field === 'agreement' ? 'Signed Agreement' : field} uploaded successfully! ✓`);
      setBusy(b => !b);
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handle = async (s: any) => {
    if (!allowedSteps.includes(s.id)) {
      alert(`Access Restricted: Step "${s.status}" can only be marked by the ${s.dept} department.`);
      return;
    }
    if (cur !== s.id) {
      alert(`Cannot mark Step ${s.id}: Please complete step ${cur} first.`);
      return;
    }

    let remarks = null;
    if (s.id === 5) {
      remarks = window.prompt("Enter Bank Remarks (tag with remark if not disbursed):");
      if (remarks === null) return; // User cancelled
    }
    
    const nextStep = s.id + 1;
    const nextObj = steps.find(x => x.id === nextStep);
    const nextStatus = nextObj ? nextObj.status : 'Completed';

    setBusy(true);
    await onUpdate(project.id, nextStep, nextStatus, null, null, remarks);
    setBusy(false);
  };

  const handleReject = async () => {
    if (!rejectDoc || !rejectReason) return;
    setBusy(true);
    await onUpdate(project.id, cur, project.status, rejectDoc, rejectReason);
    setBusy(false);
    setRejectDoc('');
    setRejectReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />

      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ animation: 'slideUp .25s ease', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top gradient header - fixed */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-6 pt-5 pb-4 flex-shrink-0">
          <div className="flex justify-between items-center gap-2">
            <div className="min-w-0">
              <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase">Project Details</span>
              <h2 className="text-white text-base sm:text-xl font-black mt-0.5 truncate">
                #{project.id} · {project.customer_name || project.customer || '—'}
              </h2>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => onOpenTransfer && onOpenTransfer(project)}
                className="text-amber-300 hover:text-white bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 rounded-xl px-2.5 py-2 transition-colors text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer shadow-sm"
                title="Transfer project to any department / worker (1 to 10)"
              >
                <span>🔄</span>
                <span>Transfer</span>
              </button>
              <button onClick={() => setMode(mode === 'steps' ? 'edit' : 'steps')} className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl px-2.5 py-2 transition-colors text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer">
                <span>{mode === 'steps' ? '✏️' : '📋'}</span>
                <span>{mode === 'steps' ? 'Edit Info' : 'Steps'}</span>
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-colors flex-shrink-0 cursor-pointer">
                <Icons.X />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>COMPLETION</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-emerald-400 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Step dots */}
          <div className="flex justify-between mt-4">
            {steps.map(s => {
              const isDone = cur > s.id;
              const isCurrent = cur === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 transition-all relative overflow-hidden ${
                    isDone
                      ? 'bg-yellow-400 border-yellow-300 text-slate-900 shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                      : isCurrent
                      ? 'bg-yellow-100 border-yellow-400 text-yellow-600 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                      : 'bg-white/10 border-white/20 text-white/40'
                  }`}>
                    {isCurrent && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-50 animate-[shimmer_1.5s_infinite]" style={{ transform: 'skewX(-20deg)' }}></div>
                    )}
                    {isDone ? '✓' : (isCurrent ? <span className="animate-spin text-lg">↻</span> : s.id)}
                  </div>
                  <span className="text-[9px] text-slate-500 hidden sm:block">{s.status.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
        {cur === 1 && (
          <div className="mx-4 sm:mx-5 mt-4 p-3.5 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl shrink-0">🏛️</span>
              <div>
                <p className="text-xs font-black text-sky-950">Document Problem? (Electricity Bill / Name / Meter)</p>
                <p className="text-[11px] text-sky-700 mt-0.5">If customer's documents have discrepancies, send project to UPCL verification.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const reason = window.prompt("Enter problem with Electricity Bill / Documents for UPCL worker:", "Electricity bill / connection name mismatch");
                if (!reason) return;
                try {
                  setBusy(true);
                  const res = await fetch(`${API}/projects/${project.id}/transfer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      to_step: 1,
                      status: 'UPCL Verification',
                      is_upcl: true,
                      reason: reason.trim(),
                      transferred_by: currentUser?.role || currentUser?.email || 'Registration Worker'
                    })
                  });
                  const data = await res.json();
                  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send to UPCL');
                  alert(`Project #${project.id} sent to UPCL Department! ✓`);
                  onClose();
                } catch (e: any) {
                  alert(e.message || 'Failed to send to UPCL');
                } finally {
                  setBusy(false);
                }
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🏛️</span>
              <span>Send to UPCL Worker</span>
            </button>
          </div>
        )}
        {project.transfer_remarks && (
          <div className="mx-4 sm:mx-5 mt-4 p-3.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-sm">
            <span className="text-2xl shrink-0">🔄</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-amber-800 uppercase tracking-wide">
                  Project Transferred
                </span>
                {project.previous_step && (
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                    From Step {project.previous_step}
                  </span>
                )}
                {project.transferred_by && (
                  <span className="text-[11px] text-slate-500">
                    by <strong className="text-slate-800">{project.transferred_by}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-950 font-semibold mt-1">
                "{project.transfer_remarks}"
              </p>
            </div>
          </div>
        )}
        {mode === 'steps' ? (
          <>
            {/* Steps list */}
            <div className="p-4 sm:p-5 space-y-2.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Workflow Steps</p>
                {currentPath && PATH_ALLOWED_STEPS[currentPath] && (
                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                    Active Dept: {steps.find(x => allowedSteps.includes(x.id))?.dept || 'Restricted'}
                  </span>
                )}
              </div>
              {steps.map(s => {
                const isDone = cur > s.id;
                const isCurrent = cur === s.id;
                const isUpcoming = cur < s.id;
                const isRoleAllowed = allowedSteps.includes(s.id);

                return (
                  <div
                    key={s.id}
                    className={`relative overflow-hidden w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200
                      ${isDone
                        ? 'border-emerald-200 bg-emerald-50/50 shadow-sm'
                        : isCurrent
                        ? (isRoleAllowed
                            ? 'border-yellow-400 bg-yellow-50/60 shadow-[0_0_15px_rgba(250,204,21,0.35)]'
                            : 'border-amber-200 bg-amber-50/30')
                        : 'border-slate-100 bg-slate-50/70 opacity-60'
                      }`}
                  >
                    {isCurrent && isRoleAllowed && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}></div>
                    )}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                      isDone ? 'bg-emerald-100 text-emerald-600' : isCurrent ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isDone ? (
                        <span className="text-emerald-600 font-black text-lg">✓</span>
                      ) : isCurrent ? (
                        <span className="animate-spin text-xl text-yellow-500">↻</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">{s.id}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 z-10">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${isDone ? 'text-emerald-800' : isCurrent ? 'text-yellow-700 font-extrabold' : 'text-slate-500'}`}>
                          Step {s.id}: {s.status}
                        </p>
                        {isDone && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">✓ Completed</span>
                        )}
                        {s.id === 2 && (
                          project.quotation ? (
                            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">📋 Quotation Attached</span>
                          ) : (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">⚠️ Quotation Pending</span>
                          )
                        )}
                        {s.id === 3 && (
                          project.agreement ? (
                            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">📄 Agreement Attached</span>
                          ) : (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">⚠️ Agreement Pending</span>
                          )
                        )}
                        {isCurrent && !isRoleAllowed && (
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            🔒 {s.dept} Dept Only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{s.desc}</p>
                    </div>

                    {/* Action Button / Badge */}
                    <div className="shrink-0 z-10 flex items-center gap-1.5">
                      {isDone && (
                        <span className="text-emerald-600 text-xs font-black px-2 py-1">
                          Done ✓
                        </span>
                      )}
                      {isCurrent && isRoleAllowed && (
                        <button
                          disabled={busy}
                          onClick={() => handle(s)}
                          className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 text-xs font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          {busy ? <span className="animate-spin">↻</span> : <span>Mark ✓</span>}
                        </button>
                      )}
                      {isCurrent && !isRoleAllowed && (
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-bold flex items-center gap-1">
                          🔒 Locked
                        </span>
                      )}
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => onOpenTransfer && onOpenTransfer(project, s.id)}
                          title={`Transfer directly to Step ${s.id}: ${s.status}`}
                          className="text-[11px] text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer border border-amber-300/60"
                        >
                          <span>Send Here ↗</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dedicated Worker Document Uploads: Quotation + Sign & Agreement */}
            <div className="px-5 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black tracking-wider uppercase text-slate-700 flex items-center gap-1.5">
                  <span>📄</span> Worker Documents & Signatures
                </p>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                  Step 2 & 3 Handled by Dedicated Workers
                </span>
              </div>

              {/* Step 2: Quotation + Sign Card */}
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                cur === 2 || currentPath === '/quotation'
                  ? 'border-yellow-400 bg-yellow-50/70 shadow-sm'
                  : 'border-slate-200 bg-white'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl shrink-0 font-bold">
                      📋
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">Quotation + Sign</span>
                        {project.quotation ? (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                            ✓ Uploaded
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            ⚠️ Pending Upload
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Quotation worker uploads and checks signed quotation document
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {project.quotation && (
                      <DownloadBtn url={getUploadUrl(project.quotation)} name="quotation" label="👁️ View Quotation" />
                    )}
                    <label className={`cursor-pointer text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                      uploadingDoc === 'quotation'
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-yellow-400 hover:bg-yellow-500 text-slate-950 active:scale-95'
                    }`}>
                      <span>{uploadingDoc === 'quotation' ? '↻ Uploading...' : project.quotation ? '📤 Replace Quotation' : '📤 Upload Quotation + Sign'}</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        disabled={uploadingDoc === 'quotation'}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handleDocUpload('quotation', e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Step 3: Signed Agreement Card */}
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                cur === 3 || currentPath === '/agreement'
                  ? 'border-emerald-400 bg-emerald-50/70 shadow-sm'
                  : 'border-slate-200 bg-white'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0 font-bold">
                      📄
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">Signed Agreement</span>
                        {project.agreement ? (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                            ✓ Uploaded
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            ⚠️ Pending Upload
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Agreement worker uploads and checks signed client agreement
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {project.agreement && (
                      <DownloadBtn url={getUploadUrl(project.agreement)} name="agreement" label="👁️ View Agreement" />
                    )}
                    <label className={`cursor-pointer text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                      uploadingDoc === 'agreement'
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
                    }`}>
                      <span>{uploadingDoc === 'agreement' ? '↻ Uploading...' : project.agreement ? '📤 Replace Agreement' : '📤 Upload Agreement'}</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        disabled={uploadingDoc === 'agreement'}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handleDocUpload('agreement', e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Files section */}
            <div className="px-5 pb-3 mt-4">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color:'#F0A500'}}>📁 All Uploaded Files</p>
              
              {!(project.site_photo || project.agreement || project.quotation || project.inst_photo_1 || project.inst_photo_2) && (
                <p className="text-xs text-slate-500 mb-4 italic">No documents uploaded yet.</p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {project.site_photo && (
                  <DownloadBtn url={getUploadUrl(project.site_photo)} name="site_photo" label="📷 Site Photo" />
                )}
                {project.agreement && (
                  <DownloadBtn url={getUploadUrl(project.agreement)} name="agreement" label="📄 Agreement" />
                )}
                {project.quotation && (
                  <DownloadBtn url={getUploadUrl(project.quotation)} name="quotation" label="📋 Quotation" />
                )}
                {project.inst_photo_1 && (
                  <DownloadBtn url={getUploadUrl(project.inst_photo_1)} name="inst_photo_1" label="📷 Inst. Photo 1" />
                )}
                {project.inst_photo_2 && (
                  <DownloadBtn url={getUploadUrl(project.inst_photo_2)} name="inst_photo_2" label="📷 Inst. Photo 2" />
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-600 mb-2">Reject a Document</p>
                <div className="flex gap-2">
                  <select value={rejectDoc} onChange={e => setRejectDoc(e.target.value)} className="text-xs border border-red-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 outline-none">
                    <option value="">Select Document</option>
                    <option value="site_photo">Site Photo</option>
                    <option value="agreement">Agreement</option>
                    <option value="quotation">Quotation</option>
                    <option value="inst_photo_1">Inst. Photo 1</option>
                    <option value="inst_photo_2">Inst. Photo 2</option>
                  </select>
                  <input type="text" placeholder="Reason..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="flex-1 text-xs border border-red-200 rounded-lg px-2 py-1.5 bg-white outline-none" />
                  <button onClick={handleReject} disabled={busy || !rejectDoc || !rejectReason} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    Reject
                  </button>
                </div>
                {project.failed_document && (
                  <p className="mt-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    ⚠️ Current Rejection: {project.failed_document} - {project.rejection_reason}
                  </p>
                )}
              </div>
            </div>

            {/* Bank Remarks Section */}
            {project.bank_remarks && (
              <div className="px-5 pb-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-yellow-700 mb-1">🏦 Bank Remarks (1st Disbursed)</p>
                  <p className="text-sm text-yellow-900">{project.bank_remarks}</p>
                </div>
              </div>
            )}

            {/* Loan Approve Button */}
            {!project.loan_approved && (
              <div className="px-5 pb-3">
                <button
                  onClick={async () => { setBusy(true); await onLoanApprove(project.id); setBusy(false); onClose(); }}
                  disabled={busy}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md hover:shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  {busy ? '⏳ Processing...' : '🏦 APPROVE LOAN (Admin)'}
                </button>
              </div>
            )}
            {project.loan_approved && (
              <div className="px-5 pb-3">
                <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2">
                  ✅ Loan Already Approved
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Customer Name</label>
                <input type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Address</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Site Location</label>
                <input type="text" value={formData.site_location} onChange={e => setFormData({...formData, site_location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Contact</label>
                  <input type="text" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">KW Capacity</label>
                  <input type="number" value={formData.kw_capacity} onChange={e => setFormData({...formData, kw_capacity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Aadhar</label>
                  <input type="text" value={formData.aadhar_number} onChange={e => setFormData({...formData, aadhar_number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">PAN</label>
                  <input type="text" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Meter Number</label>
                <input type="text" value={formData.meter_number} onChange={e => setFormData({...formData, meter_number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            </div>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onSaveApplicant(project.id, formData);
                setBusy(false);
                setMode('steps');
              }}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-sm py-3 rounded-xl transition-colors shadow-md hover:shadow-yellow-200 flex items-center justify-center gap-2"
            >
              {busy ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        )}
        </div>{/* end scrollable */}

        {/* Footer - always visible */}
        <div className="px-4 sm:px-5 py-4 flex justify-between border-t border-slate-100 flex-shrink-0 bg-white rounded-b-3xl">
          <button 
            disabled={busy}
            onClick={async () => {
              if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
                setBusy(true);
                await onDelete(project.id);
                setBusy(false);
                onClose();
              }
            }} 
            className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm px-4 sm:px-6 py-2.5 rounded-xl transition-colors"
          >
            🗑️ Delete
          </button>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard ────────────────────────────────────────────────────────────── */
function Dashboard({ user }: { user?: any }) {
  const loc = useLocation();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [transferTarget, setTransferTarget] = useState<{ project: any; initialStep?: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const toastTimer = useRef<any>(null);

  const load = useCallback(async () => {
    setSpinning(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (filter) q.append('status', filter);
      if (user && user.role) q.append('role', user.role);

      const r = await fetch(`${API}/projects?${q.toString()}`);
      if (!r.ok) throw new Error();
      setProjects(await r.json());
    } catch { /* swallowed */ }
    finally { setLoading(false); setSpinning(false); }
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const updateProject = async (id: number, step: number, status: string, failed_document?: string | null, rejection_reason?: string | null, bank_remarks?: string | null) => {
    try {
      await fetch(`${API}/projects/${id}/step`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, status, failed_document, rejection_reason, bank_remarks }),
      });
      await load();
      setSelected(null);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (failed_document) {
        setToast(`Document rejected ✓`);
      } else {
        setToast(`Step ${step}: "${status}" marked ✓`);
      }
      toastTimer.current = setTimeout(() => setToast(''), 3200);
    } catch { /* swallowed */ }
  };

  const loanApprove = async (id: number) => {
    try {
      await fetch(`${API}/projects/${id}/loan-approve`, { method: 'PUT' });
      await load();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast(`Loan approved for Project #${id} ✓`);
      toastTimer.current = setTimeout(() => setToast(''), 3200);
    } catch { /* swallowed */ }
  };

  const saveApplicant = async (id: number, data: any) => {
    try {
      await fetch(`${API}/projects/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await load();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast(`Project #${id} details updated ✓`);
      toastTimer.current = setTimeout(() => setToast(''), 3200);
    } catch { /* swallowed */ }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${API}/projects/${id}`, { method: 'DELETE' });
      await load();
    } catch { /* swallowed */ }
  };

  const displayProjects = projects.filter(p => {
    const curStep = p.step ?? 1;
    const isUpcl = p.status?.includes('UPCL') || p.needs_upcl || p.transferred_by === 'upcl';
    switch (loc.pathname) {
      case '/upcl':         return curStep === 1 && isUpcl;
      case '/registration': return curStep === 1 && !isUpcl;
      case '/quotation':    return curStep === 2;
      case '/agreement':    return curStep === 3;
      case '/loan':         return curStep === 4;
      case '/bank':
      case '/loan-disbursed': return curStep === 5;
      case '/dispatch':
      case '/store':        return curStep === 6;
      case '/installation': return curStep === 7;
      case '/upload-inst':  return curStep === 9;
      case '/subsidy':      return curStep === 10;
      default: return true; // '/projects' or '/'
    }
  });

  const pageInfo = Object.values(ROLE_PAGES).find(p => p.to === loc.pathname);
  const pageTitle = pageInfo ? `${pageInfo.label} Department` : 'Overview';
  const pageDesc = pageInfo ? `Manage and process projects in ${pageInfo.label} queue` : 'Ramsun Solar · Project Management Dashboard';

  const done = displayProjects.filter(p => (p.step ?? 0) >= 10).length;
  const pending = displayProjects.filter(p => !p.step || p.step <= 1).length;
  const inProcess = displayProjects.filter(p => (p.step ?? 0) > 1 && (p.step ?? 0) < 10).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-full">
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 md:top-5 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl shadow-emerald-900/30"
          style={{ animation: 'slideDown .3s ease' }}>
          <span className="text-emerald-200">✓</span> {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6 md:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">{pageTitle}</h1>
          <p className="text-slate-400 mt-1 text-sm">{pageDesc}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {(!user || user.role === 'admin') && loc.pathname === '/' && (
            <Link
              to="/users"
              className="px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <span>🔑</span>
              <span>Generate Access Code</span>
            </Link>
          )}
          <input
            type="text"
            placeholder="Search ID, Name, Phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full sm:min-w-[200px]"
          />
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setTimeout(load, 0); }}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="Registration">Registration (BO)</option>
            <option value="Quotation + Sign">Quotation + Sign (BO)</option>
            <option value="Agreement">Agreement (BO)</option>
            <option value="Loan Apply">Loan Apply (BO)</option>
            <option value="Loan Disbursed">Loan Disbursed (Bank)</option>
            <option value="Material Dispatch">Material Dispatch (Store)</option>
            <option value="Complete Installation">Complete Installation</option>
            <option value="Second Disbursed">Second Disbursed (Bank)</option>
            <option value="Upload Inst. (DCR)">Upload Inst. (DCR) (BO)</option>
            <option value="Subsidy Redeem">Subsidy Redeem (BO)</option>
          </select>
          <button
            onClick={load}
            className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-yellow-200 hover:shadow-lg transition-all w-full sm:w-auto cursor-pointer"
          >
            <span className={spinning ? 'animate-spin inline-block' : 'inline-block'}><Icons.RotateCw /></span>
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard label="Total Projects"    value={displayProjects.length} sub="+8%" gradient="bg-gradient-to-br from-blue-500 to-indigo-700"   icon={<Icons.Briefcase />} />
        <StatCard label="Pending Approval"  value={pending}         sub="+3"  gradient="bg-gradient-to-br from-orange-400 to-rose-600"   icon={<Icons.Zap />} />
        <StatCard label="In Progress"       value={inProcess}       sub="→"   gradient="bg-gradient-to-br from-violet-500 to-purple-700" icon={<Icons.CreditCard />} />
        <StatCard label="Completed"         value={done}            sub="+5"  gradient="bg-gradient-to-br from-emerald-400 to-teal-600"  icon={<Icons.Check />} />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100 overflow-hidden overflow-x-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-800">All Projects</h2>
          <span className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-1">{displayProjects.length} total records</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-[3px] border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Fetching projects…</p>
          </div>
        ) : displayProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <div className="text-5xl">☀️</div>
            <p className="font-bold text-slate-600 mt-2">No projects yet</p>
            <p className="text-slate-400 text-sm">Add projects from the backend to see them here.</p>
          </div>
        ) : (
          <>
            {/* Mobile/Tablet card list (hidden on large desktop) */}
            <div className="lg:hidden divide-y divide-slate-100">
              {displayProjects.map(p => (
                <div key={p.id} className="p-4 sm:p-5 hover:bg-yellow-50/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                        {(p.customer_name || p.customer || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{p.customer_name || p.customer || '—'}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.client_id ? `#${p.client_id}` : `#${p.id}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTransferTarget({ project: p })}
                        className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300/80 hover:bg-amber-100 px-2.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                      >
                        <span>🔄</span> Transfer
                      </button>
                      <button
                        onClick={() => setSelected(p)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 text-white px-3.5 py-2 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
                      >
                        Edit <Icons.ChevronRight />
                      </button>
                    </div>
                  </div>

                  {p.transfer_remarks && (
                    <div className="mb-2.5 p-2 bg-amber-50/90 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-1.5">
                      <span className="text-xs shrink-0">🔄</span>
                      <div className="truncate flex-1">
                        <strong className="text-amber-800">Transferred (Step {p.previous_step || '?'}):</strong> {p.transfer_remarks}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <StatusBadge status={p.status} />
                    {loc.pathname === '/quotation' && (
                      p.quotation
                        ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg">📋 Quotation ✓</span>
                        : <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-lg">⚠️ Quotation Pending</span>
                    )}
                    {loc.pathname === '/agreement' && (
                      p.agreement
                        ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg">📄 Agreement ✓</span>
                        : <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-lg">⚠️ Agreement Pending</span>
                    )}
                    {(loc.pathname === '/upcl' || p.needs_upcl || p.status?.includes('UPCL')) && (
                      <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2 py-1 rounded-lg">🏛️ UPCL Issue</span>
                    )}
                    {p.loan_approved
                      ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg">✅ Loan OK</span>
                      : <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-1 rounded-lg">⏳ Loan Pending</span>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${((p.step ?? 0) / 10) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 font-medium shrink-0">{p.step ?? 0}/10 steps</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table (hidden on small screens) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider text-left">
                    <th className="px-6 py-3 font-semibold">#</th>
                    <th className="px-6 py-3 font-semibold">Customer</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Progress</th>
                    <th className="px-6 py-3 font-semibold">Loan</th>
                    <th className="px-6 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayProjects.map(p => (
                    <tr key={p.id} className="group hover:bg-yellow-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-500">
                        {p.client_id ? `#${p.client_id}` : `#${p.id}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {(p.customer_name || p.customer || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-800">{p.customer_name || p.customer || '—'}</span>
                            {p.transfer_remarks && (
                              <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1 truncate max-w-[200px]" title={p.transfer_remarks}>
                                <span>🔄</span> Transferred (Step {p.previous_step || '?'})
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={p.status} />
                          {loc.pathname === '/quotation' && (
                            p.quotation
                              ? <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">📋 Quotation Attached</span>
                              : <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">⚠️ Quotation Missing</span>
                          )}
                          {loc.pathname === '/agreement' && (
                            p.agreement
                              ? <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">📄 Agreement Attached</span>
                              : <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">⚠️ Agreement Missing</span>
                          )}
                          {(loc.pathname === '/upcl' || p.needs_upcl || p.status?.includes('UPCL')) && (
                            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded">🏛️ UPCL Issue</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-400 to-emerald-500 rounded-full transition-all duration-700"
                              style={{ width: `${((p.step ?? 0) / 10) * 100}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 font-medium w-8 shrink-0">{p.step ?? 0}/10</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.loan_approved
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg">✅ Approved</span>
                          : <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-1 rounded-lg">⏳ Pending</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected(p)}
                            className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 group-hover:bg-yellow-400 text-white group-hover:text-slate-900 px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer"
                          >
                            Edit <Icons.ChevronRight />
                          </button>
                          <button
                            onClick={() => setTransferTarget({ project: p })}
                            title="Transfer project to any department / worker (1 to 10)"
                            className="flex items-center gap-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 rounded-xl transition-all active:scale-95 whitespace-nowrap cursor-pointer shadow-sm"
                          >
                            <span>🔄</span>
                            <span>Transfer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selected && (
        <EditModal
          project={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateProject}
          onLoanApprove={loanApprove}
          onSaveApplicant={saveApplicant}
          onDelete={del}
          onOpenTransfer={(proj, step) => setTransferTarget({ project: proj, initialStep: step })}
          currentUser={user}
          currentPath={loc.pathname}
        />
      )}

      {transferTarget && (
        <TransferModal
          project={transferTarget.project}
          initialStep={transferTarget.initialStep}
          currentUser={user}
          onClose={() => setTransferTarget(null)}
          onTransferred={(msg) => {
            setTransferTarget(null);
            setSelected(null);
            load();
            if (toastTimer.current) clearTimeout(toastTimer.current);
            setToast(msg);
            toastTimer.current = setTimeout(() => setToast(''), 3500);
          }}
        />
      )}
    </div>
  );
}

/* ─── Download Button ─────────────────────────────────────────────────────── */
function DownloadBtn({ url, name, label }: { url: string; name: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    await downloadFile(url, name);
    setLoading(false);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };
  return (
    <button onClick={handleClick} disabled={loading}
      className="group flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-70 relative overflow-hidden"
      style={{background: done ? 'linear-gradient(135deg,#0ea5e9,#38bdf8)' : loading ? 'linear-gradient(135deg,#0284c7,#0ea5e9)' : 'linear-gradient(135deg,#e0f2fe,#bae6fd)', border:'1.5px solid #38bdf8', color: done || loading ? '#fff' : '#0369a1', cursor: loading ? 'wait' : 'pointer'}}>
      {/* Shimmer */}
      {!loading && !done && <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />}
      <span>{label}</span>
      <span className="flex items-center gap-1 font-black text-[10px] px-2 py-0.5 rounded-md"
        style={{background: done ? 'rgba(255,255,255,0.25)' : loading ? 'rgba(255,255,255,0.2)' : '#0ea5e9', color: done || loading ? '#fff' : '#fff'}}>
        {loading ? (
          <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
        ) : done ? '✓ Saved!' : '⬇ Download'}
      </span>
    </button>
  );
}

/* ─── Users Page ──────────────────────────────────────────────────────────── */
/* ─── Users & Access Codes Page ──────────────────────────────────────────────────────────── */
function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [selectedRole, setSelectedRole] = useState('bo_registration');
  const [generating, setGenerating] = useState(false);

  const fetchUsers = () => {
    fetch(`${API}/auth/users`)
      .then(r => r.json())
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchCodes = () => {
    fetch(`${API}/access-codes`)
      .then(r => r.json())
      .then(d => { setCodes(Array.isArray(d) ? d : []); setLoadingCodes(false); })
      .catch(() => setLoadingCodes(false));
  };

  useEffect(() => {
    fetchUsers();
    fetchCodes();
  }, []);

  const [codeToRevoke, setCodeToRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const handleGenerate = async () => {
    if (!selectedRole) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API}/access-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole })
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        fetchCodes();
      } else {
        alert(d.error || 'Failed to generate code');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate code. Please check connection.');
    }
    setGenerating(false);
  };

  const confirmRevoke = async () => {
    if (!codeToRevoke) return;
    setRevoking(true);
    try {
      const res = await fetch(`${API}/access-codes/${codeToRevoke}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        setCodeToRevoke(null);
        fetchCodes();
      } else {
        alert(d.error || 'Failed to revoke code');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete code. Please check connection.');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-10" style={{animation:'slideUp .3s ease'}}>

      {/* Confirmation Modal */}
      {codeToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4" style={{animation:'slideUp .2s ease'}}>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🗑️
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Revoke Access Code</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to revoke code <span className="font-mono font-bold text-slate-900 bg-yellow-100 px-2 py-0.5 rounded">{codeToRevoke}</span>?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCodeToRevoke(null)}
                disabled={revoking}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevoke}
                disabled={revoking}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-red-200 flex items-center justify-center gap-2"
              >
                {revoking ? 'Revoking...' : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Access Codes Section */}
      <section>
        <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">Access Codes (Passwordless)</h1>
            <p className="text-slate-500 text-sm mt-1">Generate 8-digit codes for employees to log in without passwords</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-yellow-500"
            >
              {Object.entries(ROLE_PAGES).map(([role, page]) => (
                <option key={role} value={role}>{page.label} ({role})</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-slate-900 text-yellow-400 font-bold text-sm px-4 py-2 rounded-xl shadow-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {generating ? 'Generating...' : '+ Generate Code'}
            </button>
          </div>
        </div>

        {loadingCodes ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin text-yellow-500" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">No access codes active. Generate one above.</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Access Code</th>
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Created At</th>
                <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
              </tr></thead>
              <tbody>
                {codes.map(c => (
                  <tr key={c.code} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-800 font-black tracking-widest bg-yellow-50/50">{c.code}</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700">{c.role}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(c.created_at).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setCodeToRevoke(c.code)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded transition-colors text-xs font-bold"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Legacy Users Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-black text-slate-800">Registered Accounts</h2>
          <p className="text-slate-500 text-xs mt-1">Legacy email/password accounts</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin text-yellow-500" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">No users registered.</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">#</th>
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Joined</th>
              </tr></thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>{u.role || 'employee'}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      
    </div>
  );
}

/* ─── Reminders Page ──────────────────────────────────────────────────────── */
function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    fetch(`${API}/reminders`)
      .then(r => r.json())
      .then(d => { setReminders(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id: number) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await fetch(`${API}/reminders/${id}`, { method: 'DELETE' });
      load();
    } catch {}
  };

  return (
    <div className="p-4 sm:p-6 md:p-8" style={{animation:'slideUp .3s ease'}}>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800">Reminders</h1>
          <p className="text-slate-500 text-sm mt-1">Notifications from staff</p>
        </div>
        <button onClick={load} className="text-sm bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl shadow-md">Refresh</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-24"><svg className="animate-spin text-yellow-500" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg></div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-24 text-slate-400">No reminders yet.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Project</th>
              <th className="text-left px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Message</th>
              <th className="text-right px-5 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Action</th>
            </tr></thead>
            <tbody>
              {reminders.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-400 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3 font-semibold text-slate-700">Project #{r.project_id}</td>
                  <td className="px-5 py-3 text-slate-700">{r.message}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => del(r.id)} className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-1 bg-red-50 hover:bg-red-100 rounded-lg">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Settings Page ───────────────────────────────────────────────────────── */
function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8" style={{animation:'slideUp .3s ease'}}>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">System configuration and admin preferences</p>
      </div>
      <div className="grid gap-4 max-w-2xl">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">🏢 Company Info</h2>
          <div className="space-y-3 text-sm">
            {[['Company Name','Ramsun Energy Pvt. Ltd.'],['Industry','Solar Energy / Renewable'],['CRM Version','v2.0.0'],['Backend URL', API.replace('/api','')]].map(([k,v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-500 font-medium">{k}</span>
                <span className="text-slate-800 font-bold">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">🔐 Admin Access</h2>
          <div className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <p>Admin panel is password protected via backend authentication.</p>
            <p className="mt-1 text-xs">To change the password, update <code className="bg-slate-200 px-1 rounded">ADMIN_PASSWORD</code> in the server's <code className="bg-slate-200 px-1 rounded">.env</code> file.</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">📊 Workflow Stages</h2>
          <div className="space-y-2">
            {['Document Upload','UPCL Approval','Loan Apply','Loan Process','Installation'].map((s, i) => (
              <div key={s} className="flex items-center gap-3 py-2 border-b border-slate-50">
                <span className="w-6 h-6 rounded-full bg-yellow-400 text-slate-900 text-xs font-black flex items-center justify-center">{i+1}</span>
                <span className="text-slate-700 font-medium text-sm">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Coming Soon ──────────────────────────────────────────────────────────── */
function ComingSoon({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-32 gap-3 text-center px-4">
      <div className="bg-slate-100 rounded-2xl p-6 text-slate-400">{icon}</div>
      <h2 className="text-xl font-black text-slate-600">{title}</h2>
      <p className="text-slate-400 text-sm max-w-xs">This section is being built. Check back soon.</p>
    </div>
  );
}

/* ─── Login Page ──────────────────────────────────────────────────────────── */
function LoginPage({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isCodeLogin, setIsCodeLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handle = async () => {
    if (isCodeLogin) {
      if (!accessCode.trim()) return;
      setLoading(true); setError('');
      try {
        const res = await fetch(`${API}/auth/login-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: accessCode })
        });
        const data = await res.json();
        if (data.success) { onLogin(data.user); }
        else { setError(data.message || 'Invalid or revoked access code.'); }
      } catch {
        setError('Cannot connect to server. Please try again.');
      }
      setLoading(false);
    } else {
      if (!email.trim() || !pw.trim()) return;
      setLoading(true); setError('');
      try {
        const res = await fetch(`${API}/auth/admin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pw })
        });
        const data = await res.json();
        if (data.success) { onLogin(data.user); }
        else { setError(data.error || 'Incorrect credentials. Please try again.'); }
      } catch {
        setError('Cannot connect to server. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{position:'absolute',top:'20%',left:'50%',transform:'translateX(-50%)',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(234,179,8,0.07) 0%,transparent 70%)'}} />
      </div>
      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Ramsun Energy Logo" className="w-32 h-auto mx-auto mb-5 object-contain drop-shadow-xl" />
          <h1 className="text-3xl font-black text-white">Ramsun<span className="text-yellow-400">Energy</span></h1>
          <p className="text-slate-500 text-sm mt-2 tracking-wide">Admin Panel • Secure Access</p>
        </div>
        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl">
          <h2 className="text-white font-black text-lg mb-1">Welcome back 👋</h2>
          <p className="text-slate-500 text-sm mb-6">Login to your account to continue</p>
          
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
            <button onClick={() => {setIsCodeLogin(true); setError('');}} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${isCodeLogin ? 'bg-yellow-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Employee Code</button>
            <button onClick={() => {setIsCodeLogin(false); setError('');}} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${!isCodeLogin ? 'bg-yellow-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Admin Login</button>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
          {isCodeLogin ? (
            <>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Access Code</label>
              <div className="relative mb-6">
                <input
                  type="text"
                  value={accessCode}
                  onChange={e => { setAccessCode(e.target.value.toUpperCase()); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                  placeholder="Enter 8-digit code"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all font-mono tracking-widest"
                  maxLength={8}
                />
              </div>
            </>
          ) : (
            <>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="Enter admin email"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                />
              </div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative mb-5">
                <input
                  type={show ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                  placeholder="Enter admin password"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all pr-11"
                />
                <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs">{show ? '🙈' : '👁️'}</button>
              </div>
            </>
          )}

          <button
            onClick={handle}
            disabled={loading || (isCodeLogin ? !accessCode : !pw)}
            className="w-full py-3.5 rounded-xl font-black text-slate-900 text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 relative overflow-hidden"
            style={{background:'linear-gradient(135deg,#EAB308,#F59E0B)', boxShadow:'0 8px 30px rgba(234,179,8,0.3)'}}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 11-18 0" /></svg>
                Verifying...
              </span>
            ) : 'Sign In →'}
          </button>
        </div>
        <p className="text-center text-slate-700 text-xs mt-6">made by <span className="text-yellow-600 font-semibold">mac studio hub</span></p>
      </div>
    </div>
  );
}

/* ─── Mobile Header Bar ───────────────────────────────────────────────────── */
function MobileHeader({ user, onMenuOpen, onLogout }: { user?: any; onMenuOpen: () => void; onLogout?: () => void }) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-950 border-b border-white/5 flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2.5">
        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        <p className="text-base font-black text-white leading-none">Ramsun<span className="text-yellow-400">Energy</span></p>
      </div>
      <div className="flex items-center gap-2">
        {user && user.role !== 'admin' && (
           <span className="text-xs bg-yellow-400/20 text-yellow-400 font-bold px-2 py-1 rounded-md">{user.role}</span>
        )}
        {onLogout && (
          <button onClick={onLogout} className="text-red-400 hover:text-red-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-900/40 hover:bg-red-950 transition-colors">
            🚪
          </button>
        )}
        <button
          onClick={onMenuOpen}
          className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Open menu"
        >
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-4 h-0.5 bg-yellow-400 rounded-full" />
        </button>
      </div>
    </header>
  );
}

/* ─── Sidebar (All flowchart paths except Second Disbursed) ─────────────── */
const NAV_LINKS = [
  { to: '/',             label: 'Dashboard',                 icon: 'Dashboard', end: true },
  { to: '/projects',     label: 'All Projects',              icon: 'Briefcase' },
  { to: '/upcl',         label: 'UPCL (Transfer)',           icon: 'FileText' },
  { to: '/registration', label: 'Registration (BO)',         icon: 'FileText' },
  { to: '/quotation',    label: 'Quotation + Sign (BO)',     icon: 'FileText' },
  { to: '/agreement',    label: 'Agreement (BO)',            icon: 'FileText' },
  { to: '/loan',         label: 'Loan Apply (BO)',           icon: 'FileText' },
  { to: '/bank',         label: 'Loan Disbursed (Bank)',     icon: 'CreditCard' },
  { to: '/dispatch',     label: 'Material Dispatch (Store)', icon: 'Truck' },
  { to: '/installation', label: 'Complete Installation',     icon: 'Zap' },
  { to: '/upload-inst',  label: 'Upload Inst. (BO)',         icon: 'Upload' },
  { to: '/subsidy',      label: 'Subsidy Redeem (BO)',       icon: 'Gift' },
  { to: '/reminders',    label: 'Reminders',                 icon: 'Bell' },
  { to: '/users',        label: 'Access Codes',              icon: 'Key' },
  { to: '/settings',     label: 'Settings',                  icon: 'Settings' },
];

const ROLE_PAGES: Record<string, { to: string; label: string }> = {
  upcl:            { to: '/upcl',         label: 'UPCL (Transfer)' },
  bo_registration: { to: '/registration', label: 'Registration (BO)' },
  bo_quotation:    { to: '/quotation',    label: 'Quotation + Sign (BO)' },
  bo_agreement:    { to: '/agreement',    label: 'Agreement + Quotation (BO)' },
  bo_loan:         { to: '/loan',         label: 'Loan Apply (BO)' },
  bank:            { to: '/bank',         label: 'Loan Disbursed (Bank)' },
  store:           { to: '/dispatch',     label: 'Material Dispatch (Store)' },
  installation:    { to: '/installation', label: 'Complete Installation' },
  bo_upload_inst:  { to: '/upload-inst',  label: 'Upload Inst. (DCR) (BO)' },
  bo_subsidy:      { to: '/subsidy',      label: 'Subsidy Redeem (BO)' }
};

function SidebarContent({ user, onLogout, onClose }: { user?: any; onLogout?: () => void; onClose?: () => void }) {
  
  // Filter links based on role
  const isAdmin = user && user.role === 'admin';
  let links = [];
  if (isAdmin) {
    links = NAV_LINKS;
  } else if (user && ROLE_PAGES[user.role]) {
    const page = ROLE_PAGES[user.role];
    links = [{ to: page.to, label: page.label, icon: 'Briefcase', end: true }];
  } else {
    links = [{ to: '/', label: 'Dashboard', icon: 'Dashboard', end: true }];
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          <div>
            <p className="text-lg font-black leading-none">Ramsun<span className="text-yellow-400">Energy</span></p>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-0.5">Solar CRM</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 space-y-1.5 flex-1 px-4">
        {links.map(({ to, label, icon, end }) => {
          const Ic = Icons[icon as keyof typeof Icons];
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                  isActive
                    ? 'bg-yellow-400 text-slate-900 shadow-md shadow-yellow-400/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Ic /> {label}
            </NavLink>
          );
        })}
      </div>

      {/* User + Logout */}
      <div className="p-3 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-black text-slate-900 text-sm shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none text-white truncate">{user?.role || 'Admin User'}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{user?.email || 'admin@ramsun.com'}</p>
          </div>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="w-full flex items-center gap-2 justify-center text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950 transition-colors rounded-xl py-2.5 border border-red-900/40">
            🚪 Logout
          </button>
        )}
      </div>
    </div>
  );
}

function Sidebar({ user, onLogout, open, onClose }: { user?: any; onLogout?: () => void; open?: boolean; onClose?: () => void }) {
  return (
    <>
      {/* Mobile Drawer Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-slate-950 text-white flex flex-col shadow-2xl"
            style={{ animation: 'slideRight .25s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent user={user} onLogout={onLogout} onClose={onClose} />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar — always visible on md+ */}
      <aside className="hidden md:flex w-48 lg:w-56 shrink-0 bg-slate-950 text-white flex-col min-h-screen sticky top-0 h-screen">
        <SidebarContent user={user} onLogout={onLogout} />
      </aside>
    </>
  );
}


/* ─── App ──────────────────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState<any>(() => {
    const saved = sessionStorage.getItem('ramsun_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return (
    <>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:translateX(0)}}
      `}</style>
      <LoginPage onLogin={(u) => { 
        sessionStorage.setItem('ramsun_admin_user', JSON.stringify(u)); 
        setUser(u); 
      }} />
    </>
  );

  const handleLogout = () => { sessionStorage.removeItem('ramsun_admin_user'); setUser(null); };

  return (
    <>
      <style>{`
        @keyframes slideUp   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideRight{ from { opacity:0; transform:translateX(-100%) } to { opacity:1; transform:translateX(0) } }
        @keyframes shimmer   { 0% { transform: translateX(-100%) skewX(-20deg); } 100% { transform: translateX(200%) skewX(-20deg); } }
      `}</style>
      <Router>
        <div className="flex min-h-screen bg-slate-100 font-sans">
          {/* Mobile top bar */}
          <MobileHeader user={user} onMenuOpen={() => setSidebarOpen(true)} onLogout={handleLogout} />

          {/* Sidebar */}
          <Sidebar
            user={user}
            onLogout={handleLogout}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content — add top padding on mobile to clear fixed header */}
          <div className="flex-1 overflow-auto flex flex-col min-h-screen pt-14 md:pt-0">
            <Routes>
              <Route path="/" element={
                (user && user.role !== 'admin' && ROLE_PAGES[user.role]) 
                  ? <Navigate to={ROLE_PAGES[user.role].to} replace /> 
                  : <Dashboard user={user} />
              } />
              <Route path="/projects"      element={<Dashboard user={user} />} />
              <Route path="/reminders"     element={<RemindersPage />} />
              <Route path="/users"         element={<UsersPage />} />
              <Route path="/settings"      element={<SettingsPage />} />

              {/* Department specific routes (Step 8 Second Disbursed excluded as per client) */}
              <Route path="/upcl"          element={<Dashboard user={user} />} />
              <Route path="/registration"  element={<Dashboard user={user} />} />
              <Route path="/quotation"     element={<Dashboard user={user} />} />
              <Route path="/agreement"     element={<Dashboard user={user} />} />
              <Route path="/loan"          element={<Dashboard user={user} />} />
              <Route path="/bank"          element={<Dashboard user={user} />} />
              <Route path="/loan-disbursed" element={<Dashboard user={user} />} />
              <Route path="/dispatch"      element={<Dashboard user={user} />} />
              <Route path="/store"         element={<Dashboard user={user} />} />
              <Route path="/installation"  element={<Dashboard user={user} />} />
              <Route path="/upload-inst"   element={<Dashboard user={user} />} />
              <Route path="/subsidy"       element={<Dashboard user={user} />} />
              
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
            <footer className="mt-auto py-4 text-center text-xs text-slate-400 border-t border-slate-200">
              made by <span className="text-yellow-600 font-semibold">mac studio hub</span>
            </footer>
          </div>
        </div>
      </Router>
    </>
  );
}
