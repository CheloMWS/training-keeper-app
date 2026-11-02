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

  // --- NUEVOS ESTADOS COMPLEMENTARIOS PARA EL MODO EDICIÓN ---
  const [isEditing, setIsEditing] = useState(false) 
  const [editObjetivoSesion, setEditObjetivoSesion] = useState('')
  const [editObservaciones, setEditObservaciones] = useState('')
  const [editNumeroEntrenamiento, setEditNumeroEntrenamiento] = useState('')

  // --- NUEVOS ESTADOS PARA SUMAR JUGADORES AJENOS EN EL HISTORIAL ---
  const [todosLosAlumnosMaestro, setTodosLosAlumnosMaestro] = useState<any[]>([])
  const [busquedaExterno, setBusquedaExterno] = useState('')
  const [mostrarDropdownExternos, setMostrarDropdownExternos] = useState(false)

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
        .select('id, codigo, nombre, rubro, multimedia_url, desarrollo, objetivos, subrubro')
        .order('nombre', { ascending: true })

      if (dataEjercicios) setEjerciciosCatalogo(dataEjercicios)

      // Carga maestra de alumnos para el buscador de invitados
      const { data: dataTodosAlumnos } = await supabase
        .from('alumnos')
        .select('id, nombre_completo, categoria, division, club')
        .order('nombre_completo', { ascending: true })

      if (dataTodosAlumnos) setTodosLosAlumnosMaestro(dataTodosAlumnos)

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
  // 2. CARGAR SUB-DATOS EN CALIENTE CON DESCARGA MULTIMEDIA DE RELACIÓN CRUZADA
  useEffect(() => {
    if (!seleccionado) {
      setRutinaDetalle([])
      setAsistenciaDetalle([])
      setIsEditing(false)
      return
    }

    async function descargarDetalles() {
      setCargandoDetalle(true)
      setMensajeExito('')

      const { data: ejers } = await supabase
        .from('entrenamiento_ejercicios')
        .select('ejercicio_id, duracion_minutos, ejercicios(codigo, nombre, objetivos, subrubro, multimedia_url, desarrollo)')
        .eq('entrenamiento_id', seleccionado.id)
        .order('orden', { ascending: true })

      if (ejers) setRutinaDetalle(ejers)

      const { data: asists } = await supabase
        .from('asistencias')
        .select('alumno_id, presente, alumnos(nombre_completo)')
        .eq('entrenamiento_id', seleccionado.id)

      if (asists) setAsistenciaDetalle(asists)

      setEditObjetivoSesion(seleccionado.objetivo_sesion || '')
      setEditObservaciones(seleccionado.observaciones || '')
      setEditNumeroEntrenamiento(seleccionado.numero_entrenamiento || '1')
      setIsEditing(false)
      
      setCargandoDetalle(false)
    }

    descargarDetalles()
  }, [seleccionado, supabase])

  // 3. EFECTO REACTIVO: FILTRADO DE LA LISTA IZQUIERDA
  useEffect(() => {
    let filtrados = [...todosLosEntrenamientos]

    if (filtroFecha) filtrados = filtrados.filter(e => e.fecha === filtroFecha)
    if (filtroClub) filtrados = filtrados.filter(e => e.club === filtroClub)
    if (filtroCategoria) filtrados = filtrados.filter(e => e.categoria === filtroCategoria)

    setEntrenamientosFiltrados(filtrados)
  }, [filtroFecha, filtroClub, filtroCategoria, todosLosEntrenamientos])

  // 4. FUNCIÓN DE GUARDADO SINCRO PARA EDICIÓN COMPLETA
  const handleGuardarCambios = async () => {
    if (!seleccionado) return
    setGuardando(true)
    setMensajeExito('')

    try {
      const { error: errorEntrenamiento } = await supabase
        .from('entrenamientos')
        .update({
          objetivo_sesion: editObjetivoSesion.trim(),
          observaciones: editObservaciones.trim()
        })
        .eq('id', seleccionado.id)

      if (errorEntrenamiento) throw errorEntrenamiento

      const { error: errorBorrarEjercicios } = await supabase
        .from('entrenamiento_ejercicios')
        .delete()
        .eq('entrenamiento_id', seleccionado.id)

      if (errorBorrarEjercicios) throw errorBorrarEjercicios

      if (rutinaDetalle.length > 0) {
        const filasEjercicios = rutinaDetalle.map((item, idx) => ({
          entrenamiento_id: seleccionado.id,
          ejercicio_id: item.ejercicio_id || item.id,
          duracion_minutos: parseInt(item.duracion_minutos) || 15,
          orden: idx + 1 
        }))

        const { error: errorInsertarEjercicios } = await supabase
          .from('entrenamiento_ejercicios')
          .insert(filasEjercicios)

        if (errorInsertarEjercicios) throw errorInsertarEjercicios
      }

      const { error: errorBorrarAsistencia } = await supabase
        .from('asistencias')
        .delete()
        .eq('entrenamiento_id', seleccionado.id)

      if (errorBorrarAsistencia) throw errorBorrarAsistencia

      if (asistenciaDetalle.length > 0) {
        const filasAsistencia = asistenciaDetalle.map(item => ({
          entrenamiento_id: seleccionado.id,
          alumno_id: item.alumno_id || item.id,
          presente: item.presente ?? false
        }))

        const { error: errorInsertarAsistencia } = await supabase
          .from('asistencias')
          .insert(filasAsistencia)

        if (errorInsertarAsistencia) throw errorInsertarAsistencia
      }

      const mapearCambio = (e: any) => e.id === seleccionado.id ? { 
        ...e, 
        objetivo_sesion: editObjetivoSesion.trim(), 
        observaciones: editObservaciones.trim()
      } : e

      setTodosLosEntrenamientos(prev => prev.map(mapearCambio))
      setEntrenamientosFiltrados(prev => prev.map(mapearCambio))

      setMensajeExito('¡Planificación modificada y guardada con éxito en Supabase! 🚀🔥')
      setIsEditing(false)

    } catch (err: any) {
      console.error('Error al modificar entrenamiento:', err)
      alert(`No se pudieron guardar los cambios: ${err?.message || 'Error de consistencia'}`)
    } finally {
      setGuardando(false)
    }
  }

  const cambiarMinutosEjercicioEdicion = (ejercicioId: string, nuevosMinutos: number) => {
    setRutinaDetalle(prev => prev.map(item => (item.ejercicio_id === ejercicioId) ? { ...item, duracion_minutos: nuevosMinutos } : item))
  }

  const quitarEjercicioEdicion = (ejercicioId: string) => {
    setRutinaDetalle(prev => prev.filter(item => item.ejercicio_id !== ejercicioId))
  }

  const conmutarAsistenciaEdicion = (alumnoId: string) => {
    setAsistenciaDetalle(prev => prev.map(item => (item.alumno_id === alumnoId) ? { ...item, presente: !item.presente } : item))
  }

  const agregarJugadorExternoEdicion = (alumno: any) => {
    const aluId = alumno.id
    const yaExiste = asistenciaDetalle.some(item => (item.alumno_id || item.id) === aluId)
    
    if (yaExiste) {
      alert('Este jugador ya se encuentra asignado a este entrenamiento.')
      return
    }

    setAsistenciaDetalle(prev => [
      ...prev,
      {
        alumno_id: aluId,
        presente: true,
        alumnos: {
          nombre_completo: alumno.nombre_completo
        }
      }
    ])
    setBusquedaExterno('')
    setMostrarDropdownExternos(false)
  }
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-xs mt-0.5">Historial de Sesiones — Consulta, Auditoría y Modificación en Caliente</p>
          </div>
          <button 
            type="button" onClick={() => router.push('/')} 
            className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors bg-neutral-950 cursor-pointer"
          >
            ← Volver al Menú
          </button>
        </div>

        {/* BARRA COMPACTA DE FILTROS HORIZONTALES */}
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end shadow-md">
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold">Filtrar por Fecha</label>
            <input 
              type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold">Filtrar por Club</label>
            <select 
              value={filtroClub} onChange={(e) => setFiltroClub(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">-- Todos los Clubes --</option>
              {clubesDB.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold">Filtrar Categoría</label>
            <select 
              value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">-- Todas las Categorías --</option>
              {categoriasDB.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            type="button" onClick={() => { setFiltroFecha(''); setFiltroClub(''); setFiltroCategoria('') }}
            className="w-full py-2 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer"
          >
            Limpiar Filtros
          </button>
        </div>

        {/* CONTENEDOR PRINCIPAL: DOS COLUMNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA: PANEL DE CRONOGRAMA HISTÓRICO */}
          <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-xl p-4 h-[600px] flex flex-col overflow-hidden shadow-xl">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2 mb-3">
              📅 Entrenamientos Registrados ({entrenamientosFiltrados.length})
            </div>

            {cargandoLista ? (
              <div className="text-xs text-neutral-500 text-center py-12">Sincronizando con el servidor remoto...</div>
            ) : entrenamientosFiltrados.length === 0 ? (
              <div className="text-xs text-neutral-600 italic text-center py-12">No se registran planificaciones para este criterio.</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {entrenamientosFiltrados.map((item) => (
                  <button
                    key={item.id} type="button" onClick={() => { if (!guardando) setSeleccionado(item) }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                      seleccionado?.id === item.id ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md' : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-xs font-bold text-emerald-400">{item.fecha}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">
                        Práctica N°{item.numero_entrenamiento || 1}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-neutral-200 truncate mt-0.5">{item.club}</div>
                    <div className="text-xs text-neutral-400 font-medium">Categoría: <span className="text-neutral-300">{item.categoria}</span></div>
                    <div className="text-[11px] text-neutral-500 italic truncate mt-1 border-t border-neutral-900 pt-1">🎯 Foco: {item.objetivo_sesion || 'General'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* COLUMNA DERECHA: MONITOR E INTERFAZ DE EDICIÓN EN CALIENTE */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-[600px] flex flex-col justify-between overflow-hidden shadow-xl">
            
            {!seleccionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 text-xs italic gap-2">
                <span className="text-3xl">📋</span>
                Selecciona una sesión de entrenamiento del panel izquierdo para auditar la rutina o modificar su planificación.
              </div>
            ) : cargandoDetalle ? (
              <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
                Cargando datos relacionales desde Supabase en tiempo real...
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between overflow-hidden space-y-4">
                
                {/* Cabecera Interna de la Ficha */}
                <div className="border-b border-neutral-800 pb-3 flex justify-between items-start shrink-0">
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-bold text-neutral-200">{seleccionado.club}</h2>
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {seleccionado.categoria}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 font-medium font-mono">Fecha de Ejecución: {seleccionado.fecha}</p>
                  </div>

                  {/* Acciones de Edición */}
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button" onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button" onClick={handleGuardarCambios} disabled={guardando}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md disabled:bg-neutral-800 disabled:text-neutral-500 cursor-pointer"
                        >
                          {guardando ? 'Sincronizando...' : 'Guardar Cambios'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button" onClick={() => setIsEditing(true)}
                        className="px-4 py-1.5 bg-neutral-950 border border-neutral-800 text-emerald-400 hover:border-emerald-500/40 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                      >
                        ✏️ Editar Planificación
                      </button>
                    )}
                  </div>
                </div>

                {/* Alertas de Almacenamiento */}
                {mensajeExito && (
                  <div className="p-3 bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 rounded-lg text-xs font-bold shrink-0">
                    {mensajeExito}
                  </div>
                )}

                {/* CUERPO CENTRAL SCROLLEABLE INTERACTIVO */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  
                  {/* Bloque 1: Campos del Encabezado */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/50">
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold">Número Práctica</label>
                      <input 
                        type="number" value={editNumeroEntrenamiento} onChange={(e) => setEditNumeroEntrenamiento(e.target.value)} disabled={!isEditing}
                        className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 disabled:bg-transparent"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold">Objetivo / Foco General</label>
                      <input 
                        type="text" value={editObjetivoSesion} onChange={(e) => setEditObjetivoSesion(e.target.value)} disabled={!isEditing}
                        className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 disabled:bg-transparent"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold">Observaciones Globales</label>
                      <textarea 
                        value={editObservaciones} onChange={(e) => setEditObservaciones(e.target.value)} disabled={!isEditing} rows={2}
                        className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50 resize-none disabled:opacity-50 disabled:bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Bloque 2: Cronograma de Ejercicios */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">📋 Cronograma de Ejercicios</div>
                      {isEditing && (
                        <select
                          onChange={(e) => {
                            const idEncontrado = e.target.value
                            if (!idEncontrado) return
                            const objetoCatalogo = ejerciciosCatalogo.find(x => x.id === idEncontrado)
                            if (objetoCatalogo) {
                              const yaExiste = rutinaDetalle.some(item => (item.ejercicio_id || item.id) === idEncontrado)
                              if (yaExiste) { alert('Este ejercicio ya existe.'); return }
                              setRutinaDetalle(prev => [...prev, {
                                ejercicio_id: idEncontrado, duracion_minutos: 15,
                                ejercicios: { codigo: objetoCatalogo.codigo || 'KEE', nombre: objetoCatalogo.nombre, objetivos: objetoCatalogo.objetivos, subrubro: objetoCatalogo.subrubro, multimedia_url: objetoCatalogo.multimedia_url, desarrollo: objetoCatalogo.desarrollo }
                              }])
                            }
                            e.target.value = ""
                          }}
                          className="text-[11px] bg-neutral-950 border border-neutral-800 text-emerald-400 font-bold p-1.5 rounded-lg cursor-pointer max-w-[220px]"
                        >
                          <option value="">➕ Agregar Ejercicio...</option>
                          {ejerciciosCatalogo.map(ej => <option key={ej.id} value={ej.id}>{ej.nombre}</option>)}
                        </select>
                      )}
                    </div>
    
                    {rutinaDetalle.length === 0 ? (
                      <div className="text-neutral-600 bg-neutral-950/40 text-xs italic py-4 text-center rounded-lg border border-neutral-800/40">Sin ejercicios.</div>
                    ) : (
                      <div className="space-y-2">
                        {rutinaDetalle.map((item, index) => {
                          const ejId = item.ejercicio_id || item.id
                          return (
                            <div key={index} className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-xl flex flex-col gap-2 shadow-sm">
                              <div className="flex items-center justify-between gap-4 border-b border-neutral-900 pb-1.5">
                                <div className="truncate flex-1">
                                  <span className="bg-neutral-900 text-neutral-500 font-mono text-[8px] px-1 py-0.2 rounded">[{item.ejercicios?.codigo || item.codigo || 'KEE'}]</span>
                                  <span className="font-bold text-neutral-300 text-[11px] ml-1">{item.ejercicios?.nombre || item.nombre}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <input type="number" value={item.duracion_minutos} disabled={!isEditing} onChange={(e) => cambiarMinutosEjercicioEdicion(ejId, parseInt(e.target.value) || 0)} className="w-10 text-center rounded border border-neutral-800 bg-neutral-900 py-0.5 text-emerald-400 text-xs" />
                                  {isEditing && <button type="button" onClick={() => quitarEjercicioEdicion(ejId)} className="text-red-400 font-bold px-1 text-xs">✕</button>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {/* Bloque 3: Control de Asistencia del Plantel e Invitados */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-800 pb-1.5 mb-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">👥 Asistencia del Plantel ({asistenciaDetalle.length})</div>
                      {isEditing && (
                        <div className="relative w-full sm:w-56">
                          <input
                            type="text" placeholder="🔍 Sumar invitado..." value={busquedaExterno}
                            onChange={(e) => { setBusquedaExterno(e.target.value); setMostrarDropdownExternos(true) }}
                            onFocus={() => setMostrarDropdownExternos(true)}
                            className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-1.5 text-neutral-200 placeholder-neutral-600 focus:outline-none"
                          />
                          {mostrarDropdownExternos && busquedaExterno.trim() !== '' && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl max-h-32 overflow-y-auto">
                              {todosLosAlumnosMaestro
                                .filter(a => a.nombre_completo.toLowerCase().includes(busquedaExterno.toLowerCase()) && !asistenciaDetalle.some(x => (x.alumno_id || x.id) === a.id))
                                .slice(0, 5).map(alumno => (
                                  <button key={alumno.id} type="button" onClick={() => agregarJugadorExternoEdicion(alumno)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-800 flex justify-between items-center border-b border-neutral-950 last:border-0">
                                    <span className="text-neutral-200 font-semibold truncate">{alumno.nombre_completo} ({alumno.club || 'Libre'})</span>
                                    <span className="text-[10px] text-emerald-400 font-bold shrink-0">+ Sumar</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" onClick={() => setMostrarDropdownExternos(false)}>
                      {asistenciaDetalle.map((item, index) => {
                        const alId = item.alumno_id || item.id
                        const clubDeOrigen = todosLosAlumnosMaestro.find(x => x.id === alId)?.club
                        return (
                          <button key={index} type="button" disabled={!isEditing} onClick={() => conmutarAsistenciaEdicion(alId)} className="p-2 rounded-xl border text-left text-xs flex justify-between items-center bg-neutral-950 border-neutral-800/50">
                            <div className="truncate">
                              <span className="text-neutral-200 font-bold block truncate">{item.alumnos?.nombre_completo || item.nombre_completo || 'Arquero'}</span>
                              {clubDeOrigen && seleccionado && clubDeOrigen !== seleccionado.club && <span className="text-[9px] text-amber-400 font-mono block">🌟 Invitado: {clubDeOrigen}</span>}
                            </div>
                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${item.presente ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-red-950 text-red-400 border-red-900'}`}>{item.presente ? 'Presente' : 'Ausente'}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

