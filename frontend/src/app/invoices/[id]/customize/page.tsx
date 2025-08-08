'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { InvoiceAPI } from '@/lib/invoice-api';

export default function CustomizeInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [design, setDesign] = useState<any>({
    theme: 'classic',
    primaryColor: '#2563eb',
    showLogo: true,
    showItemTaxes: true,
    notesTitle: 'Notes',
  });
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const saveDesign = async () => {
    try {
      setSaving(true);
      await InvoiceAPI.saveDesign(invoiceId, design);
      alert('Design saved');
    } catch (e) {
      console.error(e);
      alert('Failed to save design');
    } finally {
      setSaving(false);
    }
  };

  const generateShare = async () => {
    try {
      setGenerating(true);
      const res = await InvoiceAPI.createShareLink(invoiceId, 30);
      setShareToken(res.token);
      // Prefer frontend public viewer URL for sharing
      const frontUrl = `${window.location.origin}/invoices/public/${res.token}`;
      setPublicUrl(frontUrl);
      await navigator.clipboard.writeText(frontUrl);
      alert('Share link copied to clipboard');
    } catch (e) {
      console.error(e);
      alert('Failed to generate share link');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Customize Invoice</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Theme</label>
            <select value={design.theme} onChange={e => setDesign({ ...design, theme: e.target.value })} className="border rounded px-3 py-2">
              <option value="classic">Classic</option>
              <option value="modern">Modern</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Primary Color</label>
            <input type="color" value={design.primaryColor} onChange={e => setDesign({ ...design, primaryColor: e.target.value })} />
          </div>
          <div className="flex items-center space-x-2">
            <input id="showLogo" type="checkbox" checked={design.showLogo} onChange={e => setDesign({ ...design, showLogo: e.target.checked })} />
            <label htmlFor="showLogo" className="text-sm text-gray-700">Show Logo</label>
          </div>
          <div className="flex items-center space-x-2">
            <input id="showItemTaxes" type="checkbox" checked={design.showItemTaxes} onChange={e => setDesign({ ...design, showItemTaxes: e.target.checked })} />
            <label htmlFor="showItemTaxes" className="text-sm text-gray-700">Show Item Taxes</label>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Notes Title</label>
            <input className="border rounded px-3 py-2 w-full" value={design.notesTitle} onChange={e => setDesign({ ...design, notesTitle: e.target.value })} />
          </div>

          <div className="flex space-x-3 pt-2">
            <button onClick={saveDesign} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Design'}</button>
            <button onClick={generateShare} disabled={generating} className="px-4 py-2 rounded border border-green-300 text-green-700 disabled:opacity-50">{generating ? 'Generating...' : 'Generate Share Link'}</button>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Share</h2>
          {publicUrl ? (
            <div className="space-y-2">
              <div className="text-sm break-all">{publicUrl}</div>
              <a className="text-blue-600 underline" href={publicUrl} target="_blank">Open public view</a>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Generate a shareable public link to let customers view this invoice.</p>
          )}
        </div>
      </div>
    </div>
  );
}


