'use client'

import { useRouter } from 'next/navigation'

export default function ReportesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        
        {/* Encabezado Idéntico */}
        <div className="border-b border-neutral-800 pb-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Centro de Cómputos — Reportes Ejecutivos y Estadísticas Anuales</p>
          </div>
          <button 
            onClick={() => router.push('/')} 
            className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors bg-neutral-950"
          >
            ← Volver al Menú
          </button>
        </div>

        {/* Panel Interactivo Base para Reportes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-2 text-center py-12">
            <span className="text-2xl block mb-2">📋</span>
            <h3 className="font-bold text-sm text-neutral-200">Asistencia Consolidada</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">Próximamente: Filtra por club o mes para auditar los presentes y ausentes de los arqueros.</p>
          </div>

          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-2 text-center py-12">
            <span className="text-2xl block mb-2">⏱️</span>
            <h3 className="font-bold text-sm text-neutral-200">Minutos por Rubro Táctico</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">Próximamente: Gráficos de barra para ver qué áreas técnicas (blocaje, reflejos) trabajaste más en el año.</p>
          </div>
        </div>

      </div>
    </div>
  )
}
