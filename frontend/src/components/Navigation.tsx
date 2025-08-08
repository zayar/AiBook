'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  Activity, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  User, 
  LogOut,
  Bell,
  Search,
  Sparkles,
  Zap,
  TrendingUp,
  DollarSign,
  PieChart,
  FileText,
  Users,
  Shield,
  Database,
  Cloud,
  Bot,
  Cpu,
  Receipt,
  CreditCard,
  Package,
  Building2,
  Calculator,
  UserCheck,
  Building
} from 'lucide-react'

// Organized navigation structure
const navigation = [
  { name: 'AI Dashboard', href: '/', icon: Brain, badge: 'AI' },
  { name: 'AI Insights', href: '/ai-insights', icon: Sparkles, badge: 'ML' },
  { name: 'Transactions', href: '/transactions', icon: Activity, badge: 'Smart' },
  { name: 'Customers', href: '/customers', icon: Users, badge: 'Sales' },
  { name: 'Items', href: '/items', icon: Package, badge: 'Inventory' },
  { name: 'Vendors', href: '/vendors', icon: Building, badge: 'Suppliers' },
  { name: 'Banking', href: '/banking', icon: Building2, badge: 'Reconcile' },
  { name: 'Salespeople', href: '/salespeople', icon: UserCheck, badge: 'Team' },
]

// Sales group
const salesGroup = [
  { name: 'Invoices', href: '/invoices', icon: Receipt, badge: 'New' },
  { name: 'Payment Received', href: '/payments-received', icon: CreditCard, badge: 'Money' },
]

// Purchases group  
const purchasesGroup = [
  { name: 'Bills', href: '/bills', icon: FileText, badge: 'Payables' },
  { name: 'Expenses', href: '/expenses', icon: Receipt, badge: 'Costs' },
  { name: 'Payments Made', href: '/payments-made', icon: CreditCard, badge: 'Pay' },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

// Remaining standalone items
const standaloneItems = [
  { name: 'Chart of Accounts', href: '/chart-of-accounts', icon: PieChart, badge: 'ALE' },
  { name: 'Taxes', href: '/taxes', icon: Calculator, badge: 'VAT' },
  { name: 'Organization Profile', href: '/organization', icon: Building2, badge: 'Settings' },
]

const aiFeatures = [
  { name: 'Transaction Categorizer', status: 'active', accuracy: 95 },
  { name: 'Account Reconciler', status: 'active', accuracy: 98 },
  { name: 'Financial Analyst', status: 'active', accuracy: 92 },
  { name: 'Financial Advisor', status: 'active', accuracy: 89 },
  { name: 'Compliance Auditor', status: 'active', accuracy: 96 },
]

export default function Navigation() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Helper function to render navigation items
  const renderNavItem = (item: any, isMobile = false) => {
    const isActive = pathname === item.href
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={isMobile ? () => setSidebarOpen(false) : undefined}
        className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <item.icon className="w-5 h-5 mr-3" />
        {item.name}
        {item.badge && (
          <span className="ml-auto px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  // Helper function to render navigation group
  const renderNavGroup = (title: string, items: any[], isMobile = false) => (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item) => renderNavItem(item, isMobile))}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg"
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base font-semibold tracking-tight text-gray-900 whitespace-nowrap">Cashflow Copilot</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="mt-6 px-4 space-y-6 overflow-y-auto">
                {/* Main Navigation */}
                <div className="space-y-1">
                  {navigation.map((item) => renderNavItem(item, true))}
                </div>

                {/* Sales Group */}
                {renderNavGroup('Sales', salesGroup, true)}

                {/* Purchases Group */}
                {renderNavGroup('Purchases', purchasesGroup, true)}

                {/* Standalone Items */}
                <div className="space-y-1">
                  {standaloneItems.map((item) => renderNavItem(item, true))}
                </div>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900 whitespace-nowrap">Cashflow Copilot</span>
          </div>
        </div>
        
        <nav className="flex-1 mt-6 px-4 space-y-6 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigation.map((item) => renderNavItem(item))}
          </div>

          {/* Sales Group */}
          {renderNavGroup('Sales', salesGroup)}

          {/* Purchases Group */}
          {renderNavGroup('Purchases', purchasesGroup)}

          {/* Standalone Items */}
          <div className="space-y-1">
            {standaloneItems.map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">AI User</p>
              <p className="text-xs text-gray-500">admin@aibook.com</p>
            </div>
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Top bar for mobile */}
      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900 whitespace-nowrap">Cashflow Copilot</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
} 