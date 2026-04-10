import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <nav className="flex gap-4">
          <Link href="/logs" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
            Логи системы
          </Link>
          <Link href="/bots" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Управление ботами
          </Link>
        </nav>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Боты</h2>
          <p className="text-4xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Сообщений сегодня</h2>
          <p className="text-4xl font-bold text-green-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Ошибок за 24ч</h2>
          <p className="text-4xl font-bold text-red-600">0</p>
        </div>
      </div>
    </div>
  )
}
