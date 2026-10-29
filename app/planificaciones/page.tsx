'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function PlanificacionesPage() {
  const router = useRouter()

  // --- CATALOGOS DE BUSQUEDA FILTRADOS POR PERMISO ---
  const [clubesDisponibles, setClubesDisponibles] = useState<string[]>([])
  const [equiposDisponibles, setEquiposDisponibles] = useState<string[]>([])
  const [arquerosFiltrados, setArquerosFiltrados] = useState<any[]>([])
  const [ejerciciosCatalogo, setEjerciciosCatalogo] = useState<any[]>([])

  // --- FILTROS SELECCIONADOS ---
  const [clubSeleccionado, setClubSeleccionado] = useState('')
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('')
  const [numeroEntrenamiento, setNumeroEntrenamiento] = useState('1')
  
  // --- OBJETIVOS INTERNOS FILTRADOS ---
  const [filtroObjetivo, setFiltroObjetivo] = useState('')
  const [objetivosUnicos, setObjetivosUnicos] = useState<string[]>([])

  // --- FORMULARIO DE RAMPAS, RUTINAS Y ASISTENCIA ---
  const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState<any[]>([])
  const [asistencia, setAsistencia] = useState<{ [key: string]: boolean }>({})
  const [objetivoSesion, setObjetivoSesion] = useState('')
  const [observacionesGlobales, setObservacionesGlobales] = useState('')

  // --- CONTROLES DE PANTALLA ---
  const [cargandoBase, setCargandoBase] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: true, autoRefreshToken: true }
    }
  )

  const [todosLosAlumnosMaestro, setTodosLosAlumnosMaestro] = useState<any[]>([])
  // 1. CARGA INICIAL: FILTRAR CLUBES POR PERMISO DEL PROFESOR LOGUEADO
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
        .select('id, codigo, nombre, rubro, multimedia_url, desarrollo, objetivos, subrubro')
        .order('nombre', { ascending: true })

      if (dataEjercicios) {
        setEjerciciosCatalogo(dataEjercicios)
        const objs = Array.from(new Set(dataEjercicios.map(e => e.objetivos || e.subrubro).filter(Boolean))) as string[]
        setObjetivosUnicos(objs)
      }

      // B. Descargamos la lista maestra de alumnos
      const { data: dataTodosAlumnos } = await supabase
        .from('alumnos')
        .select('id, nombre_completo, categoria, division, club')
        .order('nombre_completo', { ascending: true })

      if (dataTodosAlumnos) setTodosLosAlumnosMaestro(dataTodosAlumnos)

      // C. Filtramos los Clubes por permisos
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
        .select('id, nombre_completo, categoria, division, club')
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
  // 4. AUTOMATIZACIÓN: CALCULAR EL PRÓXIMO NÚMERO DE ENTRENAMIENTO CORRELATIVO
  useEffect(() => {
    if (!clubSeleccionado || !equipoSeleccionado) return

    async function buscarUltimoNumero() {
      const { data } = await supabase
        .from('entrenamientos')
        .select('numero_entrenamiento')
        .eq('club', clubSeleccionado)
        .eq('categoria', equipoSeleccionado)
        .order('numero_entrenamiento', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        // CORREGIDO: Acceso seguro mediante casting para evitar error TS2339 en arrays de Supabase
        const ultimoNumero = (data as any)[0]?.numero_entrenamiento || 0
        const siguienteNumero = parseInt(ultimoNumero.toString()) + 1
        setNumeroEntrenamiento(siguienteNumero.toString())
      } else {
        setNumeroEntrenamiento('1')
      }
    }
    buscarUltimoNumero()
  }, [clubSeleccionado, equipoSeleccionado, supabase])

  // Lógicas interactivas de manipulación de la grilla y el visor local
  const toggleAsistencia = (id: string) => {
    setAsistencia(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const agregarEjercicioRutina = (ej: any) => {
    const yaExiste = ejerciciosSeleccionados.some(item => item.id === ej.id)
    if (yaExiste) {
      alert('Este ejercicio ya se encuentra cargado en el visor actual.')
      return
    }
    setEjerciciosSeleccionados([...ejerciciosSeleccionados, { ...ej, duracion: '15' }])
  }

  const cambiarDuracionEjercicio = (id: string, mins: string) => {
    setEjerciciosSeleccionados(prev => prev.map(item => item.id === id ? { ...item, duracion: mins } : item))
  }

  const quitarEjercicioRutina = (id: string) => {
    setEjerciciosSeleccionados(prev => prev.filter(item => item.id !== id))
  }
  // 5. FUNCIÓN DE GUARDADO COMPLETO RE-ALINEADO CON SINTAXIS REMOTA
  const handleGuardarTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubSeleccionado || !equipoSeleccionado) {
      alert('Por favor, selecciona Club y Categoría antes de guardar.')
      return
    }
    setGuardando(true)

    try {
      const target = e.target as any
      const rawFecha = target.fecha?.value || new Date().toISOString().split('T')[0]
      const stringObjetivo = target.objetivo?.value || target.objetivo_sesion?.value || objetivoSesion || 'General táctico'
      const stringObs = observacionesGlobales || ''

      const { data: insertoPlanifExito, error: errorInyeccionTablaEntrenamientos } = await supabase
        .from('entrenamientos')
        .insert([
          {
            fecha: rawFecha,
            club: clubSeleccionado,
            categoria: equipoSeleccionado,
            division: equipoSeleccionado,
            objetivo_sesion: stringObjetivo.trim(),
            numero_entrenamiento: parseInt(numeroEntrenamiento) || 1,
            observaciones: stringObs.trim()
          }
        ])
        .select()

      if (errorInyeccionTablaEntrenamientos) throw errorInyeccionTablaEntrenamientos
      if (!insertoPlanifExito || insertoPlanifExito.length === 0) throw new Error('No se pudo recuperar la fila generada')

      // CORREGIDO: Se extrae el id desde el primer objeto obtenido de Supabase mediante casting seguro (evita error TS2339 en Vercel)
      const nuevoEntrenamientoId = (insertoPlanifExito as any)[0]?.id || (insertoPlanifExito as any)?.id

      if (ejerciciosSeleccionados.length > 0) {
        const filasEjercicios = ejerciciosSeleccionados.map((ej, idx) => ({
          entrenamiento_id: nuevoEntrenamientoId,
          ejercicio_id: ej.id,
          duracion_minutos: parseInt(ej.duracion) || 15,
          orden: idx + 1
        }))
        const { error: errEjercicios } = await supabase.from('entrenamiento_ejercicios').insert(filasEjercicios)
        if (errEjercicios) throw errEjercicios
      }

      if (arquerosFiltrados.length > 0) {
        const filasAsistencia = arquerosFiltrados.map((arq) => ({
          entrenamiento_id: nuevoEntrenamientoId,
          alumno_id: arq.id,
          presente: asistencia[arq.id] ?? false
        }))
        const { error: errAsistencia } = await supabase.from('asistencias').insert(filasAsistencia)
        if (errAsistencia) throw errAsistencia
      }

      alert('¡Planificación del Entrenamiento guardada de forma exitosa en Supabase! 🚀🔥')
      setEjerciciosSeleccionados([])
      setObjetivoSesion('')
      setObservacionesGlobales('')
      setClubSeleccionado('')
      setEquipoSeleccionado('')

    } catch (err: any) {
      console.error('Error descriptivo en la planificación:', err)
      alert(`No se pudo guardar: ${err?.message || 'Error de sincronización con Supabase'}`)
    } finally {
      setGuardando(false)
    }
  }

  const ejerciciosFiltradosCatalogo = filtroObjetivo
    ? ejerciciosCatalogo.filter(e => e.objetivos === filtroObjetivo || e.subrubro === filtroObjetivo)
    : ejerciciosCatalogo
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 font-sans">
      <form onSubmit={handleGuardarTodo} className="max-w-7xl mx-auto space-y-4">
        
        {/* Encabezado */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center shadow-lg shrink-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-xs mt-0.5">Planificador Multiusuario — Armado de Sesiones con Filtros por Permisos</p>
          </div>
          <button 
            type="button" onClick={() => router.push('/')} 
            className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors bg-neutral-950 cursor-pointer"
          >
            ← Volver al Menú
          </button>
        </div>

        {/* BARRA SUPERIOR: CONFIGURACIÓN MÁSTER DEL ENTRENAMIENTO */}
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end shadow-md shrink-0">
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Fecha Práctica</label>
            <input 
              type="date" name="fecha" required defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Club Permitido</label>
            <select 
              value={clubSeleccionado} onChange={(e) => setClubSeleccionado(e.target.value)} required
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="">-- Elegir Club --</option>
              {clubesDisponibles.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Categoría Asignada</label>
            <select 
              value={equipoSeleccionado} onChange={(e) => setEquipoSeleccionado(e.target.value)} required disabled={!clubSeleccionado}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50 disabled:opacity-30 cursor-pointer"
            >
              <option value="">-- Elegir Categoría --</option>
              {equiposDisponibles.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">N° Entrenamiento (Auto)</label>
            <input 
              type="number" value={numeroEntrenamiento} onChange={(e) => setNumeroEntrenamiento(e.target.value)} required
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* CUERPO CENTRAL DE REPARTO: TRES PANELES VERTICALES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          
          {/* PANEL 1: CATÁLOGO MAESTRO DE EJERCICIOS */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 h-[550px] flex flex-col overflow-hidden shadow-xl">
            <div className="space-y-2 mb-3 shrink-0">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">📚 Catálogo de Ejercicios Técnicos</div>
              
              <select
                value={filtroObjetivo} onChange={(e) => setFiltroObjetivo(e.target.value)}
                className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-1.5 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value="">🎯 Ver Todos los Objetivos Técnicos</option>
                {objetivosUnicos.map((obj, idx) => <option key={idx} value={obj}>{obj}</option>)}
              </select>
            </div>

            {cargandoBase ? (
              <div className="text-xs text-neutral-500 text-center py-12 flex-1">Sincronizando biblioteca de videos...</div>
            ) : ejerciciosFiltradosCatalogo.length === 0 ? (
              <div className="text-xs text-neutral-600 italic text-center py-12 flex-1">No hay ejercicios para este filtro.</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {ejerciciosFiltradosCatalogo.map((ej) => (
                  <div key={ej.id} className="bg-neutral-950 border border-neutral-800/60 p-3 rounded-xl flex flex-col justify-between items-start gap-2.5 hover:border-neutral-700 transition-all">
                    <div className="w-full space-y-2">
                      <div className="flex items-center gap-2 border-b border-neutral-900 pb-1.5 w-full">
                        <span className="bg-neutral-900 border border-neutral-800 text-neutral-500 font-mono text-[8px] font-bold px-1 py-0.2 rounded">[{ej.codigo || 'KEE'}]</span>
                        <h3 className="font-bold text-[11px] text-neutral-300 truncate flex-1" title={ej.nombre}>{ej.nombre}</h3>
                        
                        {ej.multimedia_url && (
                          <a 
                            href={ej.multimedia_url} target="_blank" rel="noopener noreferrer"
                            className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded hover:bg-emerald-500 hover:text-white transition-all font-bold font-mono uppercase tracking-wider"
                          >
                            ▶ Video
                          </a>
                        )}
                      </div>
                      
                      <p className="text-[9px] text-neutral-500">Objetivo: <span className="text-emerald-400/90 font-semibold">{ej.objetivos || ej.subrubro || 'General'}</span></p>
                      
                      {ej.desarrollo && (
                        <div className="text-xs text-neutral-300 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800/40 text-left font-medium leading-relaxed select-text">
                          <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Análisis Técnico:</div>
                          <span className="italic">{ej.desarrollo}</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="button" onClick={() => agregarEjercicioRutina(ej)}
                      className="w-full text-center py-1 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 hover:text-emerald-400 text-neutral-400 text-[11px] font-bold rounded-lg transition-all cursor-pointer mt-0.5"
                    >
                      + Añadir al Visor
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* PANEL 2: VISOR INTERACTIVO DE LA RUTINA DEL DÍA */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 h-[550px] flex flex-col overflow-hidden shadow-xl">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2 mb-3 shrink-0">
              📋 Rutina y Bloques del Entrenamiento ({ejerciciosSeleccionados.length})
            </div>

            {ejerciciosSeleccionados.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 text-xs italic gap-1.5 p-6">
                <span>📋</span>
                El visor de rutina se encuentra vacío. Añade bloques tácticos desde el catálogo de la izquierda.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {ejerciciosSeleccionados.map((ej, index) => (
                  <div key={ej.id} className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 truncate flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] text-neutral-500 font-mono">#{index + 1}</span>
                        <span className="font-bold text-neutral-200 truncate">{ej.nombre}</span>
                      </div>
                      <p className="text-[9px] text-neutral-500 truncate">Foco: <span className="text-neutral-400 font-medium">{ej.objetivos || ej.subrubro}</span></p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={1} max={120} 
                          value={ej.duracion}
                          onChange={(e) => cambiarDuracionEjercicio(ej.id, e.target.value)}
                          className="w-10 text-center rounded border border-neutral-800 bg-neutral-900 py-0.5 text-xs font-bold text-emerald-400"
                        />
                        <span className="text-neutral-500 text-[10px]">min</span>
                      </div>
                      <button
                        type="button" onClick={() => quitarEjercicioRutina(ej.id)}
                        className="text-red-400/80 hover:text-red-400 text-xs font-bold px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PANEL 3: ASISTENCIA OFICIAL DEL PLANTEL */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 h-[550px] flex flex-col overflow-hidden shadow-xl">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2 mb-3 shrink-0">
              👥 Asistencia diaria de los Arqueros ({arquerosFiltrados.length})
            </div>

            {!clubSeleccionado || !equipoSeleccionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 text-xs italic gap-1.5 p-6">
                <span>👥</span>
                Selecciona un Club y Categoría arriba para descargar el listado oficial de arqueros.
              </div>
            ) : arquerosFiltrados.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-neutral-600 text-xs italic text-center p-6">
                No se registran alumnos dados de alta en este plantel.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {arquerosFiltrados.map((arq) => (
                    <div 
                      key={arq.id} 
                      onClick={() => toggleAsistencia(arq.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        asistencia[arq.id] 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-sm' 
                          : 'bg-red-950/20 border-red-900/40 text-red-400 opacity-60'
                      }`}
                    >
                      <span className="font-bold truncate max-w-[170px]">{arq.nombre_completo}</span>
                      <span className={`font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                        asistencia[arq.id]
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/40'
                          : 'bg-red-950 text-red-400 border-red-900/40'
                      }`}>
                        {asistencia[arq.id] ? 'Presente' : 'Ausente'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Campos de texto complementarios antes de guardar */}
                <div className="border-t border-neutral-800/60 pt-3 mt-3 space-y-3 bg-neutral-900 shrink-0">
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold">Foco General (Objetivo de la Sesión)</label>
                    <input
                      type="text" name="objetivo" required
                      value={objetivoSesion} onChange={(e) => setObjetivoSesion(e.target.value)}
                      placeholder="Ej: Blocaje bajo y transiciones rápidas"
                      className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold">Observaciones Globales del Día</label>
                    <textarea
                      rows={2} value={observacionesGlobales} onChange={(e) => setObservacionesGlobales(e.target.value)}
                      placeholder="Comentarios sobre el rendimiento del plantel..."
                      className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-200 focus:outline-none focus:border-emerald-500/50 resize-none"
                    />
                  </div>
                  <button
                    type="submit" disabled={guardando}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white disabled:text-neutral-500 font-bold rounded-xl text-xs transition-colors shadow-lg uppercase tracking-wider cursor-pointer"
                  >
                    {guardando ? 'Sincronizando con Supabase...' : '💾 Guardar Planificación Oficial'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </form>
    </div>
  )
}
