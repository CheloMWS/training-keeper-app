'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function HistorialPlanificacionesPage() {
  const router = useRouter()

  // --- CATALOGOS DE BUSQUEDA (Para alimentar los selectores) ---
  const [clubesDB, setClubesDB] = useState<string[]>([])
  const [categoriasDB, setCategoriasDB] = useState<string[]>([])
  const [ejerciciosCatalogo, setEjerciciosCatalogo] = useState<any[]>([])

  // --- BARRA COMPACTA: FILTROS SELECCIONADOS ---
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroClub, setFiltroClub] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  // --- MAESTRO DE ENTRENAMIENTOS Y SELECCIONADO ---
  const [todosLosEntrenamientos, setTodosLosEntrenamientos] = useState<any[]>([])
  const [entrenamientosFiltrados, setEntrenamientosFiltrados] = useState<any[]>([])
  const [seleccionado, setSeleccionado] = useState<any | null>(null)
  
  // --- SUB-DATOS DINÁMICOS EN EDICIÓN EN CALIENTE ---
  const [rutinaDetalle, setRutinaDetalle] = useState<any[]>([])
  const [asistenciaDetalle, setAsistenciaDetalle] = useState<any[]>([])

  // --- ESTADOS DE CONTROL Y PROCESOS ---
  const [cargandoLista, setCargandoLista] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: true, autoRefreshToken: true }
    }
  )

  // 1. CARGA INICIAL DE HISTORIAL Y CATALOGOS BASE
  useEffect(() => {
    async function inicializarHistorial() {
      setCargandoLista(true)
      await supabase.auth.getSession()

      const { data: entros } = await supabase
        .from('entrenamientos')
        .select('*')
        .order('fecha', { ascending: false })

      if (entros) {
        setTodosLosEntrenamientos(entros)
        setEntrenamientosFiltrados(entros)
      }

      const { data: dataEjercicios } = await supabase
        .from('ejercicios')
        .select('id, codigo, nombre, rubro, multimedia_url, desarrollo')
        .order('nombre', { ascending: true })

      if (dataEjercicios) setEjerciciosCatalogo(dataEjercicios)

      const { data: dataClubes } = await supabase
        .from('clubes')
        .select('nombre')
        .order('nombre', { ascending: true })

      if (dataClubes) {
        setClubesDB(dataClubes.map(c => c.nombre).filter(Boolean))
      }

      const { data: dataCats } = await supabase
        .from('categorias')
        .select('nombre')
        .order('nombre', { ascending: true })

      if (dataCats) {
        setCategoriasDB(dataCats.map(c => c.nombre).filter(Boolean))
      }
      
      setCargandoLista(false)
    }
    inicializarHistorial()
  }, [supabase])
  // 2. FILTRADO EN CASCADA COMPACTO (Fecha, Club y Categoría)
  useEffect(() => {
    let resultado = [...todosLosEntrenamientos]

    if (filtroFecha) {
      resultado = resultado.filter(e => e.fecha === filtroFecha)
    }
    if (filtroClub) {
      resultado = resultado.filter(e => e.club === filtroClub)
    }
    if (filtroCategoria) {
      resultado = resultado.filter(e => e.categoria === filtroCategoria)
    }

    setEntrenamientosFiltrados(resultado)
    
    // Si la sesión elegida sale del rango de los filtros, cerramos el visor
    if (seleccionado && !resultado.some(e => e.id === seleccionado.id)) {
      setSeleccionado(null)
    }
  }, [filtroFecha, filtroClub, filtroCategoria, todosLosEntrenamientos, seleccionado])

  // 3. DESCARGAR DETALLES INTERACTIVOS AL SELECCIONAR UNA SESIÓN
  const seleccionarEntrenamiento = async (entreno: any) => {
    setSeleccionado(entreno)
    setCargandoDetalle(true)
    setMensajeExito('')
    setRutinaDetalle([])
    setAsistenciaDetalle([])

    try {
      // Traemos ejercicios asociados cruzando datos maestros
      const { data: rutina, error: err1 } = await supabase
        .from('entrenamiento_ejercicios')
        .select('id, entrenamiento_id, ejercicio_id, duracion_minutos, ejercicios (codigo, nombre, desarrollo, multimedia_url)')
        .eq('entrenamiento_id', entreno.id)

      // Traemos la asistencia de los arqueros cruzando sus nombres completos
      const { data: asistencia, error: err2 } = await supabase
        .from('asistencias')
        .select('id, entrenamiento_id, alumno_id, presente, alumnos (nombre_completo)')
        .eq('entrenamiento_id', entreno.id)

      if (!err1 && rutina) setRutinaDetalle(rutina)
      if (!err2 && asistencia) setAsistenciaDetalle(asistencia)
    } catch (err) {
      console.error('Error al cargar detalle interactivo:', err)
    } finally {
      setCargandoDetalle(false)
    }
  }

  // --- CONTROLES DE EDICIÓN EN CALIENTE ---
  const cambiarMinutosEjercicio = (id: string, minutos: number) => {
    setRutinaDetalle(prev => prev.map(item => item.id === id ? { ...item, duracion_minutos: minutos } : item))
  }

  const quitarEjercicioDeSesion = (id: string) => {
    setRutinaDetalle(prev => prev.filter(item => item.id !== id))
  }

  const toggleAsistenciaArquero = (id: string) => {
    setAsistenciaDetalle(prev => prev.map(item => item.id === id ? { ...item, presente: !item.presente } : item))
  }
  // 4. GUARDAR CAMBIOS MODIFICADOS EN LA BASE DE DATOS
  const handleGuardarCambios = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seleccionado) return
    setGuardando(true)
    setMensajeExito('')

    try {
      // A. Actualizar Cronograma de Ejercicios (Limpieza e inserción fresca)
      const { error: errDelEjercicios } = await supabase
        .from('entrenamiento_ejercicios')
        .delete()
        .eq('entrenamiento_id', seleccionado.id)

      if (errDelEjercicios) throw errDelEjercicios

      if (rutinaDetalle.length > 0) {
        const filasEjercicios = rutinaDetalle.map(item => ({
          entrenamiento_id: seleccionado.id,
          ejercicio_id: item.ejercicio_id,
          duracion_minutos: item.duracion_minutos
        }))

        const { error: errInsEjercicios } = await supabase
          .from('entrenamiento_ejercicios')
          .insert(filasEjercicios)

        if (errInsEjercicios) throw errInsEjercicios
      }

      // B. Actualizar Asistencias una por una mediante su ID de fila
      for (const item of asistenciaDetalle) {
        const { error: errAsis } = await supabase
          .from('asistencias')
          .update({ presente: item.presente })
          .eq('id', item.id)

        if (errAsis) throw errAsis
      }

      setMensajeExito('¡Sesión de entrenamiento modificada y guardada con éxito en Supabase! 🚀')
    } catch (err) {
      console.error('Error crítico al modificar entrenamiento:', err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl space-y-6">
        
        {/* Encabezado */}
        <div className="border-b border-neutral-800 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Administrador de Historial — Ver, Editar y Modificar Planificaciones</p>
          </div>
          <button 
            type="button"
            onClick={() => router.push('/')} 
            className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors bg-neutral-950"
          >
            ← Volver al Menú
          </button>
        </div>

        {mensajeExito && (
          <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-xl text-emerald-400 text-xs text-center font-semibold">
            {mensajeExito}
          </div>
        )}

        {/* BARRA DE FILTROS SUPERIOR EN UNA SOLA LÍNEA HORIZONTAL */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Fecha</label>
            <input 
              type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Club</label>
            <select 
              value={filtroClub} onChange={(e) => setFiltroClub(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="">-- Todos los Clubes --</option>
              {clubesDB.map((club, idx) => (
                <option key={idx} value={club}>{club}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Categoría</label>
            <select 
              value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="">-- Todas las Categorías --</option>
              {categoriasDB.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!filtroFecha && !filtroClub && !filtroCategoria}
            onClick={() => { setFiltroFecha(''); setFiltroClub(''); setFiltroCategoria('') }}
            className="w-full text-center py-2 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 rounded-lg text-xs font-bold transition-all disabled:opacity-30 tracking-wider uppercase"
          >
            Limpiar Filtros
          </button>
        </div>
        {/* DOBLE PANEL INTERACTIVO DE ADMINISTRACIÓN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA: LISTADO DE PLANIFICACIONES ENCONTRADAS */}
          <div className="lg:col-span-1 bg-neutral-950 p-4 rounded-xl border border-neutral-800 h-[520px] overflow-y-auto space-y-2">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2 mb-2">
              Sesiones Registradas ({entrenamientosFiltrados.length})
            </div>
            
            {cargandoLista ? (
              <div className="text-neutral-500 text-xs text-center py-8">Sincronizando con Supabase...</div>
            ) : entrenamientosFiltrados.length === 0 ? (
              <div className="text-neutral-500 text-xs text-center py-8">No se encontraron entrenamientos con los filtros aplicados.</div>
            ) : (
              entrenamientosFiltrados.map((entreno) => (
                <button
                  type="button" key={entreno.id} onClick={() => seleccionarEntrenamiento(entreno)}
                  className={`w-full text-left p-3.5 rounded-lg border text-xs transition-all flex flex-col gap-1 ${
                    seleccionado?.id === entreno.id 
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-white shadow-md shadow-emerald-950/10' 
                      : 'bg-neutral-900 border-neutral-800/80 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-0.5">
                    <span className="font-bold text-emerald-400 text-[13px]">📅 {entreno.fecha}</span>
                  </div>
                  <p className="font-bold text-neutral-100 text-xs">{entreno.club}</p>
                  <p className="text-neutral-400 text-[11px]">{entreno.categoria}</p>
                </button>
              ))
            )}
          </div>

          {/* COLUMNA DERECHA: FORMULARIO INTERACTIVO DE EDICIÓN EN CALIENTE */}
          <div className="lg:col-span-2 bg-neutral-950 p-5 rounded-xl border border-neutral-800 h-[520px] flex flex-col justify-between">
            {!seleccionado ? (
              <div className="h-full flex flex-col justify-center items-center text-center text-neutral-500 py-12 my-auto">
                <span className="text-2xl block mb-2">📋</span>
                <p className="text-xs max-w-xs leading-relaxed">
                  Selecciona una sesión del historial a la izquierda para auditar, editar y re-guardar la planificación táctica.
                </p>
              </div>
            ) : cargandoDetalle ? (
              <div className="h-full flex justify-center items-center text-neutral-500 text-xs my-auto">
                Descargando estructura táctica y plantel...
              </div>
            ) : (
              <form onSubmit={handleGuardarCambios} className="h-full flex flex-col justify-between overflow-hidden">
                <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                  
                  {/* Cabecera Interna del Detalle */}
                  <div className="border-b border-neutral-800 pb-2.5">
                    <h2 className="text-base font-bold text-emerald-400 uppercase tracking-wide">
                      {seleccionado.club} — <span className="text-neutral-300">{seleccionado.categoria}</span>
                    </h2>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Fecha Oficial de la Sesión: <span className="text-neutral-300 font-medium">{seleccionado.fecha}</span></p>
                  </div>

                  {/* Contenedor scrolleable interno para evitar desborde */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    
                    {/* SUB-BLOQUE A: CRONOGRAMA DE EJERCICIOS EDITABLES */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">⏱️ Modificar Duración y Rutina</div>
                      {rutinaDetalle.length === 0 ? (
                        <div className="text-neutral-600 text-xs italic bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/40">No se registraron ejercicios asociados.</div>
                      ) : (
                        rutinaDetalle.map((item, idx) => (
                          <div key={item.id || idx} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl flex flex-col gap-2 text-xs">
                            <div className="flex justify-between items-center w-full">
                              <span className="text-neutral-200 font-bold text-[13px]">
                                <span className="text-neutral-500 font-mono text-[11px] mr-1">[{item.ejercicios?.codigo}]</span>
                                {item.ejercicios?.nombre}
                              </span>
                              
                              <div className="flex items-center gap-3 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number" min={1} max={120} value={item.duracion_minutos}
                                    onChange={(e) => cambiarMinutosEjercicio(item.id, parseInt(e.target.value) || 0)}
                                    className="w-14 text-center rounded border border-neutral-800 bg-neutral-950 py-0.5 text-xs text-emerald-400 font-bold focus:outline-none"
                                  />
                                  <span className="text-neutral-500 text-[10px]">min</span>
                                </div>
                                <button
                                  type="button" onClick={() => quitarEjercicioDeSesion(item.id)}
                                  className="text-neutral-500 hover:text-red-400 transition-colors font-medium text-[11px]"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                            
                            {item.ejercicios?.desarrollo && (
                              <p className="text-[11px] text-neutral-400 bg-neutral-950/40 p-2 rounded border border-neutral-800/60 leading-relaxed max-h-16 overflow-y-auto whitespace-pre-wrap">
                                {item.ejercicios.desarrollo}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* SUB-BLOQUE B: CONTROL DE ASISTENCIA EDITABLE */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">✅ Modificar Asistencia del Plantel</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {asistenciaDetalle.length === 0 ? (
                          <div className="text-neutral-600 text-xs italic sm:col-span-2 bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/40">No hay registros de alumnos.</div>
                        ) : (
                          asistenciaDetalle.map((item) => (
                            <div 
                              key={item.id} 
                              onClick={() => toggleAsistenciaArquero(item.id)}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                item.presente 
                                  ? 'bg-emerald-950/20 border-emerald-800/30 text-neutral-200' 
                                  : 'bg-red-950/10 border-red-900/20 text-neutral-500 line-through'
                              }`}
                            >
                              <span className="font-bold text-neutral-200">{item.alumnos?.nombre_completo}</span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${item.presente ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/20 text-red-400'}`}>
                                {item.presente ? 'PRESENTE' : 'AUSENTE'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* BOTÓN GENERAL DE GUARDADO DE MODIFICACIONES */}
                <div className="border-t border-neutral-800 pt-3 mt-3">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="w-full text-center py-2.5 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-30 tracking-wider uppercase"
                  >
                    {guardando ? 'Guardando Cambios en Supabase...' : 'Guardar Cambios Sincronizados'}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
