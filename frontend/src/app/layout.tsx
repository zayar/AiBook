import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navigation from '@/components/Navigation'
import { CurrencyProvider } from '@/contexts/CurrencyContext'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'AiBook - AI-First Bookkeeping SaaS',
  description: 'Revolutionary AI-powered bookkeeping system with intelligent transaction categorization, predictive analytics, and multi-tenant support.',
  keywords: 'AI bookkeeping, accounting software, financial management, transaction categorization, predictive analytics',
  authors: [{ name: 'AiBook Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'AiBook - AI-First Bookkeeping SaaS',
    description: 'Revolutionary AI-powered bookkeeping system with intelligent transaction categorization and predictive analytics',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AiBook - AI-First Bookkeeping SaaS',
    description: 'Revolutionary AI-powered bookkeeping system',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <CurrencyProvider>
          <div className="min-h-full flex">
            <Navigation />
            <div className="flex-1 lg:ml-64">
              {children}
            </div>
          </div>
        </CurrencyProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
