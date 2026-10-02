'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient'; // ← El arroba (@) buscará el archivo que acabamos de crear en la raíz


export default function HistorialPorArquero() {
  const [arqueros, setArqueros] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<any | null>(null);
  
  // Lista de ejercicios realizados por el arquero elegido
  const [ejerciciosRealizados, setEjerciciosRealizados] = useState<any[]>([]);
  
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // 1. DESCARGAR TODOS LOS ARQUEROS AL ABRIR LA PANTALLA
  useEffect(() => {
    const descargarArqueros = async () => {
      setCargandoLista(true);
      const { data, error } = await supabase
        .from('alumnos')
        .select('id, nombre_completo, club, categoria, division')
        .order('nombre_completo', { ascending: true });

      if (!error && data) setArqueros(data);
      setCargandoLista(false);
    };
    descargarArqueros();
  }, []);

  // 2. BUSCAR TODOS LOS EJERCICIOS QUE HIZO EL ARQUERO (CUANDO ESTUVO PRESENTE)
  const cargarHistorialArquero = async (arquero: any) => {
    setSeleccionado(arquero);
    setCargandoHistorial(true);
    setEjerciciosRealizados([]);

    try {
      // Paso A: Buscamos todos los entrenamientos donde el alumno estuvo PRESENTE
      const { data: asistenciasValidas, error: errAsistencia } = await supabase
        .from('asistencias')
        .select('entrenamiento_id')
        .eq('alumno_id', arquero.id)
        .eq('presente', true);

      if (errAsistencia) throw errAsistencia;

      if (asistenciasValidas && asistenciasValidas.length > 0) {
        // Extraemos los IDs de los entrenamientos
        const idsEntrenamientos = asistenciasValidas.map(a => a.entrenamiento_id);

        // Paso B: Buscamos los ejercicios dictados en esos entrenamientos cruzando con la tabla ejercicios
        const { data: ejercicios, error: errEjercicios } = await supabase
          .from('entrenamiento_ejercicios')
          .select(`
            duracion_minutos,
            entrenamientos (numero_entrenamiento, fecha, club),
            ejercicios (codigo, nombre, rubro)
          `)
          .in('entrenamiento_id', idsEntrenamientos);

        if (!errEjercicios && ejercicios) {
          setEjerciciosRealizados(ejercicios);
        }
      }
    } catch (err) {
      console.error('Error al descargar historial táctico:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="border-b border-neutral-800 pb-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Seguimiento Táctico — Historial de Ejercicios por Arquero/a</p>
          </div>
          <a href="/" className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
            ← Volver al Menú
          </a>
        </div>

        {/* DOBLE PANEL INTERACTIVO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA IZQUIERDA: SELECCIONAR ARQUERO (1/3 de pantalla) */}
          <div className="lg:col-span-1 bg-neutral-950 p-4 rounded-xl border border-neutral-800 h-[600px] overflow-y-auto space-y-3">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Plantel de Arqueros</div>
            
            {cargandoLista ? (
              <div className="text-neutral-500 text-xs text-center py-8">Cargando lista...</div>
            ) : arqueros.length === 0 ? (
              <div className="text-neutral-500 text-xs text-center py-8">No hay alumnos registrados.</div>
            ) : (
              arqueros.map((arq) => (
                <button
                  type="button" key={arq.id} onClick={() => cargarHistorialArquero(arq)}
                  className={`w-full text-left p-4 rounded-lg border text-xs transition-all flex flex-col gap-1 ${
                    seleccionado?.id === arq.id 
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-white' 
                      : 'bg-neutral-900 border-neutral-800/80 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <span className="font-bold text-sm text-neutral-100">{arq.nombre_completo}</span>
                  <div className="flex justify-between items-center text-[11px] text-neutral-400 mt-1">
                    <span>{arq.club}</span>
                    <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">{arq.categoria} {arq.division}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* COLUMNA DERECHA: EXTRACCIÓN DE EJERCICIOS (2/3 de pantalla) */}
          <div className="lg:col-span-2 bg-neutral-950 p-6 rounded-xl border border-neutral-800 h-[600px] overflow-y-auto">
            {!seleccionado ? (
              <div className="h-full flex flex-col justify-center items-center text-center text-neutral-500 py-12">
                <span className="text-3xl mb-2">🛡️</span>
                <p className="text-xs max-w-xs">Seleccioná un alumno de la lista para extraer la lista completa de ejercicios y minutos acumulados en el año.</p>
              </div>
            ) : cargandoHistorial ? (
              <div className="h-full flex justify-center items-center text-neutral-500 text-xs">Cruzando datos con Supabase...</div>
            ) : (
              <div className="space-y-6">
                
                {/* Cabecera del Alumno */}
                <div className="border-b border-neutral-800 pb-4">
                  <h2 className="text-xl font-bold text-emerald-400">{seleccionado.nombre_completo}</h2>
                  <p className="text-xs text-neutral-400 mt-1">Ficha Activa — <span className="text-neutral-200">{seleccionado.club}</span> ({seleccionado.categoria} - Fila {seleccionado.division})</p>
                </div>

                {/* Listado acumulado de ejercicios ejecutados */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">📋 Ejercicios Ejecutados (Basado en días Presente)</div>
                  
                  {ejerciciosRealizados.length === 0 ? (
                    <div className="text-neutral-500 text-xs py-8 text-center bg-neutral-900 rounded-lg border border-neutral-800/40">
                      Este arquero no registra entrenamientos asistidos o no se le han asignado ejercicios en sus días de asistencia.
                    </div>
                  ) : (
                    ejerciciosRealizados.map((item, idx) => (
                      <div key={idx} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-neutral-800 text-neutral-400 font-bold px-1.5 py-0.5 rounded text-[10px]">[{item.ejercicios?.codigo}]</span>
                            <span className="font-semibold text-neutral-200 text-sm">{item.ejercicios?.nombre}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400">Área: {item.ejercicios?.rubro} — Sesión Nº {item.entrenamientos?.numero_entrenamiento}</p>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-neutral-800/60 pt-2 sm:pt-0">
                          <span className="text-[11px] text-neutral-500 font-medium">
                            {item.entrenamientos?.fecha ? new Date(item.entrenamientos.fecha).toLocaleDateString() : 'Sin fecha'}
                          </span>
                          <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded text-xs">
                            {item.duracion_minutos} Min
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
