'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  Building,
  DollarSign,
  Info,
  Save,
  AlertCircle
} from 'lucide-react';
import { taxAPI, TaxRate, UpdateTaxRateRequest } from '@/lib/tax-api';
import { useParams, useRouter } from 'next/navigation';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import Link from 'next/link';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function EditTaxPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRate, setTaxRate] = useState<TaxRate | null>(null);
  const [formData, setFormData] = useState<UpdateTaxRateRequest>({
    name: '',
    rate: 0,
    jurisdiction: '',
    taxType: 'SALES',
    accountId: '',
    effectiveDate: '',
    expiryDate: '',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.id) {
      fetchTaxRate(params.id as string);
      fetchAccounts();
    }
  }, [params.id]);

  const fetchTaxRate = async (id: string) => {
    try {
      setLoading(true);
      const response = await taxAPI.getTaxRates();
      const foundTaxRate = response.taxRates.find(rate => rate.id === id);
      if (foundTaxRate) {
        setTaxRate(foundTaxRate);
        setFormData({
          name: foundTaxRate.name,
          rate: foundTaxRate.rate,
          jurisdiction: foundTaxRate.jurisdiction,
          taxType: foundTaxRate.taxType,
          accountId: foundTaxRate.accountId,
          effectiveDate: foundTaxRate.effectiveDate.split('T')[0],
          expiryDate: foundTaxRate.expiryDate ? foundTaxRate.expiryDate.split('T')[0] : '',
          isActive: foundTaxRate.isActive
        });
      }
    } catch (error) {
      console.error('Error fetching tax rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await taxAPI.getAccounts();
      setAccounts(response.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Tax name is required';
    }

    if (!formData.rate || formData.rate <= 0 || formData.rate > 100) {
      newErrors.rate = 'Tax rate must be between 0.01 and 100';
    }

    if (!formData.jurisdiction?.trim()) {
      newErrors.jurisdiction = 'Jurisdiction is required';
    }

    if (!formData.accountId) {
      newErrors.accountId = 'Tax account is required';
    }

    if (!formData.effectiveDate) {
      newErrors.effectiveDate = 'Effective date is required';
    }

    if (formData.expiryDate && new Date(formData.expiryDate) <= new Date(formData.effectiveDate!)) {
      newErrors.expiryDate = 'Expiry date must be after effective date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : name === 'rate' 
          ? parseFloat(value) || 0 
          : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !taxRate) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await taxAPI.updateTaxRate(taxRate.id, formData);
      console.log('Tax rate updated:', response);
      router.push(`/taxes/${taxRate.id}`);
    } catch (error: any) {
      console.error('Error updating tax rate:', error);
      alert(error.message || 'Failed to update tax rate');
    } finally {
      setSubmitting(false);
    }
  };

  const taxTypes = [
    { value: 'SALES', label: 'Sales Tax' },
    { value: 'VAT', label: 'Value Added Tax (VAT)' },
    { value: 'INCOME', label: 'Income Tax' },
    { value: 'PROPERTY', label: 'Property Tax' },
    { value: 'EXCISE', label: 'Excise Tax' },
    { value: 'CUSTOMS', label: 'Customs Tax' }
  ];

  const jurisdictions = [
    'Myanmar',
    'Yangon Region',
    'Mandalay Region',
    'Naypyidaw',
    'Bago Region',
    'Magway Region',
    'Tanintharyi Region',
    'Ayeyarwady Region',
    'Sagaing Region',
    'Shan State',
    'Kachin State',
    'Kayah State',
    'Kayin State',
    'Chin State',
    'Mon State',
    'Rakhine State'
  ];

  if (loading) {
    return <UltraEnhancedLoading />;
  }

  if (!taxRate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tax Rate Not Found</h2>
          <p className="text-gray-600 mb-4">The tax rate you're trying to edit doesn't exist.</p>
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
            <Link href={`/taxes/${taxRate.id}`}>
              <button className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calculator className="w-8 h-8 text-blue-600" />
                Edit Tax Rate
              </h1>
              <p className="text-gray-600 mt-2">Update tax rate information and configuration</p>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Commercial Tax, VAT"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="rate"
                    value={formData.rate}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full px-4 py-3 pr-8 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.rate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
                {errors.rate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.rate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Type *
                </label>
                <select
                  name="taxType"
                  value={formData.taxType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {taxTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jurisdiction *
                </label>
                <select
                  name="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.jurisdiction ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select jurisdiction</option>
                  {jurisdictions.map(jurisdiction => (
                    <option key={jurisdiction} value={jurisdiction}>
                      {jurisdiction}
                    </option>
                  ))}
                </select>
                {errors.jurisdiction && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.jurisdiction}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Account *
                </label>
                <select
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.accountId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select tax account</option>
                  {accounts
                    .filter(account => account.type === 'LIABILITY')
                    .map(account => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                </select>
                {errors.accountId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.accountId}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Select the liability account where collected taxes will be recorded
                </p>
              </div>

              <div>
                <label className="flex items-center gap-3 mt-4">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Tax rate is active</span>
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  Inactive tax rates cannot be used in new calculations
                </p>
              </div>
            </div>
          </motion.div>

          {/* Date Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effective Date *
                </label>
                <input
                  type="date"
                  name="effectiveDate"
                  value={formData.effectiveDate}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.effectiveDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.effectiveDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.effectiveDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.expiryDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.expiryDate}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty if this tax rate doesn't expire
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-end gap-4 pt-6"
          >
            <Link href={`/taxes/${taxRate.id}`}>
              <button
                type="button"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Updating...' : 'Update Tax Rate'}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}