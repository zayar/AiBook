'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Building,
  Target,
  TrendingUp,
  BarChart3,
  Award,
  Calendar,
  DollarSign,
  Users,
  Edit,
  ToggleLeft,
  ToggleRight,
  Trash2,
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react';
import { salespersonAPI, Salesperson } from '@/lib/salesperson-api';
import { useParams, useRouter } from 'next/navigation';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import Link from 'next/link';

export default function SalespersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salesperson, setSalesperson] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      fetchSalesperson(params.id as string);
    }
  }, [params.id]);

  const fetchSalesperson = async (id: string) => {
    try {
      setLoading(true);
      const response = await salespersonAPI.getSalesperson(id);
      setSalesperson(response.salesperson);
    } catch (error) {
      console.error('Error fetching salesperson:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!salesperson) return;

    try {
      await salespersonAPI.toggleSalespersonStatus(salesperson.id);
      setSalesperson((prev: any) => prev ? { ...prev, isActive: !prev.isActive } : null);
    } catch (error) {
      console.error('Error toggling salesperson status:', error);
      alert('Failed to toggle salesperson status');
    }
  };

  const handleDelete = async () => {
    if (!salesperson) return;

    if (!confirm(`Are you sure you want to delete "${salesperson.name}"?`)) {
      return;
    }

    try {
      const result = await salespersonAPI.deleteSalesperson(salesperson.id);
      alert(result.message);
      router.push('/salespeople');
    } catch (error) {
      console.error('Error deleting salesperson:', error);
      alert('Failed to delete salesperson');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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

  const getPerformanceColor = (progress?: number) => {
    if (!progress) return 'text-gray-500';
    if (progress >= 100) return 'text-green-600';
    if (progress >= 80) return 'text-blue-600';
    if (progress >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <UltraEnhancedLoading />;
  }

  if (!salesperson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Salesperson Not Found</h2>
          <p className="text-gray-600 mb-4">The salesperson you're looking for doesn't exist.</p>
          <Link href="/salespeople">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Back to Salespeople
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href="/salespeople">
              <button className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {salesperson.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                {salesperson.name}
              </h1>
              <p className="text-gray-600 mt-2">{salesperson.position || 'Sales Team Member'}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/salespeople/${salesperson.id}/edit`}>
                <button className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </Link>
              <button
                onClick={handleToggleStatus}
                className="flex items-center gap-2 px-4 py-2 text-yellow-600 border border-yellow-600 rounded-lg hover:bg-yellow-50"
              >
                {salesperson.isActive ? (
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

        {/* Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Month Sales</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(salesperson.performance?.currentMonth?.sales || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Target Progress</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(salesperson.performance?.currentMonth?.targetProgress)}`}>
                  {salesperson.performance?.currentMonth?.targetProgress?.toFixed(1) || 0}%
                </p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Invoices</p>
                <p className="text-2xl font-bold text-purple-600">{salesperson._count?.invoices || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sales Orders</p>
                <p className="text-2xl font-bold text-orange-600">{salesperson._count?.salesOrders || 0}</p>
              </div>
              <Award className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </motion.div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Personal Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Status</span>
                {getStatusBadge(salesperson.isActive)}
              </div>

              {salesperson.email && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${salesperson.email}`} className="hover:text-blue-600">
                      {salesperson.email}
                    </a>
                  </div>
                </div>
              )}

              {salesperson.phone && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Phone</span>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${salesperson.phone}`} className="hover:text-blue-600">
                      {salesperson.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Member Since</span>
                <span className="text-gray-900">
                  {new Date(salesperson.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Role Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Role & Territory
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Position</span>
                <span className="text-gray-900">{salesperson.position || '-'}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Department</span>
                <span className="text-gray-900">{salesperson.department || '-'}</span>
              </div>

              {salesperson.territory && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Territory</span>
                  <div className="flex items-center gap-2 text-gray-900">
                    <MapPin className="w-4 h-4" />
                    {salesperson.territory}
                  </div>
                </div>
              )}

              {salesperson.manager && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Manager</span>
                  <span className="text-gray-900">{salesperson.manager}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Performance Targets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance Targets
            </h2>

            <div className="space-y-6">
              {salesperson.target && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Monthly Target</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(salesperson.target)}
                    </span>
                  </div>
                  
                  {salesperson.performance?.currentMonth?.targetProgress !== undefined && (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div 
                          className="bg-blue-600 h-3 rounded-full" 
                          style={{ width: `${Math.min(salesperson.performance.currentMonth.targetProgress, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Progress: {salesperson.performance.currentMonth.targetProgress.toFixed(1)}%</span>
                        <span>
                          {formatCurrency(salesperson.performance.currentMonth.sales)} achieved
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {salesperson.commission && (
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Commission Rate</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {(salesperson.commission * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </h2>

            <div className="space-y-4">
              {salesperson.recentInvoices && salesperson.recentInvoices.length > 0 ? (
                salesperson.recentInvoices.slice(0, 5).map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-900">
                        Invoice {invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.customer?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>

            {salesperson.recentInvoices && salesperson.recentInvoices.length > 5 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="w-full text-center text-blue-600 hover:text-blue-700 font-medium">
                  View All Invoices
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Performance Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-xl border border-gray-200 mt-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Summary
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatCurrency(salesperson.performance?.currentYear?.sales || 0)}
              </div>
              <div className="text-sm text-gray-600">Year to Date Sales</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {salesperson.performance?.currentYear?.invoices || 0}
              </div>
              <div className="text-sm text-gray-600">Invoices This Year</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {salesperson.performance?.currentMonth?.invoices || 0}
              </div>
              <div className="text-sm text-gray-600">This Month's Invoices</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}