import JSZip from 'jszip';

export interface ProjectData {
  id: number;
  client_id?: string | number;
  customer_name?: string;
  customer?: string;
  phone?: string;
  contact_number?: string;
  email?: string;
  address?: string;
  site_location?: string;
  capacity?: string;
  kw_capacity?: string;
  aadhar_number?: string;
  pan_number?: string;
  meter_number?: string;
  step?: number;
  status?: string;
  loan_approved?: boolean | number;
  needs_upcl?: boolean | number;
  transfer_remarks?: string;
  transferred_by?: string;
  created_at?: string;
  site_photo?: string;
  agreement?: string;
  quotation?: string;
  inst_photo_1?: string;
  inst_photo_2?: string;
  dcr?: string;
}

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const sanitizeFileName = (name: string) => {
  return (name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
};

const getFileExtension = (path: string, fallback: string) => {
  if (!path) return fallback;
  const match = path.match(/\.([a-zA-Z0-9]+)(\?|$)/);
  return match ? `.${match[1].toLowerCase()}` : fallback;
};

export const exportProjectsToExcel = (projects: ProjectData[]) => {
  const headers = [
    'Client ID',
    'Customer Name',
    'Contact Number',
    'Email',
    'Address',
    'Site Location',
    'Capacity (kW)',
    'Aadhar Number',
    'PAN Number',
    'Meter Number',
    'Workflow Step',
    'Current Status',
    'Loan Approved',
    'UPCL Issue',
    'Transfer Remarks',
    'Transferred By',
    'Created Date',
    'Quotation Doc URL',
    'Agreement Doc URL',
    'Site Photo URL',
    'Inst Photo 1 URL',
    'Inst Photo 2 URL',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = projects.map(p => [
    escapeCsv(p.client_id ? `#${p.client_id}` : `#${p.id}`),
    escapeCsv(p.customer_name || p.customer || ''),
    escapeCsv(p.contact_number || p.phone || ''),
    escapeCsv(p.email || ''),
    escapeCsv(p.address || ''),
    escapeCsv(p.site_location || ''),
    escapeCsv(p.kw_capacity || p.capacity || ''),
    escapeCsv(p.aadhar_number || ''),
    escapeCsv(p.pan_number || ''),
    escapeCsv(p.meter_number || ''),
    escapeCsv(p.step || 1),
    escapeCsv(p.status || ''),
    escapeCsv(p.loan_approved ? 'Yes' : 'No'),
    escapeCsv(p.needs_upcl ? 'Yes' : 'No'),
    escapeCsv(p.transfer_remarks || ''),
    escapeCsv(p.transferred_by || ''),
    escapeCsv(p.created_at ? new Date(p.created_at).toLocaleDateString() : ''),
    escapeCsv(p.quotation || ''),
    escapeCsv(p.agreement || ''),
    escapeCsv(p.site_photo || ''),
    escapeCsv(p.inst_photo_1 || ''),
    escapeCsv(p.inst_photo_2 || ''),
    escapeCsv(p.dcr || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(blob, `Ramsun_Solar_Projects_${dateStr}.csv`);
};

export const generateClientInfoText = (p: ProjectData) => {
  return [
    '======================================================',
    '              RAMSUN SOLAR - CLIENT DOSSIER           ',
    '======================================================',
    `Client ID:        ${p.client_id ? `#${p.client_id}` : `#${p.id}`}`,
    `Customer Name:    ${p.customer_name || p.customer || '—'}`,
    `Phone / Contact:  ${p.contact_number || p.phone || '—'}`,
    `Email:            ${p.email || '—'}`,
    `Address:          ${p.address || '—'}`,
    `Site Location:    ${p.site_location || '—'}`,
    `Capacity:         ${p.kw_capacity || p.capacity ? `${p.kw_capacity || p.capacity} kW` : '—'}`,
    `Aadhar Number:    ${p.aadhar_number || '—'}`,
    `PAN Number:       ${p.pan_number || '—'}`,
    `Meter Number:     ${p.meter_number || '—'}`,
    '------------------------------------------------------',
    `Workflow Step:    Step ${p.step || 1}`,
    `Current Status:   ${p.status || 'Registration'}`,
    `Loan Approved:    ${p.loan_approved ? 'Approved' : 'Pending'}`,
    `UPCL Issue:       ${p.needs_upcl ? 'Referred to UPCL' : 'Normal'}`,
    `Transfer Note:    ${p.transfer_remarks || 'None'}`,
    `Transferred By:   ${p.transferred_by || 'None'}`,
    `Created At:       ${p.created_at || '—'}`,
    '======================================================',
    'DOCUMENTS ATTACHED:',
    `- Quotation:      ${p.quotation ? 'Attached' : 'Not Uploaded'}`,
    `- Agreement:      ${p.agreement ? 'Attached' : 'Not Uploaded'}`,
    `- Site Photo:     ${p.site_photo ? 'Attached' : 'Not Uploaded'}`,
    `- Inst Photo 1:   ${p.inst_photo_1 ? 'Attached' : 'Not Uploaded'}`,
    `- Inst Photo 2:   ${p.inst_photo_2 ? 'Attached' : 'Not Uploaded'}`,
    `- DCR Document:   ${p.dcr ? 'Attached' : 'Not Uploaded'}`,
    '======================================================',
  ].join('\r\n');
};

const fetchFileBlob = async (url: string): Promise<Blob | null> => {
  try {
    let resolvedUrl = url;
    if (resolvedUrl.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
      resolvedUrl = `${window.location.origin}${resolvedUrl}`;
    }
    const res = await fetch(resolvedUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
};

export const downloadSingleClientZip = async (
  p: ProjectData,
  getUploadUrl: (path: string) => string,
  onStatus?: (msg: string) => void
) => {
  const zip = new JSZip();
  const safeName = sanitizeFileName(p.customer_name || p.customer || `Client_${p.id}`);
  const folderName = `Client_#${p.client_id || p.id}_${safeName}`;
  const folder = zip.folder(folderName) || zip;

  onStatus?.('Generating client details...');
  folder.file('Client_Info.txt', generateClientInfoText(p));

  const docList = [
    { key: 'quotation', label: 'Quotation', fallbackExt: '.pdf' },
    { key: 'agreement', label: 'Signed_Agreement', fallbackExt: '.pdf' },
    { key: 'site_photo', label: 'Site_Photo', fallbackExt: '.jpg' },
    { key: 'inst_photo_1', label: 'Installation_Photo_1', fallbackExt: '.jpg' },
    { key: 'inst_photo_2', label: 'Installation_Photo_2', fallbackExt: '.jpg' },
    { key: 'dcr', label: 'DCR_Document', fallbackExt: '.pdf' },
  ];

  for (const doc of docList) {
    const filePath = (p as any)[doc.key];
    if (filePath) {
      onStatus?.(`Downloading ${doc.label}...`);
      const fullUrl = getUploadUrl(filePath);
      const blob = await fetchFileBlob(fullUrl);
      if (blob) {
        const ext = getFileExtension(filePath, doc.fallbackExt);
        folder.file(`${doc.label}${ext}`, blob);
      }
    }
  }

  onStatus?.('Packaging ZIP archive...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(zipBlob, `${folderName}.zip`);
};

export const downloadAllProjectsZip = async (
  projects: ProjectData[],
  getUploadUrl: (path: string) => string,
  onProgress?: (percent: number, msg: string) => void
) => {
  const zip = new JSZip();

  onProgress?.(2, 'Building overview spreadsheet...');
  // Summary CSV in root
  const headers = [
    'Client ID',
    'Customer Name',
    'Contact Number',
    'Email',
    'Address',
    'Site Location',
    'Capacity (kW)',
    'Aadhar',
    'PAN',
    'Meter',
    'Step',
    'Status',
    'Loan Approved',
    'UPCL Issue',
    'Transfer Remarks',
    'Transferred By',
    'Created At',
    'Quotation',
    'Agreement',
    'Site Photo',
    'Inst Photo 1',
    'Inst Photo 2',
    'DCR Document',
  ];
  const escapeCsv = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
  const csvRows = projects.map(p => [
    escapeCsv(p.client_id ? `#${p.client_id}` : `#${p.id}`),
    escapeCsv(p.customer_name || p.customer || ''),
    escapeCsv(p.contact_number || p.phone || ''),
    escapeCsv(p.email || ''),
    escapeCsv(p.address || ''),
    escapeCsv(p.site_location || ''),
    escapeCsv(p.kw_capacity || p.capacity || ''),
    escapeCsv(p.aadhar_number || ''),
    escapeCsv(p.pan_number || ''),
    escapeCsv(p.meter_number || ''),
    escapeCsv(p.step || 1),
    escapeCsv(p.status || ''),
    escapeCsv(p.loan_approved ? 'Yes' : 'No'),
    escapeCsv(p.needs_upcl ? 'Yes' : 'No'),
    escapeCsv(p.transfer_remarks || ''),
    escapeCsv(p.transferred_by || ''),
    escapeCsv(p.created_at || ''),
    escapeCsv(p.quotation || ''),
    escapeCsv(p.agreement || ''),
    escapeCsv(p.site_photo || ''),
    escapeCsv(p.inst_photo_1 || ''),
    escapeCsv(p.inst_photo_2 || ''),
    escapeCsv(p.dcr || ''),
  ].join(','));
  const csvText = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
  zip.file('00_All_Projects_Summary.csv', csvText);

  const total = projects.length;
  for (let i = 0; i < total; i++) {
    const p = projects[i];
    const pct = Math.round(5 + ((i + 1) / total) * 85);
    const safeName = sanitizeFileName(p.customer_name || p.customer || `Client_${p.id}`);
    const clientFolder = zip.folder(`Clients/Client_#${p.client_id || p.id}_${safeName}`);

    if (clientFolder) {
      onProgress?.(pct, `Processing client ${i + 1} of ${total}: ${p.customer_name || `Client #${p.id}`}`);
      clientFolder.file('Client_Info.txt', generateClientInfoText(p));

      const docList = [
        { key: 'quotation', label: 'Quotation', fallbackExt: '.pdf' },
        { key: 'agreement', label: 'Signed_Agreement', fallbackExt: '.pdf' },
        { key: 'site_photo', label: 'Site_Photo', fallbackExt: '.jpg' },
        { key: 'inst_photo_1', label: 'Installation_Photo_1', fallbackExt: '.jpg' },
        { key: 'inst_photo_2', label: 'Installation_Photo_2', fallbackExt: '.jpg' },
        { key: 'dcr', label: 'DCR_Document', fallbackExt: '.pdf' },
      ];

      for (const doc of docList) {
        const filePath = (p as any)[doc.key];
        if (filePath) {
          const fullUrl = getUploadUrl(filePath);
          const blob = await fetchFileBlob(fullUrl);
          if (blob) {
            const ext = getFileExtension(filePath, doc.fallbackExt);
            clientFolder.file(`${doc.label}${ext}`, blob);
          }
        }
      }
    }
  }

  onProgress?.(95, 'Finalizing master ZIP archive...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(zipBlob, `Ramsun_Solar_All_Clients_Archive_${dateStr}.zip`);
  onProgress?.(100, 'Download complete!');
};
