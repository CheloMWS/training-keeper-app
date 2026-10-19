'use client' 

import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider, useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// COMPONENTE INTERNO: El botón interactivo que cambia el fondo
function BotonFlotanteTema() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evitamos errores de descalce visual (hydration) entre servidor y cliente
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-200 hover:text-emerald-400 hover:border-emerald-500/40 shadow-2xl transition-all font-medium text-xs flex items-center gap-2 cursor-pointer"
    >
      {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
    </button>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning 
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
          {/* Inyectamos el botón aquí para que flote de forma global sobre cualquier pantalla */}
          <BotonFlotanteTema />
        </ThemeProvider>
      </body>
    </html>
  );
}

