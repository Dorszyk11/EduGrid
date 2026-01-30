import type { Metadata } from 'next'
import './globals.css'
import DashboardLayout from '@/components/layout/DashboardLayout'

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
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  )
}
