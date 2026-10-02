'use client';

import { useState } from 'react';

export default function MenuPrincipal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans flex flex-col justify-center items-center relative">
      
      {/* BOTÓN DE LOGIN / PERFIL (Esquina superior derecha) */}
      <div className="absolute top-6 right-6 md:top-12 md:right-12">
        {!isLoggedIn ? (
          <button 
            onClick={() => alert('¡Próximamente! Aquí conectaremos el login seguro con Clerk.')}
            className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 text-neutral-200"
          >
            <span>🔒</span> Iniciar Sesión
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl">
            <div className="size-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-black">
              KC
            </div>
            <span className="text-xs font-medium text-neutral-300">Keeper Coach</span>
            <button onClick={() => setIsLoggedIn(false)} className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 ml-2">
              Salir
            </button>
          </div>
        )}
      </div>

      <div className="max-w-6xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 md:p-12 shadow-2xl text-center">
        
        {/* Encabezado Principal */}
        <div className="mb-12">
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
            Panel de Control Central
          </span>
          <h1 className="text-4xl font-black tracking-tight text-white mt-4 sm:text-5xl">
            TRAINING <span className="text-emerald-400">KEEPER</span> APP
          </h1>
          <p className="text-neutral-400 text-sm mt-3 max-w-md mx-auto">
            Plataforma digital especializada para el entrenamiento de arqueros. Gestión táctica, fichaje, cronogramas y auditorías.
          </p>
        </div>

        {/* REJILLA DE 5 COLUMNAS MAESTRA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Opción 1: Ejercicios */}
          <a href="/ejercicios" className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-emerald-500/50 transition-all transform hover:scale-[1.03] group text-center">
            <div className="size-11 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg font-bold text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors mb-3">
              🏑
            </div>
            <h3 className="font-bold text-sm text-neutral-100 group-hover:text-emerald-400 transition-colors">
              Catálogo Vistas
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Cargá ejercicios con clasificación por rubros y multimedia.
            </p>
          </a>

          {/* Opción 2: Jugadores */}
          <a href="/jugadores" className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-emerald-500/50 transition-all transform hover:scale-[1.03] group text-center">
            <div className="size-11 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg font-bold text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors mb-3">
              👥
            </div>
            <h3 className="font-bold text-sm text-neutral-100 group-hover:text-emerald-400 transition-colors">
              Fichaje Alumnos
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Registrá arqueros vinculados a tus clubes oficiales.
            </p>
          </a>

          {/* Opción 3: Planificaciones */}
          <a href="/planificaciones" className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-emerald-500/50 transition-all transform hover:scale-[1.03] group text-center">
            <div className="size-11 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg font-bold text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors mb-3">
              📋
            </div>
            <h3 className="font-bold text-sm text-neutral-100 group-hover:text-emerald-400 transition-colors">
              Planificar Sesión
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Armá la rutina diaria con control de asistencia automatizado.
            </p>
          </a>

          {/* Opción 4: Historial de Sesiones */}
          <a href="/historial" className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-emerald-500/50 transition-all transform hover:scale-[1.03] group text-center">
            <div className="size-11 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg font-bold text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors mb-3">
              📜
            </div>
            <h3 className="font-bold text-sm text-neutral-100 group-hover:text-emerald-400 transition-colors">
              Historial Anual
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Auditá entrenamientos pasados, minutos y ausencias.
            </p>
          </a>

          {/* Opción 5: Configuración API */}
          <a href="/configuracion" className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-emerald-500/50 transition-all transform hover:scale-[1.03] group text-center">
            <div className="size-11 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg font-bold text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors mb-3">
              ⚙️
            </div>
            <h3 className="font-bold text-sm text-neutral-100 group-hover:text-emerald-400 transition-colors">
              Datos Maestros
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Gestioná tus listas oficiales de Clubes, Categorías y Rubros.
            </p>
          </a>

        </div>

        {/* Pie de página */}
        <div className="mt-12 text-xs text-neutral-600 border-t border-neutral-800/60 pt-6">
          Training Keeper App v1.2 — Sistema de Alto Rendimiento para Porteros
        </div>

      </div>
    </div>
  );
}


