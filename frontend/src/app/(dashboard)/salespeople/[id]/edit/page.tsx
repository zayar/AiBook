'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  UserCheck,
  Mail,
  Phone,
  Building,
  MapPin,
  Target,
  Percent,
  User,
  Save,
  AlertCircle
} from 'lucide-react';
import { salespersonAPI, UpdateSalespersonRequest } from '@/lib/salesperson-api';
import { useParams, useRouter } from 'next/navigation';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import Link from 'next/link';

export default function EditSalespersonPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateSalespersonRequest>({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    commission: 0,
    target: 0,
    territory: '',
    manager: '',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.id) {
      fetchSalesperson(params.id as string);
    }
  }, [params.id]);

  const fetchSalesperson = async (id: string) => {
    try {
      setLoading(true);
      const response = await salespersonAPI.getSalesperson(id);
      const salesperson = response.salesperson;
      
      setFormData({
        name: salesperson.name,
        email: salesperson.email || '',
        phone: salesperson.phone || '',
        department: salesperson.department || '',
        position: salesperson.position || '',
        commission: salesperson.commission ? salesperson.commission * 100 : 0,
        target: salesperson.target || 0,
        territory: salesperson.territory || '',
        manager: salesperson.manager || '',
        isActive: salesperson.isActive
      });
    } catch (error) {
      console.error('Error fetching salesperson:', error);
      alert('Failed to load salesperson data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.commission && (formData.commission < 0 || formData.commission > 100)) {
      newErrors.commission = 'Commission must be between 0 and 100%';
    }

    if (formData.target && formData.target < 0) {
      newErrors.target = 'Target must be a positive number';
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
        : type === 'number'
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

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      // Convert commission from percentage to decimal if needed
      const submitData = {
        ...formData,
        commission: formData.commission ? formData.commission / 100 : undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
        position: formData.position || undefined,
        territory: formData.territory || undefined,
        manager: formData.manager || undefined,
        target: formData.target || undefined
      };

      const response = await salespersonAPI.updateSalesperson(params.id as string, submitData);
      console.log('Salesperson updated:', response);
      router.push(`/salespeople/${params.id}`);
    } catch (error: any) {
      console.error('Error updating salesperson:', error);
      alert(error.message || 'Failed to update salesperson');
    } finally {
      setSaving(false);
    }
  };

  const departments = [
    'Sales',
    'Inside Sales',
    'Field Sales',
    'Key Accounts',
    'Business Development',
    'Channel Sales',
    'International Sales'
  ];

  const positions = [
    'Sales Representative',
    'Senior Sales Representative',
    'Sales Executive',
    'Account Manager',
    'Senior Account Manager',
    'Key Account Manager',
    'Sales Manager',
    'Regional Sales Manager',
    'Sales Director',
    'VP Sales'
  ];

  const territories = [
    'Yangon',
    'Mandalay',
    'Naypyidaw',
    'Bago',
    'Magway',
    'Tanintharyi',
    'Ayeyarwady',
    'Sagaing',
    'Shan State',
    'Kachin State',
    'Kayah State',
    'Kayin State',
    'Chin State',
    'Mon State',
    'Rakhine State',
    'National',
    'International'
  ];

  if (loading) {
    return <UltraEnhancedLoading />;
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
            <Link href={`/salespeople/${params.id}`}>
              <button className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-blue-600" />
                Edit Salesperson
              </h1>
              <p className="text-gray-600 mt-2">Update salesperson information and settings</p>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe"
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
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john.doe@company.com"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+95 9 123 456 789"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="isActive"
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Role Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Role & Department
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select position</option>
                  {positions.map(position => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Territory
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    name="territory"
                    value={formData.territory}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select territory</option>
                    {territories.map(territory => (
                      <option key={territory} value={territory}>
                        {territory}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager
                </label>
                <input
                  type="text"
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  placeholder="Manager name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>

          {/* Performance Targets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance & Compensation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Target (Monthly)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="target"
                    value={formData.target}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    placeholder="50000"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.target ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">MMK</span>
                </div>
                {errors.target && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.target}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Monthly sales target for performance tracking
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Rate
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    name="commission"
                    value={formData.commission}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="5.0"
                    className={`w-full pl-10 pr-8 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.commission ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
                {errors.commission && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.commission}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Commission percentage on sales
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-end gap-4 pt-6"
          >
            <Link href={`/salespeople/${params.id}`}>
              <button
                type="button"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
} 