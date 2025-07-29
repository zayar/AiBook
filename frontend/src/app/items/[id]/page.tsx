'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Edit2, Trash2, Package, DollarSign, 
  BarChart3, AlertCircle, Loader 
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

const ItemViewPage = () => {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchItem(params.id as string);
    }
  }, [params.id]);

  const fetchItem = async (itemId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/items/${itemId}`, {
        headers: {
          'X-Tenant-ID': 'default',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setItem(data);
      } else {
        setError('Item not found');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      setError('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Item not found'}
            </h2>
            <Link
              href="/items"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Items
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/items"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Items
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
              <p className="text-gray-600 mt-1">SKU: {item.sku}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href={`/items/${item.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Item
              </Link>
            </div>
          </div>
        </div>

        {/* Item Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <p className="text-gray-900">{item.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <p className="text-gray-900">{item.sku}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <p className="text-gray-900">{item.category || 'Uncategorized'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit of Measure
                  </label>
                  <p className="text-gray-900">{item.unitOfMeasure}</p>
                </div>
                
                {item.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-gray-900">{item.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Pricing & Inventory
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost
                  </label>
                  <p className="text-gray-900">${Number(item.unitCost).toFixed(2)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price
                  </label>
                  <p className="text-gray-900">${Number(item.unitPrice).toFixed(2)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity on Hand
                  </label>
                  <p className="text-gray-900">{Number(item.quantityOnHand)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {item.reorderLevel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <p className="text-gray-900">{Number(item.reorderLevel)}</p>
                  </div>
                )}
                
                {item.reorderQuantity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Quantity
                    </label>
                    <p className="text-gray-900">{Number(item.reorderQuantity)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Accounting */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Accounting Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Account
                  </label>
                  <p className="text-gray-900">
                    {item.assetAccount.code} - {item.assetAccount.name}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    COGS Account
                  </label>
                  <p className="text-gray-900">
                    {item.cogsAccount.code} - {item.cogsAccount.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Margin</span>
                  <span className="font-semibold text-gray-900">
                    ${(Number(item.unitPrice) - Number(item.unitCost)).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Margin %</span>
                  <span className="font-semibold text-gray-900">
                    {((Number(item.unitPrice) - Number(item.unitCost)) / Number(item.unitPrice) * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-semibold text-gray-900">
                    ${(Number(item.quantityOnHand) * Number(item.unitCost)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stock Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status</h3>
              
              <div className="space-y-3">
                {item.reorderLevel && Number(item.quantityOnHand) <= Number(item.reorderLevel) ? (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-800 text-sm font-medium">
                      Below reorder level
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Package className="w-4 h-4 text-green-600" />
                    <span className="text-green-800 text-sm font-medium">
                      Stock levels healthy
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Created:</span>
                  <p className="text-gray-900">
                    {new Date(item.createdAt).toLocaleDateString()} at{' '}
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-600">Last Updated:</span>
                  <p className="text-gray-900">
                    {new Date(item.updatedAt).toLocaleDateString()} at{' '}
                    {new Date(item.updatedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemViewPage; 