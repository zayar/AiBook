'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Download, Upload, MoreHorizontal, Edit2, 
  Trash2, Copy, Eye, Package, TrendingUp, AlertCircle, Brain,
  Lightbulb, Target, BarChart3, Settings, RefreshCw 
} from 'lucide-react';

// Types
interface Item {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure: string;
  unitCost: number;
  unitPrice: number;
  quantityOnHand: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  isActive: boolean;
  assetAccount: { id: string; name: string; code: string };
  cogsAccount: { id: string; name: string; code: string };
  createdAt: string;
  updatedAt: string;
}

interface ItemInsights {
  insights: (string | Record<string, string>)[];
  recommendations?: string[];
  alerts?: string[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ItemsPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'category' | 'unitPrice' | 'quantityOnHand' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [insights, setInsights] = useState<ItemInsights>({ insights: [] });
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Load items
  const loadItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(statusFilter !== 'all' && { isActive: (statusFilter === 'active').toString() }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/items?${params}`, {
        headers: {
          'X-Tenant-ID': 'default',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setPagination(data.pagination);
        setInsights(data.insights || { insights: [] });
        
        // Extract unique categories
        const uniqueCategories = [...new Set(
          data.items
            .map((item: Item) => item.category)
            .filter((category: string | undefined): category is string => Boolean(category))
        )] as string[];
        setCategories(uniqueCategories);
      } else {
        console.error('Failed to load items');
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load items on component mount and when filters change
  useEffect(() => {
    loadItems();
  }, [currentPage, sortBy, sortOrder, searchTerm, selectedCategory, statusFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle item selection
  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === items.length ? [] : items.map(item => item.id)
    );
  };

  // Handle bulk operations
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedItems.length} selected items?`)) return;

    try {
      await Promise.all(
        selectedItems.map(itemId =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/items/${itemId}`, {
            method: 'DELETE',
            headers: { 'X-Tenant-ID': 'default' },
          })
        )
      );
      setSelectedItems([]);
      loadItems();
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };

  // Handle AI assistance
  const handleAIAssist = async (action: string, data?: any) => {
    try {
      setAiLoading(true);
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/items/ai-assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default',
        },
        body: JSON.stringify({ action, data }),
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error('AI assistance error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get status badge
  const getStatusBadge = (item: Item) => {
    if (!item.isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Inactive</span>;
    }
    if (item.quantityOnHand <= (item.reorderLevel || 0)) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">Low Stock</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">In Stock</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Items & Inventory</h1>
              <p className="text-gray-600">Manage your product and service catalog with AI assistance</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* AI Insights Panel Toggle */}
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  showAIPanel 
                    ? 'bg-purple-50 border-purple-200 text-purple-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Brain className="h-4 w-4 inline mr-2" />
                AI Insights
              </button>

              {/* Import Button */}
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </button>

              {/* Export Button */}
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              {/* Add New Item */}
              <Link 
                href="/items/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 p-6 ${showAIPanel ? 'pr-80' : ''}`}>
          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="p-4">
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items by name, SKU, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Filters Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="name">Name</option>
                        <option value="sku">SKU</option>
                        <option value="category">Category</option>
                        <option value="unitPrice">Price</option>
                        <option value="quantityOnHand">Stock</option>
                        <option value="createdAt">Date Created</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-blue-700">
                  {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                </span>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </button>
                  
                  <button
                    onClick={() => setSelectedItems([])}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first item</p>
                <Link 
                  href="/items/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.length === items.length && items.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => {
                        const margin = ((item.unitPrice - item.unitCost) / item.unitPrice * 100);
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={() => handleSelectItem(item.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-400 mt-1 truncate max-w-48">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.category || <span className="text-gray-400">Uncategorized</span>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {item.quantityOnHand} {item.unitOfMeasure}
                              </div>
                              {item.reorderLevel && item.quantityOnHand <= item.reorderLevel && (
                                <div className="text-xs text-red-600 flex items-center mt-1">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Reorder needed
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatCurrency(item.unitCost)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-sm ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {margin.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(item)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Link
                                  href={`/items/${item.id}`}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                                <Link
                                  href={`/items/${item.id}/edit`}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Link>
                                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} items
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <span className="px-3 py-2 text-gray-700">
                        {currentPage} of {pagination.pages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                        disabled={currentPage === pagination.pages}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* AI Insights Panel */}
        {showAIPanel && (
          <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Brain className="h-5 w-5 text-purple-600 mr-2" />
                  AI Insights
                </h3>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Inventory Overview */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <BarChart3 className="h-4 w-4 text-purple-600 mr-2" />
                  Inventory Overview
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-medium">{pagination.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Categories:</span>
                    <span className="font-medium">{categories.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Low Stock Items:</span>
                    <span className="font-medium text-red-600">
                      {items.filter(item => item.quantityOnHand <= (item.reorderLevel || 0)).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                  Smart Recommendations
                </h4>
                
                {insights.insights.length > 0 ? (
                  <div className="space-y-3">
                    {insights.insights.map((insight, index) => (
                      <div key={index} className="space-y-2">
                        {typeof insight === 'string' ? (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">{insight}</p>
                          </div>
                        ) : (
                          Object.entries(insight).map(([category, content]) => (
                            <div key={category} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h6 className="font-semibold text-blue-900 mb-2 capitalize">{category.replace(/_/g, ' ')}</h6>
                              <p className="text-sm text-blue-800 leading-relaxed">{String(content)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      AI insights will appear here when items are loaded
                    </p>
                  </div>
                )}

                {/* Quick AI Actions */}
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Quick Actions</h5>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleAIAssist('reorder_optimization')}
                      disabled={aiLoading}
                      className="w-full px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Target className="h-4 w-4 inline mr-2 text-green-600" />
                      Optimize Reorder Levels
                    </button>
                    
                    <button
                      onClick={() => handleAIAssist('market_analysis')}
                      disabled={aiLoading}
                      className="w-full px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <TrendingUp className="h-4 w-4 inline mr-2 text-blue-600" />
                      Market Analysis
                    </button>
                    
                    <button
                      onClick={() => loadItems()}
                      disabled={loading}
                      className="w-full px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 inline mr-2 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                      Refresh Insights
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsPage; 