'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/bots', label: 'Боты' },
  { href: '/logs', label: 'Логи' },
  { href: '/settings', label: 'Настройки' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-blue-600">Bot Manager</span>
            </Link>
            <div className="ml-10 flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => {
                document.cookie = 'auth_token=; path=/; max-age=0'
                window.location.href = '/login'
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
