'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function PlanificacionesPage() {
  const router = useRouter()

  // --- ESTADOS DE DATOS DESDE SUPABASE ---
  const [clubesDisponibles, setClubesDisponibles] = useState<string[]>([])
  const [equiposDisponibles, setEquiposDisponibles] = useState<string[]>([])
  const [ejerciciosCatalogo, setEjerciciosCatalogo] = useState<any[]>([])
  const [arquerosFiltrados, setArquerosFiltrados] = useState<any[]>([])

  // --- ESTADOS DEL FORMULARIO ACTUAL ---
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [clubSeleccionado, setClubSeleccionado] = useState('')
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('')
  const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState<any[]>([])
  const [asistencia, setAsistencia] = useState<{ [key: string]: boolean }>({})

  // --- ESTADOS NUEVOS PARA MODAL Y FILTRO POR RUBRO TÁCTICO ---
  const [ejercicioPrevisualizado, setEjercicioPrevisualizado] = useState<any | null>(null)
  const [rubroFiltrado, setRubroFiltrado] = useState('')

  // --- ESTADOS DE CARGA Y PROCESO ---
  const [cargandoBase, setCargandoBase] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  )
  // 1. CARGAR CATÁLOGO, JUGADORES COMPLETOS Y FILTRAR CLUBES POR PERMISO DEL PROFESOR
  const [todosLosAlumnosMaestro, setTodosLosAlumnosMaestro] = useState<any[]>([])

  useEffect(() => {
    async function inicializarModuloFiltrado() {
      setCargandoBase(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setCargandoBase(false)
        return
      }

      const usuarioId = session.user.id

      // A. Descargamos el catálogo de ejercicios (Compartido para todos)
      const { data: dataEjercicios } = await supabase
        .from('ejercicios')
        .select('id, codigo, nombre, rubro, multimedia_url, desarrollo, objetivos')
        .order('nombre', { ascending: true })

      if (dataEjercicios) setEjerciciosCatalogo(dataEjercicios)

      // B. Descargamos la lista maestra de alumnos
      const { data: dataTodosAlumnos } = await supabase
        .from('alumnos')
        .select('id, nombre_completo, categoria, division, club')
        .order('nombre_completo', { ascending: true })

      if (dataTodosAlumnos) setTodosLosAlumnosMaestro(dataTodosAlumnos)

      // C. Filtramos los Clubes: Leemos la tabla de permisos del usuario logueado en caliente
      const { data: misPermisos } = await supabase
        .from('entrenador_permisos')
        .select('club_asignado')
        .eq('user_id', usuarioId)

      if (misPermisos && misPermisos.length > 0) {
        const clubesPermitidos = Array.from(new Set(misPermisos.map(p => p.club_asignado).filter(Boolean))) as string[]
        setClubesDisponibles(clubesPermitidos)
      } else {
        setClubesDisponibles([])
      }

      setCargandoBase(false)
    }
    inicializarModuloFiltrado()
  }, [supabase])

  // 2. BUSCAR EQUIPOS FILTRADOS ESTRICTAMENTE POR SUS CATEGORÍAS ASIGNADAS
  useEffect(() => {
    if (!clubSeleccionado) {
      setEquiposDisponibles([])
      setEquipoSeleccionado('')
      return
    }

    async function cargarCategoriasFiltradas() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: misCategorias } = await supabase
        .from('entrenador_permisos')
        .select('categoria_asignada')
        .eq('user_id', session.user.id)
        .eq('club_asignado', clubSeleccionado)

      if (misCategorias && misCategorias.length > 0) {
        const categoriasPermitidas = Array.from(new Set(misCategorias.map(c => c.categoria_asignada).filter(Boolean))) as string[]
        setEquiposDisponibles(categoriasPermitidas)
      } else {
        setEquiposDisponibles([])
      }
    }
    cargarCategoriasFiltradas()
  }, [clubSeleccionado, supabase])

  // 3. CARGAR JUGADORES FILTRADOS POR CLUB Y CATEGORÍA REAL
  useEffect(() => {
    if (!clubSeleccionado || !equipoSeleccionado) {
      setArquerosFiltrados([])
      return
    }

    async function cargarJugadoresFiltrados() {
      const { data, error } = await supabase
        .from('alumnos')
        .select('id, nombre_completo, categoria, division')
        .eq('club', clubSeleccionado)
        .eq('categoria', equipoSeleccionado)
        .order('nombre_completo', { ascending: true })

      if (error) console.error("Error al traer alumnos filtrados:", error.message)

      if (data) {
        setArquerosFiltrados(data)
        const asistenciaInicial: { [key: string]: boolean } = {}
        data.forEach(arq => {
          asistenciaInicial[arq.id] = true
        })
        setAsistencia(asistenciaInicial)
      }
    }
    cargarJugadoresFiltrados()
  }, [clubSeleccionado, equipoSeleccionado, supabase])

  // --- MANIPULACIÓN DE EJERCICIOS EN EL VISOR DE RUTINA ---
  const cambiarDuracionEjercicio = (id: string, minutos: number) => {
    setEjerciciosSeleccionados(
      ejerciciosSeleccionados.map(e => e.id === id ? { ...e, duracion: minutos } : e)
    )
  }

  const quitarEjercicioDeRutina = (id: string) => {
    setEjerciciosSeleccionados(ejerciciosSeleccionados.filter(e => e.id !== id))
  }

  const toggleAsistencia = (id: string) => {
    setAsistencia(prev => ({ ...prev, [id]: !prev[id] }))
  }
  // 4. GUARDAR EL ENTRENAMIENTO COMPLETO EN LAS TABLAS ASOCIADAS
  const handleGuardarTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubSeleccionado || !equipoSeleccionado) {
      alert('Por favor, selecciona Club y Categoría antes de guardar.')
      return
    }
    setGuardando(true)

    try {
      // Capturamos los datos del formulario de manera nativa e independiente para evitar variables no declaradas
      const target = e.target as any
      const stringFecha = target.fecha?.value || new Date().toISOString().split('T')[0]
      const stringObjetivo = target.objetivo?.value || target.objetivo_sesion?.value || 'General táctico'
      const stringNumero = parseInt(target.numero_entrenamiento?.value) || 1
      const stringObs = target.observaciones?.value || ''

      // A. Insertamos el entrenamiento principal en la base de datos
      const { data: entros, error: errEntro } = await supabase
        .from('entrenamientos')
        .insert([
          {
            fecha: stringFecha,
            club: clubSeleccionado,
            categoria: equipoSeleccionado,
            division : equipoSeleccionado,
            objetivo_sesion: stringObjetivo.trim(),
            numero_entrenamiento: stringNumero,
            observaciones: stringObs.trim()
          }
        ])
        .select()

      if (errEntro) {
        console.error("Error directo en tabla entrenamientos:", errEntro)
        throw errEntro
      }

      if (!entros || entros.length === 0) {
        throw new Error('No se pudo recuperar el ID del entrenamiento generado')
      }
      
      // Capturamos el ID autogenerado por Supabase (soporta objeto o array)
      const nuevoEntrenamientoId = Array.isArray(entros) ? entros[0].id : entros.id

      // B. Insertamos el cronograma de ejercicios asociados
      if (ejerciciosSeleccionados.length > 0) {
        const filasEjercicios = ejerciciosSeleccionados.map((ej, idx) => ({
          entrenamiento_id: nuevoEntrenamientoId,
          ejercicio_id: ej.id,
          duracion_minutos: parseInt(ej.duracion) || 15,
          orden: idx + 1 // ← Inyecta 1, 2, 3... cumpliendo el NOT NULL de Supabase
        }))

        const { error: errEjercicios } = await supabase
          .from('entrenamiento_ejercicios')
          .insert(filasEjercicios)

        if (errEjercicios) {
          console.error("Error directo en tabla entrenamiento_ejercicios:", errEjercicios)
          throw errEjercicios
        }
      }

      // C. Insertamos el control de asistencia diario del plantel e invitados
      if (arquerosFiltrados.length > 0) {
        const filasAsistencia = arquerosFiltrados.map((arq) => ({
          entrenamiento_id: nuevoEntrenamientoId,
          alumno_id: arq.id,
          presente: asistencia[arq.id] ?? false
        }))

        const { error: errAsistencia } = await supabase
          .from('asistencias')
          .insert(filasAsistencia)

        if (errAsistencia) {
          console.error("Error directo en tabla asistencias:", errAsistencia)
          throw errAsistencia
        }
      }

      // Limpieza de la interfaz tras el guardado exitoso
      alert('¡Planificación del Entrenamiento guardada de forma exitosa en Supabase! 🚀🔥')
      
      // Intentamos resetear el formulario visual de HTML
      try { target.reset() } catch(e){}
      
      setEjerciciosSeleccionados([])
      setClubSeleccionado('')
      setEquipoSeleccionado('')

    } catch (err: any) {
      console.error('Error descriptivo al procesar la planificación completa:', {
        mensaje: err?.message || 'Error de estructura',
        detalles: err?.details || 'Verifique restricciones de columnas en Supabase',
        pista: err?.hint || 'Revise tipos de datos (números/textos)'
      })
      alert(`No se pudo guardar: ${err?.message || 'Error de sincronización'}`)
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
            <p className="text-neutral-400 text-sm mt-1">Planificación Avanzada — Filtro por Equipo y Asistencia Automatizada</p>
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

        {cargandoBase ? (
          <div className="text-center py-12 text-neutral-500 text-xs">Sincronizando catálogos estratégicos de Supabase...</div>
        ) : (
          <form onSubmit={handleGuardarTodo} className="space-y-6">
            
            {/* BARRA DE FILTROS SUPERIOR EN UNA SOLA LÍNEA HORIZONTAL */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Fecha</label>
                <input 
                  type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)}
                  className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Club</label>
                <select 
                  required value={clubSeleccionado} onChange={(e) => {
                    setClubSeleccionado(e.target.value)
                    setEquipoSeleccionado('')
                  }}
                  className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="">-- Elegir Club --</option>
                  {clubesDisponibles.map((club, idx) => (
                    <option key={idx} value={club}>{club}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Categoría</label>
                <select 
                  required 
                  disabled={!clubSeleccionado}
                  value={equipoSeleccionado} 
                  onChange={(e) => setEquipoSeleccionado(e.target.value)}
                  className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none disabled:opacity-40"
                >
                  <option value="">{clubSeleccionado ? '-- Elegir Categoría --' : '-- Primero elige un Club --'}</option>
                  {equiposDisponibles.map((equipo, idx) => (
                    <option key={idx} value={equipo}>{equipo}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={guardando || !clubSeleccionado || !equipoSeleccionado || ejerciciosSeleccionados.length === 0}
                className="w-full text-center py-2 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-30 tracking-wider uppercase"
              >
                {guardando ? 'Guardando...' : 'Registrar Sesión'}
              </button>
            </div>

            {/* DOBLE PANEL INTERACTIVO INFERIOR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
            {/* ASISTENCIA CON REFUERZOS EXTERNOS */}
              <div className="lg:col-span-1 bg-neutral-950 p-4 rounded-xl border border-neutral-800 h-[500px] flex flex-col">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2 mb-3 flex justify-between items-center">
                  <span>Plantel de Asistencia</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono">Total: {arquerosFiltrados.length}</span>
                </div>
                
                {clubSeleccionado && equipoSeleccionado && (
                
                  <div className="mb-3">
                    <select
                      onChange={(e) => {
                        const alumnoId = e.target.value
                        if (!alumnoId) return
                        
                        // Buscamos al arquero en la lista maestra
                        const invitado = todosLosAlumnosMaestro.find(a => a.id === alumnoId)
                        
                        // Si existe y no está ya metido en el plantel de hoy, lo inyectamos en caliente
                        if (invitado && !arquerosFiltrados.some(a => a.id === invitado.id)) {
                          // Lo marcamos temporalmente con una bandera para el diseño visual
                          const invitadoMarcado = { ...invitado, esInvitado: true }
                          setArquerosFiltrados([...arquerosFiltrados, invitadoMarcado])
                          setAsistencia(prev => ({ ...prev, [invitado.id]: true })) // Presente automático
                        }
                        e.target.value = "" // Resetear combo
                      }}
                      className="w-full text-[11px] rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-neutral-300 focus:border-emerald-500/50 focus:outline-none"
                    >
                      <option value="">➕ Convocar arquero de otro plantel...</option>
                      {todosLosAlumnosMaestro
                        // Filtramos para no mostrar en la lista a los que ya pertenecen a este equipo actual
                        .filter(a => !arquerosFiltrados.some(f => f.id === a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre_completo} ({a.club} - {a.categoria || 'Sin Cat.'})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                )}
                
                {!clubSeleccionado || !equipoSeleccionado ? (
                  <div className="text-neutral-600 text-xs text-center my-auto px-4 leading-relaxed">
                    Selecciona Club y Categoría en la barra superior para desplegar el plantel.
                  </div>
                ) : arquerosFiltrados.length === 0 ? (
                  <div className="text-neutral-500 text-xs text-center my-auto">
                    No hay jugadores cargados en esta división.
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {arquerosFiltrados.map((arq) => (
                      <div 
                        key={arq.id} 
                        onClick={() => toggleAsistencia(arq.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          asistencia[arq.id] 
                            ? arq.esInvitado 
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-neutral-200' // Estilo resaltado para el invitado presente
                              : 'bg-emerald-950/20 border-emerald-800/30 text-neutral-200' 
                            : 'bg-red-950/10 border-red-900/20 text-neutral-500 line-through'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-neutral-200 text-[13px]">{arq.nombre_completo}</p>
                            {arq.esInvitado && (
                              <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-extrabold px-1 rounded tracking-wide border border-emerald-500/30">INVITADO</span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500">{arq.club} — {arq.categoria} {arq.division || ''}</p>
                        </div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${asistencia[arq.id] ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/20 text-red-400'}`}>
                          {asistencia[arq.id] ? 'PRESENTE' : 'AUSENTE'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* PANEL DE EJERCICIOS Y FILTRO POR OBJETIVO TÁCTICO */}
              <div className="lg:col-span-2 bg-neutral-950 p-5 rounded-xl border border-neutral-800 h-[500px] flex flex-col justify-between">
                <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                  
                  {/* Selector de Dos Niveles Encadenado por Objetivo */}
                  <div className="border-b border-neutral-800 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* A. Selector del Objetivo Principal */}
                    <div className="sm:col-span-1">
                      <select
                        value={rubroFiltrado}
                        onChange={(e) => setRubroFiltrado(e.target.value)}
                        className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-emerald-400 font-medium focus:border-emerald-500/50 focus:outline-none"
                      >
                        <option value="">-- Todos los Objetivos --</option>
                        {Array.from(new Set(ejerciciosCatalogo.map(e => e.objetivos).filter(Boolean))).map((obj: any, idx) => (
                          <option key={idx} value={obj}>{obj}</option>
                        ))}
                      </select>
                    </div>

                    {/* B. Selector de Ejercicios Filtrado Automáticamente */}
                    <div className="sm:col-span-2">
                      <select
                        onChange={(e) => {
                          const ejercicioId = e.target.value
                          if (ejercicioId) {
                            const encontrado = ejerciciosCatalogo.find(ex => ex.id === ejercicioId)
                            if (encontrado) setEjercicioPrevisualizado(encontrado)
                          }
                          e.target.value = ""
                        }}
                        className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-emerald-500/50 focus:outline-none"
                      >
                        <option value="">-- Seleccionar Ejercicio Táctico --</option>
                        {ejerciciosCatalogo
                          .filter(ej => !rubroFiltrado || ej.objetivos === rubroFiltrado)
                          .map((ej) => (
                            <option key={ej.id} value={ej.id}>
                              [{ej.codigo}] {ej.nombre}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  {/* Estructura de la Sesión Scrolleable */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                    <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">📋 Estructura de la Sesión</div>
                    
                    {ejerciciosSeleccionados.length === 0 ? (
                      <div className="text-neutral-600 text-xs py-12 text-center bg-neutral-900 rounded-lg border border-neutral-800/40">
                        Tu rutina está vacía. Añade ejercicios arriba para ver su desarrollo y videos.
                      </div>
                    ) : (
                      ejerciciosSeleccionados.map((ej) => (
                        <div key={ej.id} className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl flex flex-col gap-2 text-xs">
                          <div className="space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-800 pb-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="bg-neutral-800 text-neutral-400 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]">[{ej.codigo}]</span>
                                <span className="font-bold text-neutral-200 text-sm">{ej.nombre}</span>
                              </div>
                              
                              <div className="flex items-center gap-3 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number" min={1} max={120} value={ej.duracion}
                                    onChange={(e) => cambiarDuracionEjercicio(ej.id, parseInt(e.target.value) || 0)}
                                    className="w-14 text-center rounded border border-neutral-800 bg-neutral-950 py-0.5 text-xs text-emerald-400 font-bold focus:outline-none"
                                  />
                                  <span className="text-neutral-400 text-[10px]">min</span>
                                </div>
                                <button
                                  type="button" onClick={() => quitarEjercicioDeRutina(ej.id)}
                                  className="text-neutral-500 hover:text-red-400 transition-colors font-medium text-[11px]"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-[11px] text-neutral-400">Foco Técnico: <span className="text-neutral-300">{ej.objetivos || ej.subrubro}</span></p>
                            
                            {ej.desarrollo && (
                              <div className="text-[11px] text-neutral-300 bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800/60 my-1.5 leading-relaxed whitespace-pre-wrap">
                                <span className="text-[10px] font-bold text-emerald-500/80 block uppercase tracking-wider mb-0.5">Desarrollo:</span>
                                {ej.desarrollo}
                              </div>
                            )}
                            
                            {ej.multimedia_url ? (
                              <a 
                                href={ej.multimedia_url} target="_blank" rel="noreferrer"
                                className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1 pt-0.5"
                              >
                                🔗 Ver Video Demostrativo
                              </a>
                            ) : (
                              <span className="text-[11px] text-neutral-600 block">Sin video</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </div>

            </div>

          </form>
        )}
      </div>

      {/* VENTANA EMERGENTE: MODAL DE PREVISUALIZACIÓN TÉCNICA */}
      {ejercicioPrevisualizado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl space-y-4">
            
            <div className="border-b border-neutral-800 pb-3 flex justify-between items-start">
              <div>
                <span className="bg-neutral-800 text-neutral-400 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]">[{ejercicioPrevisualizado.codigo}]</span>
                <h2 className="text-lg font-bold text-emerald-400 mt-1">{ejercicioPrevisualizado.nombre}</h2>
                <div className="flex flex-wrap items-center gap-3 text-neutral-400 text-xs mt-1">
                  <span>Clasificación: <span className="text-neutral-200">{ejercicioPrevisualizado.rubro}</span></span>
                  <span className="text-neutral-600">•</span>
                  <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 px-2 py-0.5 rounded font-medium text-[11px]">
                    👥 {arquerosFiltrados.length} {arquerosFiltrados.length === 1 ? 'Arquero asignado' : 'Arqueros asignados'}
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEjercicioPrevisualizado(null)}
                className="text-neutral-500 hover:text-neutral-200 font-bold text-sm px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto max-h-[300px] pr-1">
              <div>
                <span className="text-[10px] font-bold text-emerald-500 block uppercase tracking-wider mb-1">Desarrollo Técnico / Explicación:</span>
                <p className="text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-lg border border-neutral-800 whitespace-pre-wrap">
                  {ejercicioPrevisualizado.desarrollo || "No registra descripción técnica en la base de datos."}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-emerald-500 block uppercase tracking-wider mb-1">Enlace Multimedia Oficial:</span>
                {ejercicioPrevisualizado.multimedia_url ? (
                  <a 
                    href={ejercicioPrevisualizado.multimedia_url} target="_blank" rel="noreferrer"
                    className="text-emerald-400 hover:text-white bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 px-3 py-2.5 rounded-lg w-full transition-all flex items-center justify-between font-medium group"
                  >
                    <span className="flex items-center gap-2">🎬 Ver Video Demostrativo del Ejercicio</span>
                    <span className="text-neutral-500 group-hover:text-emerald-400 transition-colors text-[10px]">Abrir en pestaña nueva →</span>
                  </a>
                ) : (
                  <div className="text-neutral-600 bg-neutral-950/40 border border-neutral-900/60 p-3 rounded-lg italic">
                    Este ejercicio no registra un enlace de video cargado en el catálogo.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-neutral-800 pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setEjercicioPrevisualizado(null)}
                className="w-1/3 text-center py-2 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 rounded-lg text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const yaExiste = ejerciciosSeleccionados.some(e => e.id === ejercicioPrevisualizado.id)
                  if (!yaExiste) {
                    setEjerciciosSeleccionados([...ejerciciosSeleccionados, { ...ejercicioPrevisualizado, duracion: 15 }])
                  }
                  setEjercicioPrevisualizado(null)
                }}
                className="w-2/3 text-center py-2 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all tracking-wider uppercase"
              >
                Añadir a la Sesión
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
