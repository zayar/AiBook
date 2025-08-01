'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { taxAPI, TaxRate } from '@/lib/tax-api';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import Link from 'next/link';

export default function TaxesPage() {
  const [loading, setLoading] = useState(true);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [filteredTaxRates, setFilteredTaxRates] = useState<TaxRate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);

  useEffect(() => {
    fetchTaxRates();
  }, []);

  useEffect(() => {
    filterTaxRates();
  }, [taxRates, searchTerm, statusFilter, typeFilter]);

  const fetchTaxRates = async () => {
    try {
      setLoading(true);
      const response = await taxAPI.getTaxRates();
      setTaxRates(response.taxRates || []);
    } catch (error) {
      console.error('Error fetching tax rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTaxRates = () => {
    let filtered = [...taxRates];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tax =>
        tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tax.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tax => 
        statusFilter === 'active' ? tax.isActive : !tax.isActive
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tax => tax.taxType === typeFilter);
    }

    setFilteredTaxRates(filtered);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await taxAPI.toggleTaxRateStatus(id);
      fetchTaxRates(); // Refresh the list
    } catch (error) {
      console.error('Error toggling tax rate status:', error);
      alert('Failed to toggle tax rate status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the tax rate "${name}"?`)) {
      return;
    }

    try {
      const result = await taxAPI.deleteTaxRate(id);
      alert(result.message);
      fetchTaxRates(); // Refresh the list
    } catch (error) {
      console.error('Error deleting tax rate:', error);
      alert('Failed to delete tax rate');
    }
  };

  const handleSelectTax = (id: string) => {
    setSelectedTaxes(prev => 
      prev.includes(id) 
        ? prev.filter(taxId => taxId !== id)
        : [...prev, id]
    );
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
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
        <AlertCircle className="w-3 h-3" />
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
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${colors[taxType] || 'bg-gray-100 text-gray-700'}`}>
        {taxType}
      </span>
    );
  };

  if (loading) {
    return <UltraEnhancedLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calculator className="w-8 h-8 text-blue-600" />
                Tax Management
              </h1>
              <p className="text-gray-600 mt-2">Manage tax rates, jurisdictions, and compliance</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
              <Link href="/taxes/new">
                <button className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  New Tax
                </button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tax Rates</p>
                  <p className="text-2xl font-bold text-gray-900">{taxRates.length}</p>
                </div>
                <Calculator className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Rates</p>
                  <p className="text-2xl font-bold text-green-600">{taxRates.filter(t => t.isActive).length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Tax Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {taxRates.length > 0 ? (taxRates.reduce((sum, t) => sum + t.rate, 0) / taxRates.length).toFixed(1) : 0}%
                  </p>
                </div>
                <Percent className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Jurisdictions</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {new Set(taxRates.map(t => t.jurisdiction)).size}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tax rates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="SALES">Sales Tax</option>
                <option value="VAT">VAT</option>
                <option value="INCOME">Income Tax</option>
                <option value="PROPERTY">Property Tax</option>
                <option value="EXCISE">Excise Tax</option>
                <option value="CUSTOMS">Customs Tax</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Tax Rates Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                    <input
                      type="checkbox"
                      checked={selectedTaxes.length === filteredTaxRates.length && filteredTaxRates.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTaxes(filteredTaxRates.map(t => t.id));
                        } else {
                          setSelectedTaxes([]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Tax Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Rate</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Jurisdiction</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Account</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTaxRates.map((taxRate) => (
                  <tr key={taxRate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.includes(taxRate.id)}
                        onChange={() => handleSelectTax(taxRate.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{taxRate.name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(taxRate.effectiveDate).toLocaleDateString()}
                        {taxRate.expiryDate && ` - ${new Date(taxRate.expiryDate).toLocaleDateString()}`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-semibold text-gray-900">{taxRate.rate}%</span>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(taxRate.taxType)}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{taxRate.jurisdiction}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(taxRate.isActive)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{taxRate.account?.name}</div>
                      <div className="text-xs text-gray-500">{taxRate.account?.code}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/taxes/${taxRate.id}`}>
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={`/taxes/${taxRate.id}/edit`}>
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(taxRate.id)}
                          className="p-1 text-gray-400 hover:text-yellow-600"
                        >
                          {taxRate.isActive ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(taxRate.id, taxRate.name)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTaxRates.length === 0 && (
            <div className="text-center py-12">
              <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tax rates found</p>
              <Link href="/taxes/new">
                <button className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                  Create your first tax rate
                </button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}