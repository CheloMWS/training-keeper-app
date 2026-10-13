'use client';

import { useRouter } from 'next/navigation';

export default function MenuPrincipal() {
  const router = useRouter();

  const handleNavigation = (ruta: string) => {
    // Forzamos al navegador a saltar a la página ignorando cualquier traba o caché interna de Next.js
    window.location.href = ruta;
  };


  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans flex flex-col justify-center items-center relative">
      
      <div className="max-w-6xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 md:p-12 shadow-2xl text-center mt-12">
        
        {/* Encabezado Principal */}
        <div className="mb-12">
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
            Panel de Control Central — Modo Libre
          </span>
          <h1 className="text-4xl font-black tracking-tight text-white mt-4 sm:text-5xl">
            TRAINING <span className="text-emerald-400">KEEPER</span> APP
          </h1>
          <p className="text-neutral-400 text-sm mt-3 max-w-md mx-auto">
            Plataforma digital especializada para el entrenamiento de arqueros. Gestión táctica, fichaje y cronogramas.
          </p>
        </div>

        {/* REJILLA DE 5 COLUMNAS LIBRES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Opción 1: Ejercicios */}
          <button
            onClick={() => handleNavigation('/ejercicios')}
            className="flex flex-col items-center border border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 transform hover:scale-[1.03] transition-all text-center w-full group p-5 rounded-xl"
          >
            <div className="size-11 rounded-lg border border-neutral-800 bg-neutral-900 text-emerald-400 flex items-center justify-center text-lg font-bold mb-3 transition-colors group-hover:bg-emerald-500 group-hover:text-black">
              🏑
            </div>
            <h3 className="font-bold text-sm text-neutral-100 transition-colors group-hover:text-emerald-400">
              Catálogo Ejercicios
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Cargá ejercicios con clasificación por rubros y multimedia.
            </p>
          </button>

          {/* Opción 2: Jugadores */}
          <button
            onClick={() => handleNavigation('/jugadores')}
            className="flex flex-col items-center border border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 transform hover:scale-[1.03] transition-all text-center w-full group p-5 rounded-xl"
          >
            <div className="size-11 rounded-lg border border-neutral-800 bg-neutral-900 text-emerald-400 flex items-center justify-center text-lg font-bold mb-3 transition-colors group-hover:bg-emerald-500 group-hover:text-black">
              👥
            </div>
            <h3 className="font-bold text-sm text-neutral-100 transition-colors group-hover:text-emerald-400">
              Registro Jugadores
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Registrá arqueros vinculados a tus clubes oficiales.
            </p>
          </button>

          {/* Opción 3: Planificaciones */}
          <button
            onClick={() => handleNavigation('/planificaciones')}
            className="flex flex-col items-center border border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 transform hover:scale-[1.03] transition-all text-center w-full group p-5 rounded-xl"
          >
            <div className="size-11 rounded-lg border border-neutral-800 bg-neutral-900 text-emerald-400 flex items-center justify-center text-lg font-bold mb-3 transition-colors group-hover:bg-emerald-500 group-hover:text-black">
              📋
            </div>
            <h3 className="font-bold text-sm text-neutral-100 transition-colors group-hover:text-emerald-400">
              Planificar Entrenamiento
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Armá la rutina diaria con control de asistencia automatizado.
            </p>
          </button>

          {/* Opción 4: Historial de Sesiones */}
          <button
            onClick={() => handleNavigation('/historial')}
            className="flex flex-col items-center border border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 transform hover:scale-[1.03] transition-all text-center w-full group p-5 rounded-xl"
          >
            <div className="size-11 rounded-lg border border-neutral-800 bg-neutral-900 text-emerald-400 flex items-center justify-center text-lg font-bold mb-3 transition-colors group-hover:bg-emerald-500 group-hover:text-black">
              📜
            </div>
            <h3 className="font-bold text-sm text-neutral-100 transition-colors group-hover:text-emerald-400">
              Historial Temporada
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Auditá entrenamientos pasados, minutos y ausencias.
            </p>
          </button>

          {/* Opción 5: Gestión */}
          <button
            onClick={() => handleNavigation('/configuracion')}
            className="flex flex-col items-center border border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 transform hover:scale-[1.03] transition-all text-center w-full group p-5 rounded-xl"
          >
            <div className="size-11 rounded-lg border border-neutral-800 bg-neutral-900 text-emerald-400 flex items-center justify-center text-lg font-bold mb-3 transition-colors group-hover:bg-emerald-500 group-hover:text-black">
              ⚙️
            </div>
            <h3 className="font-bold text-sm text-neutral-100 transition-colors group-hover:text-emerald-400">
              Gestión de Datos
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Gestioná tus listas oficiales de Clubes, Categorías y Ejercicios.
            </p>
          </button>

        </div>

        {/* Pie de página */}
        <div className="mt-12 text-xs text-neutral-600 border-t border-neutral-800/60 pt-6">
          Training Keeper App v1.3 — Modo Abierto de Desarrollo
        </div>

      </div>
    </div>
  );
}
