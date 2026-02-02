import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthContext'
import AuthAwareLayout from '@/components/layout/AuthAwareLayout'

export const metadata: Metadata = {
  title: 'EduGrid - System planowania siatki godzin',
  description: 'System do budowania siatki godzin i rozkładów przedmiotów',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body>
        <AuthProvider>
          <AuthAwareLayout>{children}</AuthAwareLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
