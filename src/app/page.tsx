import Link from 'next/link';
import RedirectIfNoTypySzkol from '@/components/layout/RedirectIfNoTypySzkol';

export default function HomePage() {
  return (
    <RedirectIfNoTypySzkol>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">EduGrid</h1>
          <p className="text-xl text-gray-600 mb-8">System planowania siatki godzin</p>
          <div className="space-x-4">
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Przejdź do Dashboard
            </Link>
            <Link
              href="/admin"
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Panel Administracyjny
            </Link>
          </div>
        </div>
      </div>
    </RedirectIfNoTypySzkol>
  );
}
