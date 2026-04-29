import './globals.css'

export const metadata = {
  title: 'Machine Learning Hub',
  description: 'A simple ML platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}