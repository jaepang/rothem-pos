import { ReactNode } from 'react'
import treeImage from '@/assets/tree.png'
interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-2xl font-bold flex items-center">
            Rothem POS
            <img 
              src={treeImage} 
              alt="tree" 
              className="h-[0.85em] w-auto ml-1.5 -translate-y-[1px]" 
            />
          </h1>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  )
} 