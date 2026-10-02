'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient'; // ← El arroba (@) buscará el archivo que acabamos de crear en la raíz

export default function PlanificacionKeeper() {
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
      const { data: ejs } = await supabase.from('ejercicios').select('id, codigo, nombre').order('codigo', { ascending: true });
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

        if (!error && data) {
          setListaAlumnos(data.map(j => ({ id: j.id, nombre: j.nombre_completo, presente: true })));
        }
      } else {
        setListaAlumnos([]);
      }
    };
    buscarPlantelReal();
  }, [entrenamiento.club, entrenamiento.categoria, entrenamiento.division]);

  // Manejador genérico para inputs, textareas y selectores corregido
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
          
          {/* BLOQUE DE FILTROS TOTALMENTE ENLAZADO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-neutral-950 p-6 rounded-xl border border-neutral-800">
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Entrenamiento Nº</label>
              <input type="number" name="numero" required value={entrenamiento.numero} onChange={handleHeaderChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none" />
            </div>
            
            {/* SELECTOR DE CLUB */}
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Club</label>
              <select name="club" required value={entrenamiento.club} onChange={handleHeaderChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-300 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar Club...</option>
                {clubesDB.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
            
            {/* SELECTOR DE CATEGORÍA */}
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Categoría</label>
              <select name="categoria" required value={entrenamiento.categoria} onChange={handleHeaderChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-300 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar...</option>
                {categoriasDB.map(cat => <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>)}
              </select>
            </div>
            
            {/* INPUT DE DIVISIÓN */}
            <div>
              <label className="block text-xs text-neutral-400 mb-2">División</label>
              <input type="text" name="division" required placeholder="Ej: B" value={entrenamiento.division} onChange={handleHeaderChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          {/* Objetivo Principal */}
          <div>
            <label className="block text-xs text-neutral-400 mb-2">Objetivo Principal</label>
            <input type="text" name="objetivo" required value={entrenamiento.objetivo} onChange={handleHeaderChange} placeholder="Ej: Velocidad gestual" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
          </div>

          {/* Catálogo y Cronograma */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <div className="text-xs font-semibold text-neutral-400 uppercase mb-2">Catálogo</div>
              {ejerciciosCatalogo.length === 0 ? (
                <div className="text-neutral-600 text-xs py-2">No hay ejercicios en la base.</div>
              ) : (
                ejerciciosCatalogo.map(ej => (
                  <button type="button" key={ej.id} onClick={() => agregarEjercicio(ej.id)} className="w-full text-left bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-xs mb-2 flex justify-between">
                    <span>[{ej.codigo}] {ej.nombre}</span>
                    <span className="text-emerald-400 font-bold">+</span>
                  </button>
                ))
              )}
            </div>

            <div className="md:col-span-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <div className="text-xs font-semibold text-neutral-400 uppercase mb-2">Cronograma</div>
              {ejerciciosSeleccionados.length === 0 ? (
                <div className="text-neutral-500 text-xs py-4 text-center">Selecciona de la izquierda.</div>
              ) : (
                ejerciciosSeleccionados.map((ej, index) => (
                  <div key={ej.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex items-center justify-between mb-2 text-xs">
                    <span>{index + 1}. {ej.nombre}</span>
                    <div className="flex items-center gap-2">
                      <input type="number" value={ej.duracion} min="1" onChange={(e) => handleDuracionChange(ej.id, parseInt(e.target.value) || 0)} className="w-12 bg-neutral-950 border border-neutral-800 rounded text-center text-emerald-400" />
                      <button type="button" onClick={() => removerEjercicio(ej.id)} className="text-neutral-500 hover:text-red-400">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Asistencia Automática */}
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
            <div className="text-emerald-500 font-semibold text-xs uppercase mb-3">Asistencia Automática</div>
            {listaAlumnos.length === 0 ? (
              <div className="text-neutral-500 text-xs text-center py-2">Escribí los datos del plantel arriba para enlazar las jugadoras.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listaAlumnos.map(al => (
                  <div key={al.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex justify-between items-center text-xs">
                    <span>{al.nombre}</span>
                    <button type="button" onClick={() => toggleAsistencia(al.id)} className="text-xs font-bold px-3 py-1 rounded border border-neutral-700 bg-neutral-800">
                      {al.presente ? 'PRESENTE ✅' : 'AUSENTE ❌'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs text-neutral-400 mb-2">Observaciones (Opcional)</label>
            <textarea name="observaciones" rows={2} value={entrenamiento.observaciones} onChange={handleHeaderChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none resize-none" />
          </div>

          {/* Botón de Envío */}
          <div className="flex justify-end">
            <button type="submit" disabled={cargando} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm uppercase px-8 py-3 rounded-lg shadow-md">
              {cargando ? 'Guardando...' : 'Guardar Planificación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
