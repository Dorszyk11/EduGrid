import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Serif } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthContext'
import AuthAwareLayout from '@/components/layout/AuthAwareLayout'

const eduSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-edu-sans',
  display: 'swap',
})

const eduSerif = IBM_Plex_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  variable: '--font-edu-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EduGrid — planowanie siatki godzin i zatrudnień',
  description:
    'System do opracowywania siatki godzin zgodnej z harmonogramami MEiN oraz szacowania potrzeb kadrowych w szkołach.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" className={`${eduSans.variable} ${eduSerif.variable}`}>
      <body className="font-sans min-h-dvh bg-edu-bg text-edu-ink">
        <AuthProvider>
          <AuthAwareLayout>{children}</AuthAwareLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
