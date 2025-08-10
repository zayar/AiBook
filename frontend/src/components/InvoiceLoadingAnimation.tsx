'use client';

import React from 'react';
import { FileText, Clock, DollarSign, Users } from 'lucide-react';

const InvoiceLoadingAnimation: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
      <div className="max-w-md w-full p-8">
        {/* Main Loading Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FileText className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Invoices</h3>
            <p className="text-gray-500">Fetching your invoice data...</p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-sm text-gray-600 animate-pulse">Connecting to database...</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <Users className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-sm text-gray-400">Loading customer data...</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-sm text-gray-400">Calculating amounts...</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <Clock className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-sm text-gray-400">Organizing by date...</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '40%' }}></div>
          </div>

          {/* Invoice Cards Preview */}
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 animate-pulse opacity-75">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-12"></div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 animate-pulse opacity-50">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-14"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Dots */}
        <div className="flex justify-center mt-8 space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceLoadingAnimation;
