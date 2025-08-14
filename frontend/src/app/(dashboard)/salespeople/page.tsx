'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck,
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
  Users,
  Mail,
  Phone,
  MapPin,
  Target,
  Award,
  Building,
  BarChart3
} from 'lucide-react';
import { salespersonAPI, Salesperson } from '@/lib/salesperson-api';
import SalespeopleLoading from '@/components/SalespeopleLoading';
import Link from 'next/link';

export default function Salespeople() {
  const [loading, setLoading] = useState(true);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [filteredSalespeople, setFilteredSalespeople] = useState<Salesperson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedSalespeople, setSelectedSalespeople] = useState<string[]>([]);

  useEffect(() => {
    fetchSalespeople();
  }, []);

  useEffect(() => {
    filterSalespeople();
  }, [salespeople, searchTerm, statusFilter, departmentFilter]);

  const fetchSalespeople = async () => {
    try {
      setLoading(true);
      const response = await salespersonAPI.getSalespeople();
      setSalespeople(response.salespeople || []);
    } catch (error) {
      console.error('Error fetching salespeople:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSalespeople = () => {
    let filtered = [...salespeople];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(person =>
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.territory?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(person => 
        statusFilter === 'active' ? person.isActive : !person.isActive
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(person => person.department === departmentFilter);
    }

    setFilteredSalespeople(filtered);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await salespersonAPI.toggleSalespersonStatus(id);
      fetchSalespeople(); // Refresh the list
    } catch (error) {
      console.error('Error toggling salesperson status:', error);
      alert('Failed to toggle salesperson status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const result = await salespersonAPI.deleteSalesperson(id);
      alert(result.message);
      fetchSalespeople(); // Refresh the list
    } catch (error) {
      console.error('Error deleting salesperson:', error);
      alert('Failed to delete salesperson');
    }
  };

  const handleSelectSalesperson = (id: string) => {
    setSelectedSalespeople(prev => 
      prev.includes(id) 
        ? prev.filter(personId => personId !== id)
        : [...prev, id]
    );
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

  const getPerformanceColor = (progress?: number) => {
    if (!progress) return 'text-gray-500';
    if (progress >= 100) return 'text-green-600';
    if (progress >= 80) return 'text-blue-600';
    if (progress >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDepartments = () => {
    const departments = [...new Set(salespeople.map(p => p.department).filter(Boolean))];
    return departments;
  };

  if (loading) {
    return <SalespeopleLoading />;
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
                <UserCheck className="w-8 h-8 text-blue-600" />
                Sales Team Management
              </h1>
              <p className="text-gray-600 mt-2">Manage your sales team and track performance</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
              <Link href="/salespeople/new">
                <button className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  New Salesperson
                </button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Team</p>
                  <p className="text-2xl font-bold text-gray-900">{salespeople.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{salespeople.filter(p => p.isActive).length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Departments</p>
                  <p className="text-2xl font-bold text-purple-600">{getDepartments().length}</p>
                </div>
                <Building className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Performance</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {salespeople.length > 0 
                      ? Math.round(
                          salespeople
                            .filter(p => p.performance?.targetProgress)
                            .reduce((sum, p) => sum + (p.performance?.targetProgress || 0), 0) /
                          salespeople.filter(p => p.performance?.targetProgress).length || 1
                        )
                      : 0}%
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
                  placeholder="Search salespeople..."
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

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Departments</option>
                {getDepartments().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Salespeople Table */}
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
                      checked={selectedSalespeople.length === filteredSalespeople.length && filteredSalespeople.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSalespeople(filteredSalespeople.map(p => p.id));
                        } else {
                          setSelectedSalespeople([]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Position</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Department</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Performance</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Activity</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSalespeople.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSalespeople.includes(person.id)}
                        onChange={() => handleSelectSalesperson(person.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{person.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-4">
                            {person.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {person.email}
                              </span>
                            )}
                            {person.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {person.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{person.position || '-'}</div>
                      {person.territory && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {person.territory}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{person.department || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {person.performance?.targetProgress != null ? (
                          <>
                            <div className={`text-sm font-medium ${getPerformanceColor(person.performance.targetProgress)}`}>
                              {person.performance.targetProgress.toFixed(1)}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(person.performance.targetProgress, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(person.performance.currentMonthSales || 0)} / {formatCurrency(person.target || 0)}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">No target set</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(person.isActive)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-3 h-3 text-blue-500" />
                          <span>{person._count?.invoices || 0} invoices</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-3 h-3 text-green-500" />
                          <span>{person._count?.salesOrders || 0} orders</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/salespeople/${person.id}`}>
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={`/salespeople/${person.id}/edit`}>
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(person.id)}
                          className="p-1 text-gray-400 hover:text-yellow-600"
                        >
                          {person.isActive ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(person.id, person.name)}
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

          {filteredSalespeople.length === 0 && (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No salespeople found</p>
              <Link href="/salespeople/new">
                <button className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                  Add your first salesperson
                </button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}