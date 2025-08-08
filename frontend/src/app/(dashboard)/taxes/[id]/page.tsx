'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  Building,
  DollarSign,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  FileText,
  Clock
} from 'lucide-react';
import { taxAPI, TaxRate } from '@/lib/tax-api';
import { useParams, useRouter } from 'next/navigation';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import Link from 'next/link';

export default function TaxDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [taxRate, setTaxRate] = useState<TaxRate | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTaxRate(params.id as string);
    }
  }, [params.id]);

  const fetchTaxRate = async (id: string) => {
    try {
      setLoading(true);
      const response = await taxAPI.getTaxRates();
      const foundTaxRate = response.taxRates.find(rate => rate.id === id);
      setTaxRate(foundTaxRate || null);
    } catch (error) {
      console.error('Error fetching tax rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!taxRate) return;

    try {
      await taxAPI.toggleTaxRateStatus(taxRate.id);
      setTaxRate(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
    } catch (error) {
      console.error('Error toggling tax rate status:', error);
      alert('Failed to toggle tax rate status');
    }
  };

  const handleDelete = async () => {
    if (!taxRate) return;

    if (!confirm(`Are you sure you want to delete the tax rate "${taxRate.name}"?`)) {
      return;
    }

    try {
      const result = await taxAPI.deleteTaxRate(taxRate.id);
      alert(result.message);
      router.push('/taxes');
    } catch (error) {
      console.error('Error deleting tax rate:', error);
      alert('Failed to delete tax rate');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
        <CheckCircle className="w-4 h-4" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-full">
        <AlertCircle className="w-4 h-4" />
        Inactive
      </span>
    );
  };

  const getTypeBadge = (taxType: string) => {
    const colors: Record<string, string> = {
      SALES: 'bg-blue-100 text-blue-700',
      VAT: 'bg-purple-100 text-purple-700',
      INCOME: 'bg-green-100 text-green-700',
      PROPERTY: 'bg-orange-100 text-orange-700',
      EXCISE: 'bg-red-100 text-red-700',
      CUSTOMS: 'bg-yellow-100 text-yellow-700'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${colors[taxType] || 'bg-gray-100 text-gray-700'}`}>
        {taxType}
      </span>
    );
  };

  if (loading) {
    return <UltraEnhancedLoading />;
  }

  if (!taxRate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tax Rate Not Found</h2>
          <p className="text-gray-600 mb-4">The tax rate you're looking for doesn't exist.</p>
          <Link href="/taxes">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Back to Tax Rates
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href="/taxes">
              <button className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calculator className="w-8 h-8 text-blue-600" />
                {taxRate.name}
              </h1>
              <p className="text-gray-600 mt-2">Tax rate details and configuration</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/taxes/${taxRate.id}/edit`}>
                <button className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </Link>
              <button
                onClick={handleToggleStatus}
                className="flex items-center gap-2 px-4 py-2 text-yellow-600 border border-yellow-600 rounded-lg hover:bg-yellow-50"
              >
                {taxRate.isActive ? (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="w-4 h-4" />
                    Activate
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tax Rate Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl border border-gray-200 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{taxRate.rate}%</div>
              <div className="text-sm text-gray-600">Tax Rate</div>
            </div>
            <div className="text-center">
              <div className="mb-2">{getTypeBadge(taxRate.taxType)}</div>
              <div className="text-sm text-gray-600">Tax Type</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 mb-1">{taxRate.jurisdiction}</div>
              <div className="text-sm text-gray-600">Jurisdiction</div>
            </div>
            <div className="text-center">
              <div className="mb-2">{getStatusBadge(taxRate.isActive)}</div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
        </motion.div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tax Name</label>
                <div className="text-gray-900">{taxRate.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tax Rate</label>
                <div className="text-gray-900 text-lg font-semibold">{taxRate.rate}%</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tax Type</label>
                <div>{getTypeBadge(taxRate.taxType)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Jurisdiction</label>
                <div className="text-gray-900">{taxRate.jurisdiction}</div>
              </div>
            </div>
          </motion.div>

          {/* Account Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Account Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Code</label>
                <div className="text-gray-900 font-mono">{taxRate.account?.code}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Name</label>
                <div className="text-gray-900">{taxRate.account?.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Type</label>
                <div className="text-gray-900">{taxRate.account?.type}</div>
              </div>
            </div>
          </motion.div>

          {/* Date Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Effective Date</label>
                <div className="text-gray-900">
                  {new Date(taxRate.effectiveDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Expiry Date</label>
                <div className="text-gray-900">
                  {taxRate.expiryDate 
                    ? new Date(taxRate.expiryDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'No expiry date'
                  }
                </div>
              </div>
            </div>
          </motion.div>

          {/* Activity Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Activity Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                <div className="text-gray-900">
                  {new Date(taxRate.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                <div className="text-gray-900">
                  {new Date(taxRate.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Usage Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-xl border border-gray-200 mt-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Usage Statistics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">0</div>
              <div className="text-sm text-gray-600">Total Calculations</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">$0.00</div>
              <div className="text-sm text-gray-600">Total Tax Collected</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-1">0</div>
              <div className="text-sm text-gray-600">Active Invoices</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Info className="w-4 h-4" />
              <span className="font-medium">Tax Calculation Info</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              This tax rate is applied to taxable amounts and recorded in the associated liability account. 
              The collected tax amount must be paid to the {taxRate.jurisdiction} tax authority.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}