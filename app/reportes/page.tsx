'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function CentroReportesPage() {
  const router = useRouter()

  // --- SOLAPA ACTIVA ---
  const [solapa, setSolapa] = useState<'tactico' | 'asistencia'>('tactico')

  // --- CATALOGOS DE BUSQUEDA FILTRADOS POR PERMISO ---
  const [clubesDisponibles, setClubesDisponibles] = useState<string[]>([])
  const [equiposDisponibles, setEquiposDisponibles] = useState<string[]>([])
  const [alumnosDisponibles, setAlumnosDisponibles] = useState<any[]>([])

  // --- FILTROS SELECCIONADOS POR EL ENTRENADOR ---
  const [filtroClub, setFiltroClub] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroAlumnoId, setFiltroAlumnoId] = useState('')

  // --- MATRICES DE DATOS RESULTANTES ---
  const [lineasHistorialTactico, setLineasHistorialTactico] = useState<any[]>([])
  const [totalizadoPorObjetivo, setTotalizadoPorObjetivo] = useState<{ [key: string]: number }>({})
  const [asistenciasConsolidadas, setAsistenciasConsolidadas] = useState<any[]>([])

  // --- CONTROLES DE CARGA ---
  const [cargandoBase, setCargandoBase] = useState(true)
  const [procesandoReporte, setProcesandoReporte] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. CARGA INICIAL: DESCARGAR UNICAMENTE LOS CLUBES PERMITIDOS PARA EL PROFESOR LOGUEADO
  useEffect(() => {
    async function inicializarReportes() {
      setCargandoBase(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setCargandoBase(false)
        return
      }

      const { data: misPermisos } = await supabase
        .from('entrenador_permisos')
        .select('club_asignado')
        .eq('user_id', session.user.id)

      if (misPermisos && misPermisos.length > 0) {
        const clubesPermitidos = Array.from(new Set(misPermisos.map(p => p.club_asignado).filter(Boolean))) as string[]
        setClubesDisponibles(clubesPermitidos)
      } else {
        setClubesDisponibles([])
      }
      setCargandoBase(false)
    }
    inicializarReportes()
  }, [supabase])

  // 2. EFECTO REACTIVO: CARGAR CATEGORIAS PERMITIDAS CUANDO SE ELIGE UN CLUB
  useEffect(() => {
    if (!filtroClub) {
      setEquiposDisponibles([])
      setFiltroCategoria('')
      return
    }

    async function cargarCategoriasPermitidas() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: misCategorias } = await supabase
        .from('entrenador_permisos')
        .select('categoria_asignada')
        .eq('user_id', session.user.id)
        .eq('club_asignado', filtroClub)

      if (misCategorias && misCategorias.length > 0) {
        const cats = Array.from(new Set(misCategorias.map(c => c.categoria_asignada).filter(Boolean))) as string[]
        setEquiposDisponibles(cats)
      } else {
        setEquiposDisponibles([])
      }
    }
    cargarCategoriasPermitidas()
  }, [filtroClub, supabase])

  // 3. EFECTO REACTIVO: CARGAR ALUMNOS DE ESTE CLUB Y CATEGORÍA
  useEffect(() => {
    if (!filtroClub || !filtroCategoria) {
      setAlumnosDisponibles([])
      setFiltroAlumnoId('')
      return
    }

    async function cargarAlumnos() {
      const { data } = await supabase
        .from('alumnos')
        .select('id, nombre_completo')
        .eq('club', filtroClub)
        .eq('categoria', filtroCategoria)
        .order('nombre_completo', { ascending: true })

      if (data) setAlumnosDisponibles(data)
    }
    cargarAlumnos()
  }, [filtroClub, filtroCategoria, supabase])
  // 4. ALGORITMO Y CONSULTAS CRUZADAS PARA GENERAR LOS REPORTES
  useEffect(() => {
    if (!filtroClub || !filtroCategoria) {
      setLineasHistorialTactico([])
      setTotalizadoPorObjetivo({})
      setAsistenciasConsolidadas([])
      return
    }

    async function ejecutarCalculoReporte() {
      setProcesandoReporte(true)
      
      try {
        // A. Traemos todos los entrenamientos de este club y categoría
        const { data: entros, error: err1 } = await supabase
          .from('entrenamientos')
          .select('id, fecha, objetivo_sesion')
          .eq('club', filtroClub)
          .eq('categoria', filtroCategoria)
          .order('fecha', { ascending: true })

        if (err1 || !entros || entros.length === 0) {
          setLineasHistorialTactico([])
          setTotalizadoPorObjetivo({})
          setAsistenciasConsolidadas([])
          setProcesandoReporte(false)
          return
        }

        const idsEntrenamientos = entros.map(e => e.id)

        // B. Traemos el cronograma de ejercicios asociados a esos entrenamientos
        const { data: rutinaEjercicios, error: err2 } = await supabase
          .from('entrenamiento_ejercicios')
          .select('entrenamiento_id, duracion_minutos, ejercicios(nombre, objetivos, subrubro)')
          .in('entrenamiento_id', idsEntrenamientos)

        // C. Traemos el control de asistencia de ese rango de sesiones
        const { data: controlAsistencia, error: err3 } = await supabase
          .from('asistencias')
          .select('entrenamiento_id, alumno_id, presente, alumnos(nombre_completo)')
          .in('entrenamiento_id', idsEntrenamientos)

        if (err2 || err3 || !rutinaEjercicios || !controlAsistencia) {
          setProcesandoReporte(false)
          return
        }

        // --- PROCESAMIENTO SOLAPA 1: CARGA TÁCTICA ---
        let lineasProcesadas: any[] = []
        let acumuladorObjetivos: { [key: string]: number } = {}

        // Filtramos las asistencias según si el usuario eligió un alumno específico o quiere ver todo el plantel
        const asistenciasFiltradasPorJugador = filtroAlumnoId
          ? controlAsistencia.filter(a => a.alumno_id === filtroAlumnoId)
          : controlAsistencia

        // Recorremos entrenamiento por entrenamiento para armar el desglose cronológico
        entros.forEach(entrenam => {
          // Buscamos si el jugador (o plantel) estuvo presente en esta fecha
          const alumnosPresentesEseDia = asistenciasFiltradasPorJugador.filter(
            a => a.entrenamiento_id === entrenam.id && a.presente
          )

   // Si el jugador elegido estuvo presente (o si hay alumnos presentes en el plantel), sumamos la carga táctica
          if (alumnosPresentesEseDia.length > 0) {
            const ejerciciosDeEstaFecha = rutinaEjercicios.filter(re => re.entrenamiento_id === entrenam.id)

            ejerciciosDeEstaFecha.forEach(ejer => {
              // CORREGIDO: Se usa un casteo a any para acceder de forma segura a las propiedades del objeto individual
              const datosEjercicio = ejer.ejercicios as any
              const nombreEj = datosEjercicio?.nombre || 'Ejercicio sin nombre'
              const objetivoEj = datosEjercicio?.objetivos || datosEjercicio?.subrubro || 'General / No especificado'
              const minutos = ejer.duracion_minutos || 0

              // Insertamos el detalle de la fecha individual
              lineasProcesadas.push({
                fecha: entrenam.fecha,
                ejercicio: nombreEj,
                objetivo: objetivoEj,
                minutos: minutos,
                // CORREGIDO: Casteo a any para asegurar que lea 'nombre_completo' sin interpretar que es un array
                alumnos: alumnosPresentesEseDia.map(a => (a.alumnos as any)?.nombre_completo).filter(Boolean).join(', ')
              })

              // Acumulamos los totales agrupados por objetivo
              acumuladorObjetivos[objetivoEj] = (acumuladorObjetivos[objetivoEj] || 0) + minutos
            })
          }
        })

        setLineasHistorialTactico(lineasProcesadas)
        setTotalizadoPorObjetivo(acumuladorObjetivos)

        // --- PROCESAMIENTO SOLAPA 2: ASISTENCIA CONSOLIDADA ---
        // Extraemos la lista única de alumnos que registran asistencia en este club/categoría
        const listaIdsAlumnos = Array.from(new Set(controlAsistencia.map(a => a.alumno_id)))
        
        const resumenAsistencia = listaIdsAlumnos.map(alId => {
          const registrosDelAlumno = controlAsistencia.filter(a => a.alumno_id === alId)
          // CORREGIDO: Se aplica el casteo a any en el primer elemento del array para extraer 'nombre_completo'
          const nombreCom = (registrosDelAlumno[0]?.alumnos as any)?.nombre_completo || 'Arquero Desconocido'
          
          const totales = registrosDelAlumno.length
          const presentes = registrosDelAlumno.filter(a => a.presente).length
          const ausentes = totales - presentes
          const porcentaje = totales > 0 ? Math.round((presentes / totales) * 100) : 0

          return {
            id: alId,
            nombre: nombreCom,
            totales,
            presentes,
            ausentes,
            porcentaje
          }
        }).sort((a,b) => b.porcentaje - a.porcentaje) // Ordenamos de mayor a menor presentismo

        setAsistenciasConsolidadas(resumenAsistencia)

      } catch (err) {
        console.error('Error crítico al procesar matrices de estadísticas:', err)
      } finally {
        setProcesandoReporte(false)
      }
    }

    ejecutarCalculoReporte()
  }, [filtroClub, filtroCategoria, filtroAlumnoId, supabase])
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl space-y-6">
        
        {/* Encabezado Principal */}
        <div className="border-b border-neutral-800 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Centro de Cómputos — Reportes Inteligentes y Carga de Trabajo</p>
          </div>
          <button 
            type="button"
            onClick={() => router.push('/')} 
            className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors bg-neutral-950"
          >
            ← Volver al Menú
          </button>
        </div>

        {/* BARRA DE FILTROS SUPERIOR EN UNA SOLA LÍNEA HORIZONTAL */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Club Disponible</label>
            <select 
              value={filtroClub} onChange={(e) => setFiltroClub(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="">-- Seleccionar Club --</option>
              {clubesDisponibles.map((club, idx) => (
                <option key={idx} value={club}>{club}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Categoría / División</label>
            <select 
              value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
              disabled={!filtroClub}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none disabled:opacity-30"
            >
              <option value="">-- Seleccionar Categoría --</option>
              {equiposDisponibles.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 uppercase block mb-1 font-semibold tracking-wider">Foco Alumno (Opcional)</label>
            <select 
              value={filtroAlumnoId} onChange={(e) => setFiltroAlumnoId(e.target.value)}
              disabled={!filtroCategoria}
              className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-neutral-100 focus:border-emerald-500/50 focus:outline-none disabled:opacity-30"
            >
              <option value="">-- Todos los Arqueros (Plantel) --</option>
              {alumnosDisponibles.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre_completo}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!filtroClub && !filtroCategoria && !filtroAlumnoId}
            onClick={() => { setFiltroClub(''); setFiltroCategoria(''); setFiltroAlumnoId('') }}
            className="w-full text-center py-2 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 rounded-lg text-xs font-bold transition-all disabled:opacity-30 tracking-wider uppercase"
          >
            Limpiar Monitor
          </button>
        </div>

        {/* CONTROLADOR DE PESTAÑAS (SOLAPAS) */}
        <div className="flex border-b border-neutral-800 gap-2">
          <button
            type="button"
            onClick={() => setSolapa('tactico')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 uppercase tracking-wide ${
              solapa === 'tactico' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/10' 
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ⏱️ Carga Táctica por Objetivo
          </button>
          <button
            type="button"
            onClick={() => setSolapa('asistencia')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 uppercase tracking-wide ${
              solapa === 'asistencia' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/10' 
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ✅ Asistencia Consolidada
          </button>
        </div>
        {/* DESPLEGABLE DINÁMICO DE DATOS SEGÚN SOLAPA SELECCIONADA */}
        {!filtroClub || !filtroCategoria ? (
          <div className="bg-neutral-950 p-12 rounded-xl border border-neutral-800 text-center text-neutral-500 text-xs">
            <span className="text-3xl block mb-2">📊</span>
            Por favor, selecciona un Club y una Categoría en la barra superior para procesar las estadísticas del servidor.
          </div>
        ) : procesandoReporte ? (
          <div className="bg-neutral-950 p-12 rounded-xl border border-neutral-800 text-center text-neutral-500 text-xs">
            Procesando algoritmos y calculando minutos en tiempo real...
          </div>
        ) : solapa === 'tactico' ? (
          /* =========================================================================
             SOLAPA 1: REPORTE DE CARGA TÁCTICA POR OBJETIVOS Y MINUTOS
             ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMNA IZQUIERDA: ACUMULADOS TOTALIZADOS POR OBJETIVO */}
            <div className="lg:col-span-1 bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-3 h-[450px] overflow-y-auto">
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2 mb-1">
                ⏱️ Acumulado por Objetivo
              </div>
              
              {Object.keys(totalizadoPorObjetivo).length === 0 ? (
                <div className="text-neutral-600 text-xs italic py-6">No se registran minutos asignados a objetivos.</div>
              ) : (
                Object.entries(totalizadoPorObjetivo).map(([objetivoKey, minutosTotal], idx) => (
                  <div key={idx} className="bg-neutral-900 border border-neutral-800/80 p-3 rounded-lg flex justify-between items-center text-xs">
                    <span className="text-neutral-200 font-bold max-w-[180px] truncate" title={objetivoKey}>
                      🎯 {objetivoKey}
                    </span>
                    <span className="text-emerald-400 font-extrabold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded text-[11px] shrink-0 font-mono">
                      {minutosTotal} min
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* COLUMNA DERECHA: DESGLOSE DETALLADO CRONOLÓGICO */}
            <div className="lg:col-span-2 bg-neutral-950 p-5 rounded-xl border border-neutral-800 h-[450px] overflow-y-auto flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 w-24">Fecha</th>
                      <th className="pb-3 w-40">Objetivo Técnico</th>
                      <th className="pb-3">Ejercicio Táctico</th>
                      <th className="pb-3 text-right w-16">Minutos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {lineasHistorialTactico.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-neutral-600 italic">
                          No se encontraron entrenamientos ejecutados para este criterio.
                        </td>
                      </tr>
                    ) : (
                      lineasHistorialTactico.map((linea, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/40 transition-colors text-[11px]">
                          <td className="py-2.5 font-mono text-neutral-400">{linea.fecha}</td>
                          <td className="py-2.5 font-bold text-emerald-400">{linea.objetivo}</td>
                          <td className="py-2.5 text-neutral-200 font-medium">
                            {linea.ejercicio}
                            <span className="block text-[9px] text-neutral-500 font-normal truncate max-w-xs mt-0.5" title={linea.alumnos}>
                              🏃‍♂️ {linea.alumnos}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-neutral-100 font-mono">{linea.minutos}m</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          /* =========================================================================
             SOLAPA 2: REPORTE DE ASISTENCIA CONSOLIDADA Y RANKING
             ========================================================================= */
          <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 overflow-hidden">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2 mb-3">
              📊 Rendimiento de Asistencia del Plantel
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Nombre del Arquero</th>
                    <th className="pb-3 text-center w-24">Totales</th>
                    <th className="pb-3 text-center w-24 text-emerald-400">Presentes</th>
                    <th className="pb-3 text-center w-24 text-red-400">Ausentes</th>
                    <th className="pb-3 text-right w-32">Presentismo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {asistenciasConsolidadas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-600 italic">
                        No se registran datos de asistencia cargados en esta división.
                      </td>
                    </tr>
                  ) : (
                    asistenciasConsolidadas.map((alum) => (
                      <tr key={alum.id} className="hover:bg-neutral-900/40 transition-colors text-[12px]">
                        <td className="py-3 font-bold text-neutral-200">{alum.nombre}</td>
                        <td className="py-3 text-center font-medium font-mono text-neutral-400">{alum.totales}</td>
                        <td className="py-3 text-center font-bold font-mono text-emerald-400 bg-emerald-950/10">{alum.presentes}</td>
                        <td className="py-3 text-center font-bold font-mono text-red-400 bg-red-950/10">{alum.ausentes}</td>
                        <td className="py-3 text-right">
                          <span className={`font-extrabold font-mono text-[13px] px-2 py-0.5 rounded ${
                            alum.porcentaje >= 80 
                              ? 'text-emerald-400 bg-emerald-950/30' 
                              : alum.porcentaje >= 50 
                                ? 'text-yellow-400 bg-yellow-950/20' 
                                : 'text-red-400 bg-red-950/30'
                          }`}>
                            {alum.porcentaje}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

