'use client';

export type InvoiceTemplateSettings = {
  logoDataUrl?: string;
  headerColor: string;
  accentColor: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  footerText: string;
  // Optional UX toggles used by the editor (not all are rendered yet)
  showOrgLogo?: boolean;
  showOrgName?: boolean;
  showOrgAddress?: boolean;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  // New: single free text block the tenant can fully control
  additionalInfo?: string;
};

const DEFAULT_SETTINGS: InvoiceTemplateSettings = {
  headerColor: '#1D4ED8',
  accentColor: '#2563EB',
  tableHeaderBg: '#F3F4F6',
  tableHeaderText: '#111827',
  footerText: 'Thank you for your business!',
  showOrgLogo: true,
  showOrgName: true,
  showOrgAddress: true,
  orientation: 'portrait',
  pageSize: 'A4',
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10,
  additionalInfo: '',
};

// Per-tenant storage key
function tenantStorageKey() {
  const tenantId = (typeof window !== 'undefined' && (localStorage.getItem('tenantId') || 'default')) || 'default';
  return `aibook.invoice.template.settings.${tenantId}`;
}

export function getTemplateSettings(): InvoiceTemplateSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(tenantStorageKey());
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<InvoiceTemplateSettings>;
    // Backward compatibility: migrate old fields to additionalInfo if needed
    const migrated: Partial<InvoiceTemplateSettings> = { ...parsed };
    if (!migrated.additionalInfo && (parsed as any)?.paymentInfoLines) {
      try {
        migrated.additionalInfo = ((parsed as any).paymentInfoLines as string[]).join('\n');
      } catch {}
    }
    return { ...DEFAULT_SETTINGS, ...migrated };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function setTemplateSettings(settings: Partial<InvoiceTemplateSettings>) {
  if (typeof window === 'undefined') return;
  const current = getTemplateSettings();
  const next = { ...current, ...settings };
  localStorage.setItem(tenantStorageKey(), JSON.stringify(next));
}


