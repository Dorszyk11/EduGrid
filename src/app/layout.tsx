import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
