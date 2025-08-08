import Navigation from '@/components/Navigation'
import { CurrencyProvider } from '@/contexts/CurrencyContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CurrencyProvider>
      <div className="min-h-full flex">
        <Navigation />
        <div className="flex-1 lg:ml-64">
          {children}
        </div>
      </div>
    </CurrencyProvider>
  )
}
