'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InvoiceViewer from '@/components/InvoiceViewer';
import { getTemplateSettings, setTemplateSettings } from '@/lib/invoice-template';

export default function CustomizeInvoiceTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const initial = getTemplateSettings();
  const [headerColor, setHeaderColor] = useState(initial.headerColor);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [tableHeaderBg, setTableHeaderBg] = useState(initial.tableHeaderBg);
  const [tableHeaderText, setTableHeaderText] = useState(initial.tableHeaderText);
  const [footerText, setFooterText] = useState(initial.footerText);
  const [showOrgLogo, setShowOrgLogo] = useState(!!initial.showOrgLogo);
  const [showOrgName, setShowOrgName] = useState(!!initial.showOrgName);
  const [showOrgAddress, setShowOrgAddress] = useState(!!initial.showOrgAddress);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(initial.orientation || 'portrait');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>(initial.pageSize || 'A4');
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(initial.logoDataUrl);
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState<'header' | 'footer'>('header');
  const [additionalInfo, setAdditionalInfo] = useState(initial.additionalInfo || '');

  const sampleInvoice = useMemo(() => ({
    invoiceNumber: 'INV-PREVIEW',
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    currency: 'MMK',
    subtotal: 1200000,
    taxAmount: 0,
    totalAmount: 1200000,
    paidAmount: 0,
    customer: { name: 'Preview Customer', email: 'preview@example.com' },
    items: [
      { description: 'Design Service', quantity: 1, unitPrice: 1200000, taxRate: 0, totalPrice: 1200000 },
    ],
  }), []);

  const persist = () => setTemplateSettings({ headerColor, accentColor, tableHeaderBg, tableHeaderText, footerText, logoDataUrl, showOrgLogo, showOrgName, showOrgAddress, orientation, pageSize, additionalInfo });

  const onLogoChange = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoDataUrl(dataUrl);
      setTemplateSettings({ logoDataUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-semibold">Customize Invoice Template</h1>
          <p className="text-sm text-gray-600">Fine-tune colors, logo and footer for a modern professional invoice.</p>
        </div>
        <div className="space-x-2">
          <button onClick={() => router.push(`/invoices/${invoiceId}`)} className="px-4 py-2 border border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={() => { if (typeof window !== 'undefined') window.print(); }} className="px-4 py-2 border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 rounded-lg">Download PDF</button>
          <button onClick={() => { persist(); alert('Template saved'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
        </div>
      </div>

      {/* Side-by-side workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
        {/* Left: Controls */}
        <div className="xl:col-span-1 bg-white rounded-xl border p-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button className={`px-4 py-2 text-sm ${activeTab==='header' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600'}`} onClick={()=>setActiveTab('header')}>Header</button>
            <button className={`px-4 py-2 text-sm ${activeTab==='footer' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600'}`} onClick={()=>setActiveTab('footer')}>Footer</button>
          </div>

          {/* Panels */}
          <div className="p-4 space-y-6">
            {activeTab==='header' && (
              <>
                <div>
                  <div className="font-medium mb-2">Brand Logo</div>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files && onLogoChange(e.target.files[0])} />
                  {logoDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="logo" src={logoDataUrl} className="mt-2 h-12 w-12 object-contain" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="text-sm">Header Color
                    <input className="block w-full h-10 mt-1" type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} onBlur={persist} />
                  </label>
                  <label className="text-sm">Accent Color
                    <input className="block w-full h-10 mt-1" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} onBlur={persist} />
                  </label>
                  <label className="text-sm">Table Header BG
                    <input className="block w-full h-10 mt-1" type="color" value={tableHeaderBg} onChange={(e) => setTableHeaderBg(e.target.value)} onBlur={persist} />
                  </label>
                  <label className="text-sm">Table Header Text
                    <input className="block w-full h-10 mt-1" type="color" value={tableHeaderText} onChange={(e) => setTableHeaderText(e.target.value)} onBlur={persist} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="text-sm flex items-center space-x-2">
                    <input type="checkbox" checked={showOrgLogo} onChange={(e)=>{setShowOrgLogo(e.target.checked);persist();}} />
                    <span>Show Organization Logo</span>
                  </label>
                  <label className="text-sm flex items-center space-x-2">
                    <input type="checkbox" checked={showOrgName} onChange={(e)=>{setShowOrgName(e.target.checked);persist();}} />
                    <span>Show Organization Name</span>
                  </label>
                  <label className="text-sm flex items-center space-x-2">
                    <input type="checkbox" checked={showOrgAddress} onChange={(e)=>{setShowOrgAddress(e.target.checked);persist();}} />
                    <span>Show Organization Address</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="text-sm">Orientation
                    <select className="block w-full mt-1 border rounded p-2" value={orientation} onChange={(e)=>{setOrientation(e.target.value as any);persist();}}>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>
                  <label className="text-sm">Page Size
                    <select className="block w-full mt-1 border rounded p-2" value={pageSize} onChange={(e)=>{setPageSize(e.target.value as any);persist();}}>
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </label>
                </div>
              </>
            )}

            {activeTab==='footer' && (
              <>
                <div>
                  <div className="text-sm mb-1">Footer Text</div>
                  <textarea className="w-full border rounded p-2" rows={3} value={footerText} onChange={(e) => setFooterText(e.target.value)} onBlur={persist} />
                </div>

                <div>
                  <div className="font-medium mb-2">Additional Information</div>
                  <p className="text-xs text-gray-600 mb-2">Free text. Use Enter for new lines. Saved per-tenant.</p>
                  <textarea
                    className="w-full border rounded p-2 min-h-[160px]"
                    placeholder={`Example:\nAYA Bank — Account No: ...\nKBZ Bank — ...`}
                    value={additionalInfo}
                    onChange={(e)=>setAdditionalInfo(e.target.value)}
                    onBlur={persist}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Live Preview (always visible, no popup) */}
        <div className="xl:col-span-2">
          <div className="font-medium mb-2">Live Preview</div>
          <InvoiceViewer embedded visible invoice={sampleInvoice} />
        </div>
      </div>
    </div>
  );
}
