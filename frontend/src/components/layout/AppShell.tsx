import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'

export function AppShell() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        {/* Extra bottom padding on mobile so content isn't hidden behind the bottom nav */}
        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6">
          {/* key forces re-mount on route change, triggering the fade-in animation */}
          <div
            key={location.pathname}
            className="animate-fade-in-up"
            style={{ animationDuration: '250ms' }}
          >
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
