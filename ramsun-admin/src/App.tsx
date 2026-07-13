import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';


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

/* ─── Project Edit Modal ───────────────────────────────────────────────────── */
function EditModal({ project, onClose, onUpdate, onLoanApprove, onSaveApplicant, onDelete }: {
  project: any; onClose: () => void;
  onUpdate: (id: number, step: number, status: string, failed_doc?: string | null, reason?: string | null) => Promise<void>;
  onLoanApprove: (id: number) => Promise<void>;
  onSaveApplicant: (id: number, data: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
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
  const steps = [
    { id: 1, status: 'Document Upload', icon: '📄', desc: 'Client uploads required documents' },
    { id: 2, status: 'UPCL Approval',   icon: '📋', desc: 'Upload and verify UPCL documents' },
    { id: 3, status: 'Loan Apply',      icon: '📝', desc: 'Apply for loan on UPCL portal' },
    { id: 4, status: 'Loan Process',    icon: '🏦', desc: 'Wait for bank approval' },
    { id: 5, status: 'Installation',    icon: '⚡', desc: 'Solar panels installed & commissioned' },
  ];
  const cur = project.step ?? 1;
  const pct = Math.round(((cur - 1) / 4) * 100);

  const [rejectDoc, setRejectDoc] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const handle = async (id: number, status: string) => {
    setBusy(true);
    await onUpdate(project.id, id, status, null, null);
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
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp .25s ease' }}
      >
        {/* Top gradient header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-6 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase">Project Details</span>
              <h2 className="text-white text-xl font-black mt-1">
                #{project.id} · {project.customer_name || project.customer || '—'}
              </h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMode(mode === 'steps' ? 'edit' : 'steps')} className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-colors text-xs font-bold flex items-center gap-1">
                {mode === 'steps' ? '✏️ Edit Info' : '📋 Steps'}
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-colors">
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
            {steps.map(s => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 transition-all relative overflow-hidden ${
                  cur >= s.id
                    ? 'bg-yellow-400 border-yellow-300 text-slate-900 shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                    : cur + 1 === s.id
                    ? 'bg-yellow-100 border-yellow-400 text-yellow-600 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                    : 'bg-white/10 border-white/20 text-white/40'
                }`}>
                  {(cur + 1 === s.id) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-50 animate-[shimmer_1.5s_infinite]" style={{ transform: 'skewX(-20deg)' }}></div>
                  )}
                  {cur >= s.id ? '✓' : (cur + 1 === s.id ? <span className="animate-spin text-lg">↻</span> : s.id)}
                </div>
                <span className="text-[9px] text-slate-500 hidden sm:block">{s.status.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {mode === 'steps' ? (
          <>
            {/* Steps list */}
            <div className="p-5 space-y-2.5 max-h-[50vh] overflow-y-auto">
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3">Workflow Steps</p>
              {steps.map(s => {
                const done = cur >= s.id;
                const next = cur + 1 === s.id;
                return (
                  <button
                    key={s.id}
                    disabled={done || busy}
                    onClick={() => handle(s.id, s.status)}
                    className={`relative overflow-hidden w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200
                      ${done
                        ? 'border-yellow-200 bg-yellow-50 cursor-default shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                        : next
                        ? 'border-yellow-400 bg-yellow-50/50 hover:shadow-lg hover:shadow-yellow-300/40 cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.4)]'
                        : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-50'
                      }`}
                  >
                    {next && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}></div>
                    )}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${done || next ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                      {next ? <span className="animate-spin text-xl text-yellow-500">↻</span> : <span className="text-xl filter drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]">{s.icon}</span>}
                    </div>
                    <div className="flex-1 min-w-0 z-10">
                      <p className={`text-sm font-bold ${done ? 'text-yellow-700' : next ? 'text-yellow-600 animate-pulse' : 'text-slate-500'}`}>
                        Step {s.id}: {s.status}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{s.desc}</p>
                    </div>
                    {done && <span className="text-yellow-500 text-lg font-bold">✓</span>}
                    {next && !busy && (
                      <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-lg z-10 shadow-md">Mark ✓</span>
                    )}
                    {next && busy && (
                      <span className="animate-spin text-yellow-500 z-10">↻</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Files section */}
            <div className="px-5 pb-3 mt-4">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color:'#F0A500'}}>📁 Uploaded Files</p>
              
              {!(project.site_photo || project.agreement || project.quotation) && (
                <p className="text-xs text-slate-500 mb-4 italic">No documents uploaded yet.</p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {project.site_photo && (
                  <DownloadBtn url={`https://hon-cooperation-assist-firewire.trycloudflare.com${project.site_photo}`} name="site_photo" label="📷 Site Photo" />
                )}
                {project.agreement && (
                  <DownloadBtn url={`https://hon-cooperation-assist-firewire.trycloudflare.com${project.agreement}`} name="agreement" label="📄 Agreement" />
                )}
                {project.quotation && (
                  <DownloadBtn url={`https://hon-cooperation-assist-firewire.trycloudflare.com${project.quotation}`} name="quotation" label="📋 Quotation" />
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
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
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

        <div className="px-5 pb-5 flex justify-between">
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
            className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
          >
            Delete Project
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
function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
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

      const r = await fetch(`${API}/projects?${q.toString()}`);
      if (!r.ok) throw new Error();
      setProjects(await r.json());
    } catch { /* swallowed */ }
    finally { setLoading(false); setSpinning(false); }
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const updateProject = async (id: number, step: number, status: string, failed_document?: string | null, rejection_reason?: string | null) => {
    try {
      await fetch(`${API}/projects/${id}/step`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, status, failed_document, rejection_reason }),
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

  const done = projects.filter(p => (p.step ?? 0) >= 4).length;
  const pending = projects.filter(p => !p.step || p.step < 1).length;
  const inProcess = projects.filter(p => (p.step ?? 0) > 0 && (p.step ?? 0) < 4).length;

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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Overview</h1>
          <p className="text-slate-400 mt-1 text-sm">Ramsun Solar · Project Management Dashboard</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
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
            <option value="Document Upload">Document Upload</option>
            <option value="UPCL Approval">UPCL Approval</option>
            <option value="Loan Apply">Loan Apply</option>
            <option value="Loan Process">Loan Process</option>
            <option value="Installation">Installation</option>
          </select>
          <button
            onClick={load}
            className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-yellow-200 hover:shadow-lg transition-all w-full sm:w-auto"
          >
            <span className={spinning ? 'animate-spin inline-block' : 'inline-block'}><Icons.RotateCw /></span>
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8">
        <StatCard label="Total Projects"    value={projects.length} sub="+8%" gradient="bg-gradient-to-br from-blue-500 to-indigo-700"   icon={<Icons.Briefcase />} />
        <StatCard label="Pending Approval"  value={pending}         sub="+3"  gradient="bg-gradient-to-br from-orange-400 to-rose-600"   icon={<Icons.Zap />} />
        <StatCard label="In Progress"       value={inProcess}       sub="→"   gradient="bg-gradient-to-br from-violet-500 to-purple-700" icon={<Icons.CreditCard />} />
        <StatCard label="Completed"         value={done}            sub="+5"  gradient="bg-gradient-to-br from-emerald-400 to-teal-600"  icon={<Icons.Check />} />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-800">All Projects</h2>
          <span className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-1">{projects.length} total records</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-[3px] border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Fetching projects…</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <div className="text-5xl">☀️</div>
            <p className="font-bold text-slate-600 mt-2">No projects yet</p>
            <p className="text-slate-400 text-sm">Add projects from the backend to see them here.</p>
          </div>
        ) : (
          <>
            {/* Mobile/Tablet card list (hidden on large desktop) */}
            <div className="lg:hidden divide-y divide-slate-100">
              {projects.map(p => (
                <div key={p.id} className="p-4 sm:p-5 hover:bg-yellow-50/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                        {(p.customer_name || p.customer || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{p.customer_name || p.customer || '—'}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.client_id ? `#${p.client_id}` : `#${p.id}`}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(p)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 text-white px-3.5 py-2 rounded-xl transition-all duration-200 active:scale-95"
                    >
                      Edit <Icons.ChevronRight />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <StatusBadge status={p.status} />
                    {p.loan_approved
                      ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg">✅ Loan OK</span>
                      : <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-1 rounded-lg">⏳ Loan Pending</span>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${((p.step ?? 0) / 4) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 font-medium shrink-0">{p.step ?? 0}/4 steps</span>
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
                  {projects.map(p => (
                    <tr key={p.id} className="group hover:bg-yellow-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-500">
                        {p.client_id ? `#${p.client_id}` : `#${p.id}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {(p.customer_name || p.customer || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{p.customer_name || p.customer || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-4 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-400 to-emerald-500 rounded-full transition-all duration-700"
                              style={{ width: `${((p.step ?? 0) / 4) * 100}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 font-medium w-7 shrink-0">{p.step ?? 0}/4</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.loan_approved
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg">✅ Approved</span>
                          : <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-1 rounded-lg">⏳ Pending</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelected(p)}
                          className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 group-hover:bg-yellow-400 text-white group-hover:text-slate-900 px-4 py-2 rounded-xl transition-all duration-200"
                        >
                          Edit <Icons.ChevronRight />
                        </button>
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
function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/auth/users`)
      .then(r => r.json())
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return (
    <div className="p-4 sm:p-6 md:p-8" style={{animation:'slideUp .3s ease'}}>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800">Users & Access</h1>
        <p className="text-slate-500 text-sm mt-1">All registered app users and their roles</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <svg className="animate-spin text-yellow-500" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-24 text-slate-400">No users registered yet.</div>
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
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-sky-100 text-sky-700'}`}>{u.role || 'employee'}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const handle = async () => {
    if (!pw.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
      const data = await res.json();
      if (data.success) { onLogin(); }
      else { setError(data.error || 'Incorrect password. Please try again.'); }
    } catch {
      setError('Cannot connect to server. Please try again.');
    }
    setLoading(false);
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
          <p className="text-slate-500 text-sm mb-6">Enter your admin password to continue</p>
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
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
          <button
            onClick={handle}
            disabled={loading || !pw}
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
function MobileHeader({ onMenuOpen, onLogout }: { onMenuOpen: () => void; onLogout?: () => void }) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-950 border-b border-white/5 flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2.5">
        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        <p className="text-base font-black text-white leading-none">Ramsun<span className="text-yellow-400">Energy</span></p>
      </div>
      <div className="flex items-center gap-2">
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

/* ─── Sidebar ──────────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { to: '/', label: 'Dashboard',    icon: 'Dashboard',    end: true },
  { to: '/projects',     label: 'Projects',     icon: 'Briefcase' },
  { to: '/loans',        label: 'Loans',        icon: 'CreditCard' },
  { to: '/installations',label: 'Installations',icon: 'Zap' },
  { to: '/reminders',    label: 'Reminders',    icon: 'Bell' },
  { to: '/users',        label: 'Users',        icon: 'Users' },
  { to: '/settings',     label: 'Settings',     icon: 'Settings' },
];

function SidebarContent({ onLogout, onClose }: { onLogout?: () => void; onClose?: () => void }) {
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
        {NAV_LINKS.map(({ to, label, icon, end }) => {
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-black text-slate-900 text-sm shrink-0">A</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none text-white">Admin User</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">ramsun.admin</p>
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

function Sidebar({ onLogout, open, onClose }: { onLogout?: () => void; open?: boolean; onClose?: () => void }) {
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
            className="absolute left-0 top-0 bottom-0 w-72 bg-slate-950 text-white flex flex-col shadow-2xl"
            style={{ animation: 'slideRight .25s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent onLogout={onLogout} onClose={onClose} />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar — always visible on md+ */}
      <aside className="hidden md:flex w-56 lg:w-64 shrink-0 bg-slate-950 text-white flex-col min-h-screen sticky top-0 h-screen">
        <SidebarContent onLogout={onLogout} />
      </aside>
    </>
  );
}


/* ─── App ──────────────────────────────────────────────────────────────────── */
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ramsun_admin') === '1');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!authed) return (
    <>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:translateX(0)}}
      `}</style>
      <LoginPage onLogin={() => { sessionStorage.setItem('ramsun_admin','1'); setAuthed(true); }} />
    </>
  );

  const handleLogout = () => { sessionStorage.removeItem('ramsun_admin'); setAuthed(false); };

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
          <MobileHeader onMenuOpen={() => setSidebarOpen(true)} onLogout={handleLogout} />

          {/* Sidebar */}
          <Sidebar
            onLogout={handleLogout}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content — add top padding on mobile to clear fixed header */}
          <div className="flex-1 overflow-auto flex flex-col min-h-screen pt-14 md:pt-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects"      element={<Dashboard />} />
              <Route path="/loans"         element={<Dashboard />} />
              <Route path="/installations" element={<Dashboard />} />
              <Route path="/reminders"     element={<RemindersPage />} />
              <Route path="/users"         element={<UsersPage />} />
              <Route path="/settings"      element={<SettingsPage />} />
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
