'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient'; 

export default function PlanificacionKeeper() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState(false);

  // EFECTO DE SEGURIDAD: Verificar sesión activa antes de cargar el resto de la pantalla
  useEffect(() => {
    const chequearSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setAutenticado(true);
      }
    };
    chequearSesion();
  }, [router]);

  // Datos principales de la sesión
  const [entrenamiento, setEntrenamiento] = useState({
    numero: '',
    club: '',
    categoria: '',
    division: '',
    objetivo: '',
    observaciones: ''
  });

  // Listas de datos maestros que vienen de Supabase
  const [clubesDB, setClubesDB] = useState<any[]>([]);
  const [categoriasDB, setCategoriasDB] = useState<any[]>([]);
  const [ejerciciosCatalogo, setEjerciciosCatalogo] = useState<any[]>([]);
  
  // Lista de alumnos que asisten y ejercicios elegidos en la rutina
  const [listaAlumnos, setListaAlumnos] = useState<any[]>([]);
  const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState<any[]>([]);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // EFECTO 1: Descargar catálogos iniciales al abrir la pantalla
  useEffect(() => {
    const descargarCatalogosBase = async () => {
      const { data: ejs } = await supabase.from('ejercicios').select('id, codigo, nombre, desarrollo, multimedia_url').order('codigo', { ascending: true });
      const { data: clubs } = await supabase.from('clubes').select('*').order('nombre', { ascending: true });
      const { data: cats } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });

      if (ejs) setEjerciciosCatalogo(ejs);
      if (clubs) setClubesDB(clubs);
      if (cats) setCategoriasDB(cats);
    };
    descargarCatalogosBase();
  }, []);

  // EFECTO 2: Enlazar alumnos automáticamente al cambiar los selectores superiores
  useEffect(() => {
    const buscarPlantelReal = async () => {
      if (entrenamiento.club && entrenamiento.categoria && entrenamiento.division) {
        const { data, error } = await supabase
          .from('alumnos')
          .select('id, nombre_completo')
          .eq('club', entrenamiento.club)
          .eq('categoria', entrenamiento.categoria)
          .eq('division', entrenamiento.division.trim().toUpperCase())
          .eq('estado', 'Activo');

        if (!error && data && data.length > 0) {
          setListaAlumnos(data.map(j => ({ id: j.id, nombre: j.nombre_completo, presente: true })));
        } else {
          setListaAlumnos([
            { id: 'mock-1', nombre: 'Arquero de Prueba 1 (Simulado)', presente: true },
            { id: 'mock-2', nombre: 'Arquero de Prueba 2 (Simulado)', presente: true }
          ]);
        }
      } else {
        setListaAlumnos([]);
      }
    };
    buscarPlantelReal();
  }, [entrenamiento.club, entrenamiento.categoria, entrenamiento.division]);

  // Manejador genérico para inputs, textareas y selectores
  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEntrenamiento({ ...entrenamiento, [e.target.name]: e.target.value });
  };
  
  // Funciones para manipular la rutina interactiva
  const agregarEjercicio = (id: string) => {
    const ej = ejerciciosCatalogo.find(e => e.id === id);
    if (ej && !ejerciciosSeleccionados.some(e => e.id === id)) {
      setEjerciciosSeleccionados([...ejerciciosSeleccionados, { ...ej, duracion: 15 }]);
    }
  };

  const removerEjercicio = (id: string) => {
    setEjerciciosSeleccionados(ejerciciosSeleccionados.filter(e => e.id !== id));
  };

  const handleDuracionChange = (id: string, minutos: number) => {
    setEjerciciosSeleccionados(ejerciciosSeleccionados.map(e => e.id === id ? { ...e, duracion: minutos } : e));
  };

  const toggleAsistencia = (id: string) => {
    setListaAlumnos(listaAlumnos.map(a => a.id === id ? { ...a, presente: !a.presente } : a));
  };

  // Si todavía está verificando el estado Auth de Supabase, frena la carga del HTML
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-xs text-neutral-500">
        Verificando credenciales de acceso...
      </div>
    );
  }

  // ENVÍO MASIVO MULTITABLA A SUPABASE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ejerciciosSeleccionados.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar al menos un ejercicio.' });
      return;
    }
    setCargando(true); setMensaje({ tipo: '', texto: '' });

    try {
      // A. Guardar cabecera del entrenamiento
      const { data: nuevoEntreno, error: errorEntreno } = await supabase
        .from('entrenamientos')
        .insert([{
          numero_entrenamiento: parseInt(entrenamiento.numero),
          club: entrenamiento.club,
          categoria: entrenamiento.categoria,
          division: entrenamiento.division.trim().toUpperCase(),
          objetivo_sesion: entrenamiento.objetivo.trim(),
          observaciones: entrenamiento.observaciones.trim()
        }]).select().single();

      if (errorEntreno) throw errorEntreno;

      // B. Guardar cronograma en la tabla intermedia
      const filasEjercicios = ejerciciosSeleccionados.map((ej, idx) => ({
        entrenamiento_id: nuevoEntreno.id,
        ejercicio_id: ej.id,
        orden: idx + 1,
        duracion_minutos: parseInt(ej.duracion) || 0
      }));
      const { error: errorEjercicios } = await supabase.from('entrenamiento_ejercicios').insert(filasEjercicios);
      if (errorEjercicios) throw errorEjercicios;

      // C. Guardar la planilla de asistencia diario
      if (listaAlumnos.length > 0) {
        const filasAsistencia = listaAlumnos.map(al => ({
          entrenamiento_id: nuevoEntreno.id,
          alumno_id: al.id,
          presente: al.presente
        }));
        const { error: errorAsistencia } = await supabase.from('asistencias').insert(filasAsistencia);
        if (errorAsistencia) throw errorAsistencia;
      }

      setMensaje({ tipo: 'exito', texto: '¡Entrenamiento y asistencia grabados exitosamente en la nube! 🚀' });
      setEntrenamiento({ numero: '', club: '', categoria: '', division: '', objetivo: '', observaciones: '' });
      setEjerciciosSeleccionados([]); setListaAlumnos([]);

    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: 'error', texto: `Error: ${error.message || 'Verifique duplicados.'}` });
    } finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="border-b border-neutral-800 pb-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Planificación y Asistencia de Plantel</p>
          </div>
          <a href="/" className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
            ← Volver al Menú
          </a>
        </div>

        {/* Mensaje de Alerta */}
        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-semibold border ${
            mensaje.tipo === 'exito' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' : 'bg-red-950/40 text-red-400 border-red-800/60'
          }`}>{mensaje.texto}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* BLOQUE DE FILTROS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-neutral-950 p-6 rounded-xl border border-neutral-800">
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Entrenamiento Nº</label>
              <input type="number" name="numero" required value={entrenamiento.numero} onChange={handleHeaderChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none" />
            </div>
            
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Club</label>
              <select name="club" required value={entrenamiento.club} onChange={handleHeaderChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-300 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar Club...</option>
                {clubesDB.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-2">Categoría</label>
              <select name="categoria" required value={entrenamiento.categoria} onChange={handleHeaderChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-300 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar...</option>
                {categoriasDB.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-2">División</label>
              <input type="text" name="division" required placeholder="Ej: A, B, UNICA" value={entrenamiento.division} onChange={handleHeaderChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          {/* OBJETIVOS Y OBSERVACIONES */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Objetivos de la Sesión</label>
              <textarea name="objetivo" required value={entrenamiento.objetivo} onChange={handleHeaderChange} rows={2} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500" placeholder="Escribí los objetivos principales..." />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Observaciones Generales</label>
              <textarea name="observaciones" value={entrenamiento.observaciones} onChange={handleHeaderChange} rows={2} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500" placeholder="Notas sobre el clima, la cancha o novedades..." />
            </div>
          </div>
          {/* CUERPO DEL ARMADO: CATÁLOGO IZQUIERDA Y RUTINA DERECHA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PANEL IZQUIERDO: CATÁLOGO DE EJERCICIOS */}
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex flex-col">
              <h3 className="text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
                Catálogo de Ejercicios ({ejerciciosCatalogo.length})
              </h3>
              
              <div className="max-h-[450px] overflow-y-auto pr-1 space-y-2">
                {ejerciciosCatalogo.map((ej) => (
                  <div 
                    key={ej.id} 
                    onClick={() => agregarEjercicio(ej.id)}
                    className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-emerald-500 cursor-pointer transition-colors text-xs flex justify-between items-center group"
                  >
                    <span className="text-neutral-300 group-hover:text-emerald-400 transition-colors">
                      <strong className="text-neutral-500 font-medium mr-1">[{ej.codigo}]</strong> {ej.nombre}
                    </span>
                    <span className="text-emerald-400 font-bold text-base px-1">+</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PANEL DERECHO: RUTINA SELECCIONADA */}
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex flex-col">
              <h3 className="text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
                Rutina del Entrenamiento ({ejerciciosSeleccionados.length})
              </h3>

              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {ejerciciosSeleccionados.length === 0 ? (
                  <div className="text-neutral-500 text-xs py-8 text-center">Seleccioná ejercicios de la lista izquierda.</div>
                ) : (
                  ejerciciosSeleccionados.map((ej, index) => (
                    <div key={ej.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg mb-2 text-xs flex flex-col gap-2">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-neutral-200">
                          <strong className="text-emerald-400 mr-1">{index + 1}.</strong> {ej.nombre}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <input 
                            type="number" 
                            value={ej.duracion} 
                            min="1" 
                            onChange={(e) => handleDuracionChange(ej.id, parseInt(e.target.value) || 0)} 
                            className="w-10 bg-neutral-950 border border-neutral-800 rounded text-center text-emerald-400 py-0.5 text-xs focus:outline-none" 
                          />
                          <span className="text-neutral-500 text-[10px] mr-1">min</span>
                          <button type="button" onClick={() => removerEjercicio(ej.id)} className="text-neutral-500 hover:text-red-400 p-1">✕</button>
                        </div>
                      </div>

                      {(ej.desarrollo || ej.multimedia_url) && (
                        <div className="bg-neutral-950/70 border border-neutral-800/40 p-2.5 rounded text-neutral-400 leading-relaxed whitespace-pre-line text-[11px] flex flex-col gap-2">
                          {ej.desarrollo && (
                            <div>
                              <span className="text-neutral-600 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Desarrollo:</span>
                              {ej.desarrollo}
                            </div>
                          )}

                          {ej.multimedia_url && (
                            <div className="pt-1.5 border-t border-neutral-800/60 flex justify-end">
                              <a 
                                href={ej.multimedia_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 uppercase tracking-wider"
                              >
                                📺 Ver Ejercicio
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
          </div>

          {/* SECCIÓN DE ASISTENCIA DIARIA */}
          {listaAlumnos.length > 0 && (
            <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">Planilla de Asistencia</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {listaAlumnos.map(al => (
                  <div key={al.id} onClick={() => toggleAsistencia(al.id)} className={`p-2.5 border rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all ${
                    al.presente ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500 line-through'
                  }`}>
                    <span>{al.nombre}</span>
                    <span>{al.presente ? '✔ PRESENTE' : '✕ AUSENTE'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOTÓN DE ACCIÓN */}
          <button 
            type="submit" 
            disabled={cargando} 
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 text-neutral-950 font-bold py-3 rounded-lg text-sm transition-colors shadow-lg"
          >
            {cargando ? 'Guardando en Vercel Postgres...' : 'GRABAR ENTRENAMIENTO Y ASISTENCIA'}
          </button>

        </form>
      </div>
    </div>
  );
}

