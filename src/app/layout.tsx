import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthContext'
import AuthAwareLayout from '@/components/layout/AuthAwareLayout'

// Body: Inter (czytelność danych). Display: Space Grotesk (techniczny, „siatkowy").
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-space-grotesk',
  weight: ['500', '600', '700'],
  display: 'swap',
})

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
    <html lang="pl" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <AuthProvider>
          <AuthAwareLayout>{children}</AuthAwareLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
