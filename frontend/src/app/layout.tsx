import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Cashflow Copilot - AI-First Bookkeeping SaaS',
  description: 'Revolutionary AI-powered bookkeeping system with intelligent transaction categorization, predictive analytics, and multi-tenant support.',
  keywords: 'AI bookkeeping, accounting software, financial management, transaction categorization, predictive analytics',
  authors: [{ name: 'Cashflow Copilot Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Cashflow Copilot - AI-First Bookkeeping SaaS',
    description: 'Revolutionary AI-powered bookkeeping system with intelligent transaction categorization and predictive analytics',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cashflow Copilot - AI-First Bookkeeping SaaS',
    description: 'Revolutionary AI-powered bookkeeping system',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
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
