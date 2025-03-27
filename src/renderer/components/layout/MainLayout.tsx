import { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-2xl font-bold">Rothem POS🌲☕</h1>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  )
} 