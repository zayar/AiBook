'use client';

import React, { useState } from 'react';
import api from '@/lib/api';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
};

export default function ShareInvoiceModal({ isOpen, onClose, invoiceId }: Props) {
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  if (!isOpen) return null;

  const generate = async () => {
    try {
      setLoading(true);
      const { data } = await api.post(`/invoices/${invoiceId}/share`, { expiresInDays });
      setLink(data.publicUrl);
    } catch (e) {
      console.error('Failed to generate link:', e);
      alert('Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      } catch (e) {
        console.error('Failed to copy:', e);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleClose = () => {
    setLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Share Invoice Link</h3>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility: <span className="text-blue-600 font-semibold">Public</span>
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Select an expiration date and generate the link to share it with your customer. Remember 
              that anyone who has access to this link can view, print or download it.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Expiration Date*
            </label>
            <input 
              type="number" 
              min={1} 
              max={365}
              value={expiresInDays} 
              onChange={(e) => setExpiresInDays(parseInt(e.target.value || '1'))} 
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="30"
            />
            <p className="text-xs text-gray-500 mt-1">
              ⓘ By default, the link is set to expire 90 days from today.
            </p>
          </div>

          {link && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shareable Link
              </label>
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  readOnly 
                  value={link} 
                  className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-700 focus:outline-none"
                />
                <button 
                  onClick={copy} 
                  className={`px-4 py-2 rounded font-medium transition-all ${
                    copied 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  disabled={copied}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {link ? 'Link ready to share' : 'Generate a shareable link'}
          </div>
          <div className="flex items-center gap-2">
            {link && (
              <button 
                onClick={() => setLink(null)} 
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Disable All Active Links
              </button>
            )}
            {link ? (
              <button 
                onClick={copy} 
                className={`px-6 py-2 rounded font-medium transition-all ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                disabled={copied}
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            ) : (
              <button 
                onClick={generate} 
                disabled={loading} 
                className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Generating...' : 'Generate Link'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


