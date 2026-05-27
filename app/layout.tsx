import type { Metadata } from 'next'
import './globals.css' // Next.js otomatis nge-handle ini jika pakai Tailwind

export const metadata: Metadata = {
  title: 'AI Trading Assistant',
  description: 'Asisten trading anti-fomo buat Gen Z',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="bg-gray-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
