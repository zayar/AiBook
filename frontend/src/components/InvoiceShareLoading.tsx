import React from 'react';
import { FileText, ShieldCheck, Download, Printer } from 'lucide-react';

export default function InvoiceShareLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full max-w-xl mx-auto text-center p-8">
        <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
          <FileText className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">Preparing Your Invoice</h1>
        <p className="mt-2 text-gray-600">Were securely fetching the invoice details shared with you.</p>

        {/* Progress bar */}
        <div className="mt-6 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 animate-[progress_1.6s_ease_infinite]" style={{ width: '40%' }} />
        </div>

        {/* Helpful hints */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span>Secure link</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Printer className="h-4 w-4 text-gray-700" />
            <span>Ready to print</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Download className="h-4 w-4 text-gray-700" />
            <span>Download PDF</span>
          </div>
        </div>

        {/* Subtle skeleton preview */}
        <div className="mt-8 bg-white border rounded-xl shadow-sm p-4 space-y-3">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-gray-200 rounded animate-pulse" />
          <div className="h-24 w-full bg-gray-100 rounded animate-pulse" />
          <div className="h-8 w-36 bg-gray-200 rounded animate-pulse ml-auto" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes progress {
          0% { transform: translateX(-60%); }
          50% { transform: translateX(10%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
}
