import { Platform, Share, Alert, Linking } from 'react-native';

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

export const exportProjectsToExcelMobile = async (
  projects: any[],
  roleName?: string,
  downloadUrl?: string
) => {
  if (!projects || projects.length === 0) {
    Alert.alert('No Projects', 'No projects found in this section to export.');
    return;
  }

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
    'DCR',
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
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanRole = (roleName || 'member').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Ramsun_Projects_${cleanRole}_${dateStr}.csv`;

  // 1. Web Environment (Desktop/Mobile Web)
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    } catch (e) {
      console.warn('Web blob download failed, falling back:', e);
    }
  }

  // 2. Native Mobile APK (Android / iOS)
  // Offer immediate options: Download direct file or Share to WhatsApp/Drive/Excel
  if (downloadUrl) {
    Alert.alert(
      'Export Projects Data',
      `Export ${projects.length} project(s) in Excel/CSV format:`,
      [
        {
          text: '📥 Download File (.csv)',
          onPress: () => {
            Linking.openURL(downloadUrl).catch(() => {
              Alert.alert('Download Error', 'Could not open browser for download.');
            });
          }
        },
        {
          text: '📤 Share / Send CSV',
          onPress: async () => {
            try {
              await Share.share({
                title: fileName,
                message: csvContent,
              });
            } catch (err: any) {
              Alert.alert('Export Error', err?.message || 'Share failed.');
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  } else {
    try {
      await Share.share({
        title: fileName,
        message: csvContent,
      });
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Share failed.');
    }
  }
};
