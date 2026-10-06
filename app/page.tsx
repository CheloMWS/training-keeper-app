'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';

export default function MenuPrincipal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Escuchar y controlar el estado de autenticación real
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkUser();

    // Actualiza la interfaz automáticamente si inicia o cierra sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Interceptor de seguridad para los botones del menú
  const handleNavigation = (ruta: string) => {
    if (!user) {
      router.push('/login');
    } else {
      router.push(ruta);
    }
  };

  // Pantalla de carga limpia mientras verifica las cookies de sesión
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center font-sans">
        Cargando Panel Central...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans flex flex-col justify-center items-center relative">
      
      {/* BOTÓN DE LOGIN / PERFIL (Esquina superior derecha) */}
      <div className="absolute top-6 right-6 md:top-12 md:right-12">
        {!user ? (
          <button 
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 text-neutral-200"
          >
            <span>🔒</span> Iniciar Sesión
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl">
            <div className="size-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-black uppercase">
              {user.email?.charAt(0) || 'C'}
            </div>
            <span className="text-xs font-medium text-neutral-300 max-w-[150px] truncate">
              {user.email}
            </span>
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 ml-2 transition-colors"
            >
              Salir
            </button>
          </div>
        )}
      </div>
      <div className="max-w-6xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 md:p-12 shadow-2xl text-center mt-12">
        
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
          <button
            onClick={() => handleNavigation('/ejercicios')}
            className={`flex flex-col items-center border rounded-xl p-5 transition-all text-center w-full group ${
              user 
                ? 'bg-neutral-950 border-neutral-800 hover:border-emerald-500/50 transform hover:scale-[1.03]' 
                : 'bg-neutral-900/50 border-neutral-800/40 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`size-11 rounded-lg border flex items-center justify-center text-lg font-bold mb-3 transition-colors ${
              user 
                ? 'bg-neutral-900 border-neutral-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black' 
                : 'bg-neutral-950 border-transparent text-neutral-600'
            }`}>
              {user ? '🏑' : '🔒'}
            </div>
            <h3 className={`font-bold text-sm transition-colors ${user ? 'text-neutral-100 group-hover:text-emerald-400' : 'text-neutral-500'}`}>
              Catálogo Ejercicios
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Cargá ejercicios con clasificación por rubros y multimedia.
            </p>
          </button>

          {/* Opción 2: Jugadores */}
          <button
            onClick={() => handleNavigation('/jugadores')}
            className={`flex flex-col items-center border rounded-xl p-5 transition-all text-center w-full group ${
              user 
                ? 'bg-neutral-950 border-neutral-800 hover:border-emerald-500/50 transform hover:scale-[1.03]' 
                : 'bg-neutral-900/50 border-neutral-800/40 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`size-11 rounded-lg border flex items-center justify-center text-lg font-bold mb-3 transition-colors ${
              user 
                ? 'bg-neutral-900 border-neutral-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black' 
                : 'bg-neutral-950 border-transparent text-neutral-600'
            }`}>
              {user ? '👥' : '🔒'}
            </div>
            <h3 className={`font-bold text-sm transition-colors ${user ? 'text-neutral-100 group-hover:text-emerald-400' : 'text-neutral-500'}`}>
              Registro Jugadores
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Registrá arqueros vinculados a tus clubes oficiales.
            </p>
          </button>

          {/* Opción 3: Planificaciones */}
          <button
            onClick={() => handleNavigation('/planificaciones')}
            className={`flex flex-col items-center border rounded-xl p-5 transition-all text-center w-full group ${
              user 
                ? 'bg-neutral-950 border-neutral-800 hover:border-emerald-500/50 transform hover:scale-[1.03]' 
                : 'bg-neutral-900/50 border-neutral-800/40 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`size-11 rounded-lg border flex items-center justify-center text-lg font-bold mb-3 transition-colors ${
              user 
                ? 'bg-neutral-900 border-neutral-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black' 
                : 'bg-neutral-950 border-transparent text-neutral-600'
            }`}>
              {user ? '📋' : '🔒'}
            </div>
            <h3 className={`font-bold text-sm transition-colors ${user ? 'text-neutral-100 group-hover:text-emerald-400' : 'text-neutral-500'}`}>
              Planificar Entrenamiento
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Armá la rutina diaria con control de asistencia automatizado.
            </p>
          </button>

          {/* Opción 4: Historial de Sesiones */}
          <button
            onClick={() => handleNavigation('/historial')}
            className={`flex flex-col items-center border rounded-xl p-5 transition-all text-center w-full group ${
              user 
                ? 'bg-neutral-950 border-neutral-800 hover:border-emerald-500/50 transform hover:scale-[1.03]' 
                : 'bg-neutral-900/50 border-neutral-800/40 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`size-11 rounded-lg border flex items-center justify-center text-lg font-bold mb-3 transition-colors ${
              user 
                ? 'bg-neutral-900 border-neutral-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black' 
                : 'bg-neutral-950 border-transparent text-neutral-600'
            }`}>
              {user ? '📜' : '🔒'}
            </div>
            <h3 className={`font-bold text-sm transition-colors ${user ? 'text-neutral-100 group-hover:text-emerald-400' : 'text-neutral-500'}`}>
              Historial Temporada
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Auditá entrenamientos pasados, minutos y ausencias.
            </p>
          </button>

          {/* Opción 5: Configuración API */}
          <button
            onClick={() => handleNavigation('/configuracion')}
            className={`flex flex-col items-center border rounded-xl p-5 transition-all text-center w-full group ${
              user 
                ? 'bg-neutral-950 border-neutral-800 hover:border-emerald-500/50 transform hover:scale-[1.03]' 
                : 'bg-neutral-900/50 border-neutral-800/40 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`size-11 rounded-lg border flex items-center justify-center text-lg font-bold mb-3 transition-colors ${
              user 
                ? 'bg-neutral-900 border-neutral-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black' 
                : 'bg-neutral-950 border-transparent text-neutral-600'
            }`}>
              {user ? '⚙️' : '🔒'}
            </div>
            <h3 className={`font-bold text-sm transition-colors ${user ? 'text-neutral-100 group-hover:text-emerald-400' : 'text-neutral-500'}`}>
              Gestion de Datos
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1.5 leading-relaxed">
              Gestioná tus listas oficiales de Clubes, Categorías y Ejercicios.
            </p>
          </button>

        </div>

        {/* Pie de página */}
        <div className="mt-12 text-xs text-neutral-600 border-t border-neutral-800/60 pt-6">
          Training Keeper App v1.3 — Sistema para Entrenadores de Arqueros
        </div>

      </div>
    </div>
  );
}
