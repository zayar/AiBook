'use client';

import React from 'react';
import { Users } from 'lucide-react';

export default function CustomersLoading(): JSX.Element {
  const rows = Array.from({ length: 8 });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Loading Customers
          </h1>
          <p className="text-gray-500 mt-1">Fetching customer list and balances…</p>
        </div>

        {/* Filters/Search skeleton */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 flex-1 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <ul className="divide-y divide-gray-100">
            {rows.map((_, i) => (
              <li key={i} className="px-6 py-4">
                <div className="grid grid-cols-6 gap-4 items-center">
                  <div className="col-span-2 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="col-span-1 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="col-span-1 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="col-span-1 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="col-span-1 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}


