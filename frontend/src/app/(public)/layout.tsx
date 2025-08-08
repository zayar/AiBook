import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Invoice - Cashflow Copilot',
  description: 'Shared invoice view',
  robots: 'noindex, nofollow', // Don't index public invoice pages
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* No Navigation component - clean layout for public invoices */}
      {children}
    </>
  )
}
