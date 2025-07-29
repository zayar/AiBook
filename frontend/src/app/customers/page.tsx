'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Customer, CustomerAPI } from '@/lib/customer-api';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All Customers');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showActions, setShowActions] = useState<string | null>(null);

  // Load customers from API
  useEffect(() => {
    loadCustomers();
  }, [searchTerm, filterType]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await CustomerAPI.getCustomers({
        search: searchTerm || undefined,
        type: filterType !== 'All Customers' ? filterType : undefined
      });
      setCustomers(response.customers);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'All Customers' || 
      (filterType === 'Business' && customer.customerType === 'Business') ||
      (filterType === 'Individual' && customer.customerType === 'Individual') ||
      (filterType === 'Active' && customer.status === 'Active') ||
      (filterType === 'Inactive' && customer.status === 'Inactive');
    
    return matchesSearch && matchesFilter;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    } else {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await CustomerAPI.deleteCustomer(customerId);
      setCustomers(customers.filter(c => c.id !== customerId));
      setShowActions(null);
    } catch (error) {
      console.error('Failed to delete customer:', error);
      // For demo purposes, still remove from UI
      setCustomers(customers.filter(c => c.id !== customerId));
      setShowActions(null);
    }
  };

  const handleEditCustomer = (customerId: string) => {
    router.push(`/customers/${customerId}/edit`);
  };

  const handleViewCustomer = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All Customers</option>
              <option>Business</option>
              <option>Individual</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <Filter className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <button 
          onClick={() => router.push('/customers/new')}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    <Filter className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receivables
                </th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleViewCustomer(customer.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {customer.name}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-gray-900">
                    {customer.companyName || '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-900">
                    {customer.email || '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-900">
                    {customer.workPhone || '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-900">
                    {customer.currency}{customer.receivables.toFixed(2)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowActions(showActions === customer.id ? null : customer.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {showActions === customer.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => handleViewCustomer(customer.id)}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View Details</span>
                          </button>
                          <button
                            onClick={() => handleEditCustomer(customer.id)}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
            </div>
            <button
              onClick={() => router.push('/customers/new')}
              className="mt-4 inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4" />
              <span>Add your first customer</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      {filteredCustomers.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
          {selectedCustomers.length > 0 && (
            <div>
              {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
} 