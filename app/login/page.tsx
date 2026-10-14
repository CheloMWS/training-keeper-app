'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const router = useRouter()
  // Nota: Next.js exige desenvolver los searchParams mediante React.use() o await si es asíncrono
  // Para simplificar en cliente, leemos el mensaje de la URL si existe
  const message = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('message') : ''

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. ACCIÓN DE INICIAR SESIÓN (NATIVA DEL CLIENTE CON SUPABASE)
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      window.location.href = '/login?message=Credenciales incorrectas o cuenta sin verificar'
      return
    }

    window.location.href = '/'
  }

  // 2. ACCIÓN DE REGISTRO (AUTOCONFIRMADO)
  const handleSignup = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const form = e.currentTarget.form
    if (!form) return

    const formData = new FormData(form)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) return

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      window.location.href = `/login?message=Error: ${error.message}`
      return
    }

    window.location.href = '/login?message=¡Cuenta creada con éxito! Ya puedes ingresar.'
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white font-sans">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl space-y-6">
        
        {/* Cabecera del Cuadro */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h2>
          <p className="mt-1 text-sm text-neutral-400">Ingresá a tu plataforma de entrenamiento</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {message && (
            <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/30 p-3 text-xs text-emerald-400 text-center font-medium">
              {message}
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Correo Electrónico</label>
            <input
              name="email"
              type="email"
              required
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-neutral-100 placeholder-neutral-600 focus:border-emerald-500/50 focus:outline-none transition-all"
              placeholder="entrenador@correo.com"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Contraseña</label>
            <input
              name="password"
              type="password"
              required
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-neutral-100 focus:border-emerald-500/50 focus:outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col space-y-2 pt-2">
            {/* BOTÓN 1: Iniciar Sesión con estilo esmeralda destacado */}
            <button
              type="submit"
              className="w-full text-center py-2.5 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all tracking-wider uppercase"
            >
              Entrar al Panel
            </button>

            {/* BOTÓN 2: Crear cuenta en un tono neutro secundario sutil */}
            <button
              type="button"
              onClick={handleSignup}
              className="w-full text-center py-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 rounded-lg text-xs font-semibold transition-all tracking-wider"
            >
              Registrarme como Entrenador Nuevo
            </button>
          </div>
        </form>

        {/* Pie de cuadro */}
        <div className="text-center text-[10px] text-neutral-600 tracking-wide border-t border-neutral-800/60 pt-4">
          Acceso Restringido — Sistema de Seguridad Activo
        </div>

      </div>
    </div>
  )
}
