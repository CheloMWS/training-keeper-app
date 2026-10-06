'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient'; 

export default function HistorialEntrenamientos() {
  // Lista maestra original de la base de datos
  const [todosLosEntrenamientos, setTodosLosEntrenamientos] = useState<any[]>([]);
  // Lista filtrada que se renderiza en la columna izquierda
  const [entrenamientosFiltrados, setEntrenamientosFiltrados] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<any | null>(null);
  
  // Listas de catálogos para los selectores de búsqueda
  const [clubesDB, setClubesDB] = useState<any[]>([]);
  const [categoriasDB, setCategoriasDB] = useState<any[]>([]);
  const [alumnosDB, setAlumnosDB] = useState<any[]>([]);

  // Estados de los filtros seleccionados por el usuario
  const [filtroClub, setFiltroClub] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroAlumnoId, setFiltroAlumnoId] = useState('');
  const [entrenamientosPorAlumno, setEntrenamientosPorAlumno] = useState<string[]>([]);
  
  // Detalles dinámicos del entrenamiento elegido
  const [rutinaDetalle, setRutinaDetalle] = useState<any[]>([]);
  const [asistenciaDetalle, setAsistenciaDetalle] = useState<any[]>([]);
  
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // EFECTO A: Descargar historial base y los catálogos para los selectores de filtros
  useEffect(() => {
    const descargarCatalogosYHistorial = async () => {
      setCargandoLista(true);
      
      const { data: entros } = await supabase.from('entrenamientos').select('*').order('creado_en', { ascending: false });
      const { data: clubs } = await supabase.from('clubes').select('*').order('nombre', { ascending: true });
      const { data: cats } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
      const { data: alums } = await supabase.from('alumnos').select('id, nombre_completo').order('nombre_completo', { ascending: true });

      if (entros) {
        setTodosLosEntrenamientos(entros);
        setEntrenamientosFiltrados(entros);
      }
      if (clubs) setClubesDB(clubs);
      if (cats) setCategoriasDB(cats);
      if (alums) setAlumnosDB(alums);
      
      setCargandoLista(false);
    };
    descargarCatalogosYHistorial();
  }, []);

  // EFECTO B: Buscar en la tabla intermedia de asistencias qué entrenamientos corresponden al alumno elegido
  useEffect(() => {
    const obtenerEntrenamientosDeAlumno = async () => {
      if (!filtroAlumnoId) {
        setEntrenamientosPorAlumno([]);
        return;
      }
      // Buscamos los IDs de entrenamientos donde este alumno estuvo presente o ausente registrado
      const { data, error } = await supabase
        .from('asistencias')
        .select('entrenamiento_id')
        .eq('alumno_id', filtroAlumnoId);

      if (!error && data) {
        setEntrenamientosPorAlumno(data.map(a => a.entrenamiento_id));
      } else {
        setEntrenamientosPorAlumno([]);
      }
    };
    obtenerEntrenamientosDeAlumno();
  }, [filtroAlumnoId]);

  // EFECTO C: Aplicar los filtros en cascada (Club, Categoría y Alumno) sobre la lista local
  useEffect(() => {
    let resultado = [...todosLosEntrenamientos];

    if (filtroClub) {
      resultado = resultado.filter(e => e.club === filtroClub);
    }
    if (filtroCategoria) {
      resultado = resultado.filter(e => e.categoria === filtroCategoria);
    }
    if (filtroAlumnoId) {
      resultado = resultado.filter(e => entrenamientosPorAlumno.includes(e.id));
    }

    setEntrenamientosFiltrados(resultado);
    
    // Si la sesión seleccionada sale del filtro, limpiamos el panel de detalle
    if (seleccionado && !resultado.some(e => e.id === seleccionado.id)) {
      setSeleccionado(null);
    }
  }, [filtroClub, filtroCategoria, filtroAlumnoId, entrenamientosPorAlumno, todosLosEntrenamientos]);

  // 3. DESCARGAR EL DETALLE DE EJERCICIOS Y ASISTENCIA CUANDO SE CLICKEA UNA SESIÓN
  const seleccionarEntrenamiento = async (entreno: any) => {
    setSeleccionado(entreno);
    setCargandoDetalle(true);
    setRutinaDetalle([]);
    setAsistenciaDetalle([]);

    try {
      const { data: rutina, error: err1 } = await supabase
        .from('entrenamiento_ejercicios')
        .select('orden, duracion_minutos, ejercicios (codigo, nombre, desarrollo, multimedia_url)')
        .eq('entrenamiento_id', entreno.id)
        .order('orden', { ascending: true });

      const { data: asistencia, error: err2 } = await supabase
        .from('asistencias')
        .select('presente, alumnos (nombre_completo)')
        .eq('entrenamiento_id', entreno.id);

      if (!err1 && rutina) setRutinaDetalle(rutina);
      if (!err2 && asistencia) setAsistenciaDetalle(asistencia);
    } catch (err) {
      console.error('Error al cargar detalle:', err);
    } finally {
      setCargandoDetalle(false);
    }
  };
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="border-b border-neutral-800 pb-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Historial General — Filtros de Entrenamientos Terminados</p>
          </div>
          <a href="/" className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
            ← Volver al Menú
          </a>
        </div>

        {/* SECCIÓN DE FILTROS EN CASCADA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800 mb-6 text-xs">
          {/* Filtro por Club */}
          <div>
            <label className="block text-neutral-400 mb-1.5 font-medium">Filtrar por Club</label>
            <select value={filtroClub} onChange={(e) => setFiltroClub(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none focus:border-emerald-500">
              <option value="">Todos los Clubes...</option>
              {clubesDB.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Filtro por Categoría / Equipo */}
          <div>
            <label className="block text-neutral-400 mb-1.5 font-medium">Filtrar por Categoría</label>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none focus:border-emerald-500">
              <option value="">Todas las Categorías...</option>
              {categoriasDB.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Filtro por Jugador */}
          <div>
            <label className="block text-neutral-400 mb-1.5 font-medium">Buscar por Jugador</label>
            <select value={filtroAlumnoId} onChange={(e) => setFiltroAlumnoId(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none focus:border-emerald-500">
              <option value="">Todos los Jugadores...</option>
              {alumnosDB.map(a => <option key={a.id} value={a.id}>{a.nombre_completo}</option>)}
            </select>
          </div>
        </div>

        {/* DOBLE PANEL INTERACTIVO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA IZQUIERDA: LISTADO DE PLANIFICACIONES FILTRADAS */}
          <div className="lg:col-span-1 bg-neutral-950 p-4 rounded-xl border border-neutral-800 h-[600px] overflow-y-auto space-y-3">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Sesiones ({entrenamientosFiltrados.length})</div>
              {(filtroClub || filtroCategoria || filtroAlumnoId) && (
                <button 
                  type="button" 
                  onClick={() => { setFiltroClub(''); setFiltroCategoria(''); setFiltroAlumnoId(''); }}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
            
            {cargandoLista ? (
              <div className="text-neutral-500 text-xs text-center py-8">Descargando historial...</div>
            ) : entrenamientosFiltrados.length === 0 ? (
              <div className="text-neutral-500 text-xs text-center py-8">No se encontraron entrenamientos.</div>
            ) : (
              entrenamientosFiltrados.map((entreno) => (
                <button
                  type="button" key={entreno.id} onClick={() => seleccionarEntrenamiento(entreno)}
                  className={`w-full text-left p-4 rounded-lg border text-xs transition-all flex flex-col gap-1.5 ${
                    seleccionado?.id === entreno.id 
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-white' 
                      : 'bg-neutral-900 border-neutral-800/80 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-emerald-400 text-sm">Entrenamiento Nº {entreno.numero_entrenamiento}</span>
                    <span className="text-[10px] text-neutral-500">{new Date(entreno.creado_en).toLocaleDateString()}</span>
                  </div>
                  <p className="font-semibold text-neutral-200">{entreno.club}</p>
                  <p className="text-neutral-400 text-[11px]">{entreno.categoria} — División {entreno.division}</p>
                </button>
              ))
            )}
          </div>
          {/* COLUMNA DERECHA: DETALLE DINÁMICO (2/3 de pantalla) */}
          <div className="lg:col-span-2 bg-neutral-950 p-6 rounded-xl border border-neutral-800 h-[600px] overflow-y-auto">
            {!seleccionado ? (
              <div className="h-full flex flex-col justify-center items-center text-center text-neutral-500 py-12">
                <span className="text-3xl mb-2">📋</span>
                <p className="text-xs max-w-xs">Seleccioná un entrenamiento de la lista de la izquierda para ver el cronograma táctico y el control de asistencia diario.</p>
              </div>
            ) : cargandoDetalle ? (
              <div className="h-full flex justify-center items-center text-neutral-500 text-xs">Cargando datos del servidor...</div>
            ) : (
              <div className="space-y-6">
                
                {/* Cabecera del Detalle */}
                <div className="border-b border-neutral-800 pb-4">
                  <h2 className="text-xl font-bold text-emerald-400">Sesión Nº {seleccionado.numero_entrenamiento} — {seleccionado.club}</h2>
                  <p className="text-xs text-neutral-400 mt-1">Foco Táctico: <span className="text-neutral-200 font-medium">{seleccionado.objetivo_sesion || 'No definido'}</span></p>
                </div>

                {/* Sub-bloque 1: Cronograma de Ejercicios */}
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-3">⏱️ Cronograma y Bloques de Duración</div>
                  <div className="space-y-3">
                    {rutinaDetalle.length === 0 ? (
                      <div className="text-neutral-600 text-xs italic">No se asociaron ejercicios a esta sesión.</div>
                    ) : (
                      rutinaDetalle.map((item, idx) => (
                        <div key={idx} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex flex-col gap-2 text-xs">
                          {/* Fila superior: Datos maestros del bloque */}
                          <div className="flex justify-between items-center w-full">
                            <span className="text-neutral-200 font-semibold">
                              {item.orden}. <span className="text-neutral-500 font-medium">[{item.ejercicios?.codigo}]</span> {item.ejercicios?.nombre}
                            </span>
                            <span className="text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px] shrink-0">
                              {item.duracion_minutos} Min
                            </span>
                          </div>

                          {/* Fila inferior: Desarrollo y Multimedia */}
                          {(item.ejercicios?.desarrollo || item.ejercicios?.multimedia_url) && (
                            <div className="bg-neutral-950/60 border border-neutral-800/40 p-2.5 rounded text-neutral-400 leading-relaxed flex flex-col gap-2">
                              {item.ejercicios?.desarrollo && (
                                <p className="whitespace-pre-line text-[11px] text-neutral-300">
                                  {item.ejercicios.desarrollo}
                                </p>
                              )}
                              
                              {item.ejercicios?.multimedia_url && (
                                <div className="pt-1.5 border-t border-neutral-800/60 flex justify-end">
                                  <a 
                                    href={item.ejercicios.multimedia_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 uppercase tracking-wider"
                                  >
                                    📺 Ver Video
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sub-bloque 2: Lista de Asistencia */}
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-3">✅ Control de Asistencia del Plantel</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {asistenciaDetalle.length === 0 ? (
                      <div className="text-neutral-600 text-xs italic md:col-span-2">No se tomó asistencia en este entrenamiento.</div>
                    ) : (
                      asistenciaDetalle.map((item, idx) => (
                        <div key={idx} className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg flex justify-between items-center text-xs">
                          <span className="text-neutral-200 font-medium">{item.alumnos?.nombre_completo}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.presente 
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' 
                              : 'bg-red-950/60 text-red-400 border border-red-800/50'
                          }`}>
                            {item.presente ? 'PRESENTE' : 'AUSENTE'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sub-bloque 3: Observaciones Globales */}
                {seleccionado.observaciones && (
                  <div className="bg-neutral-900/60 border border-neutral-800/60 p-4 rounded-xl">
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Anotaciones del Entrenador</div>
                    <p className="text-xs text-neutral-300 leading-relaxed italic">"{seleccionado.observaciones}"</p>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
