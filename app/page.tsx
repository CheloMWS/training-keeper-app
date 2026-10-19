'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function HomePage() {
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Acción nativa de cierre de sesión
  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Forzamos al navegador a redirigir limpiando la memoria de cookies de raíz
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-white p-6 transition-colors duration-300 ...">
  
      <div className="max-w-6xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl space-y-8">
        
        {/* Cabecera Principal */}
        <div className="border-b border-neutral-800 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Plataforma digital especializada para el entrenamiento de arqueros.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-xs text-neutral-400 hover:text-red-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors bg-neutral-950"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Grilla de 5 Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. Catálogo */}
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg">
            <div>
              <div className="text-xl mb-2 text-emerald-400">🏑</div>
              <h3 className="text-base font-bold text-neutral-100 mb-1">Catálogo Ejercicios</h3>
              <p className="text-neutral-400 text-xs mb-6 leading-relaxed">Cargá ejercicios con clasificación por rubros tácticos y multimedia.</p>
            </div>
            <button 
              onClick={() => router.push('/ejercicios')}
              className="w-full text-center py-2 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 hover:text-emerald-400 rounded-lg text-xs font-semibold transition-all"
            >
              Abrir Catálogo
            </button>
          </div>

          {/* 2. Registro Jugadores */}
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg">
            <div>
              <div className="text-xl mb-2 text-emerald-400">👥</div>
              <h3 className="text-base font-bold text-neutral-100 mb-1">Registro Jugadores</h3>
              <p className="text-neutral-400 text-xs mb-6 leading-relaxed">Registrá y gestioná el plantel de arqueros vinculado a tus clubes oficiales.</p>
            </div>
            <button 
              onClick={() => router.push('/jugadores')}
              className="w-full text-center py-2 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 hover:text-emerald-400 rounded-lg text-xs font-semibold transition-all"
            >
              Ver Jugadores
            </button>
          </div>

          {/* 3. Planificar Entrenamiento */}
          <div className="bg-neutral-950 p-6 rounded-xl border border-emerald-500/30 flex flex-col justify-between hover:border-emerald-500/60 transition-colors shadow-lg ring-1 ring-emerald-500/10">
            <div>
              <div className="text-xl mb-2 text-emerald-400">📋</div>
              <h3 className="text-base font-bold text-emerald-400 mb-1">Planificar Entrenamiento</h3>
              <p className="text-neutral-400 text-xs mb-6 leading-relaxed">Armá la rutina diaria con control de asistencia automatizado.</p>
            </div>
            <button 
              onClick={() => router.push('/planificaciones')}
              className="w-full text-center py-2 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-semibold transition-all"
            >
              Planificar Hoy
            </button>
          </div>

          {/* 4. Historial Temporada */}
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg">
            <div>
              <div className="text-xl mb-2 text-emerald-400">📜</div>
              <h3 className="text-base font-bold text-neutral-100 mb-1">Historial Temporada</h3>
              <p className="text-neutral-400 text-xs mb-6 leading-relaxed">Auditá entrenamientos pasados, minutos acumulados y asistencias.</p>
            </div>
            <button 
              onClick={() => router.push('/historial')}
              className="w-full text-center py-2 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 hover:text-emerald-400 rounded-lg text-xs font-semibold transition-all"
            >
              Ver Historial
            </button>
          </div>
          {/* 5. Gestión de Datos */}
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg">
            <div>
              <div className="text-xl mb-2 text-emerald-400">⚙</div>
              <h3 className="text-base font-bold text-neutral-100 mb-1">Gestión de Datos</h3>
              <p className="text-neutral-400 text-xs mb-6 leading-relaxed">Configurá las listas oficiales de Clubes, Categorías y Divisiones.</p>
            </div>
            <button 
              onClick={() => router.push('/configuracion')}
              className="w-full text-center py-2 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 hover:text-emerald-400 rounded-lg text-xs font-semibold transition-all"
            >
              Configurar Datos
            </button>
          </div>

          {/* 6. Reportes y Estadísticas */}
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-colors shadow-lg">
            <div>
              <div className="text-xl mb-2 text-emerald-400">📊</div>
              <h3 className="text-base font-bold text-neutral-100 mb-1">Reportes y Estadísticas</h3>
              <p className="text-neutral-400 text-xs mb-6 leading-relaxed">Generá reportes de asistencia, rendimiento técnico y minutos acumulados.</p>
            </div>
            <button 
              onClick={() => router.push('/reportes')}
              className="w-full text-center py-2 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 hover:text-emerald-400 rounded-lg text-xs font-semibold transition-all"
            >
              Generar Reportes
            </button>
          </div>

        </div>

        {/* Pie de página */}
        <div className="text-center pt-4 border-t border-neutral-800 text-[11px] text-neutral-600">
          Training Keeper App v1.3 — Interfaz Unificada Neutral-Emerald
        </div>

      </div>
    </div>
  )
}




