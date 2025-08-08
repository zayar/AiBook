import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Invoice - Cashflow Copilot',
  description: 'Shared invoice view',
  robots: 'noindex, nofollow', // Don't index public invoice pages
}

export default function PublicInvoiceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* No Navigation component - clean layout for public invoices */}
        {children}
      </body>
    </html>
  )
}
