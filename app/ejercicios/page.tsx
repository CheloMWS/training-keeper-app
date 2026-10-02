'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient'; // ← El arroba (@) buscará el archivo que acabamos de crear en la raíz

export default function CargarEjercicio() {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    desarrollo: '',
    objetivos: '',
    cantidad_jugadores: '',
    rubro: '',      // Guardará el nombre del rubro seleccionado
    subrubro: '',   // Guardará el nombre del subrubro seleccionado
    club_asociado: '',
    multimedia_url: ''
  });

  // Estados para almacenar lo que viene de la base de datos
  const [rubrosDB, setRubrosDB] = useState<any[]>([]);
  const [subrubrosDB, setSubrubrosDB] = useState<any[]>([]);
  const [subrubrosFiltrados, setSubrubrosFiltrados] = useState<any[]>([]);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // 1. CARGAR LOS RUBROS Y SUBRUBROS AL ABRIR LA PANTALLA
  useEffect(() => {
    const descargarFiltros = async () => {
      // Traemos todos los rubros
      const { data: rubros, error: err1 } = await supabase.from('rubros').select('*').order('nombre', { ascending: true });
      // Traemos todos los subrubros
      const { data: subrubros, error: err2 } = await supabase.from('subrubros').select('*').order('nombre', { ascending: true });

      if (!err1 && rubros) setRubrosDB(rubros);
      if (!err2 && subrubros) setSubrubrosDB(subrubros);
    };

    descargarFiltros();
  }, []);

  // 2. EFECTO REACTIVO: Filtra los subrubros cuando cambia el rubro seleccionado
  useEffect(() => {
    if (formData.rubro) {
      // Encontramos el ID del rubro actual por su nombre
      const rubroActual = rubrosDB.find(r => r.nombre === formData.rubro);
      if (rubroActual) {
        const filtrados = subrubrosDB.filter(s => s.rubro_id === rubroActual.id);
        setSubrubrosFiltrados(filtrados);
      } else {
        setSubrubrosFiltrados([]);
      }
    } else {
      setSubrubrosFiltrados([]);
    }
    // Limpiamos el subrubro si cambian el rubro padre para evitar inconsistencias
    setFormData(prev => ({ ...prev, subrubro: '' }));
  }, [formData.rubro, rubrosDB, subrubrosDB]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const { error } = await supabase
        .from('ejercicios')
        .insert([
          {
            codigo: formData.codigo.trim(),
            nombre: formData.nombre.trim(),
            desarrollo: formData.desarrollo.trim(),
            objetivos: formData.objetivos.trim(),
            cantidad_jugadores: formData.cantidad_jugadores.trim(),
            rubro: formData.rubro,
            subrubro: formData.subrubro,
            club_asociado: formData.club_asociado.trim(),
            multimedia_url: formData.multimedia_url.trim()
          }
        ]);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: '¡Ejercicio de Arquero guardado exitosamente con su tipo oficial! 🚀' });
      setFormData({
        codigo: '', nombre: '', desarrollo: '', objetivos: '',
        cantidad_jugadores: '', rubro: '', subrubro: '', club_asociado: '', multimedia_url: ''
      });

    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: 'error', texto: `Error: ${error.message || 'Verifique los campos.'}` });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="border-b border-neutral-800 pb-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Catálogo de Ejercicios — Clasificación Inteligente</p>
          </div>
          <a href="/" className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
            ← Volver al Menú
          </a>
        </div>

        {/* Alertas de estado */}
        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-semibold border ${
            mensaje.tipo === 'exito' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' : 'bg-red-950/40 text-red-400 border-red-800/60'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Código Unique</label>
              <input type="text" name="codigo" required placeholder="Ej: KEE-001" value={formData.codigo} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Nombre del Ejercicio</label>
              <input type="text" name="nombre" required placeholder="Ej: Reacción ante desvíos y control de rebote" value={formData.nombre} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          {/* CLASIFICACIÓN DINÁMICA CONECTADA A RUBROS/SUBRUBROS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Clasificación (Rubro)</label>
              <select name="rubro" required value={formData.rubro} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300">
                <option value="">Seleccionar Rubro...</option>
                {rubrosDB.map(r => (
                  <option key={r.id} value={r.nombre}>{r.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">SubRubro (Subtipo)</label>
              <select 
                name="subrubro" required value={formData.subrubro} onChange={handleChange} disabled={!formData.rubro}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300 disabled:bg-neutral-950 disabled:text-neutral-600"
              >
                <option value="">{formData.rubro ? "Seleccionar SubRubro..." : "Primero elija un Rubro"}</option>
                {subrubrosFiltrados.map(s => (
                  <option key={s.id} value={s.nombre}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Arqueros Necesarios</label>
              <input type="text" name="cantidad_jugadores" placeholder="Ej: 1 Keeper / 2 Porteros" value={formData.cantidad_jugadores} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Club Asociado (Opcional)</label>
            <input type="text" name="club_asociado" placeholder="Ej: Club San Fernando" value={formData.club_asociado} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Link del Video o Imagen Esquema</label>
            <input type="url" name="multimedia_url" placeholder="Ej: https://youtube.com..." value={formData.multimedia_url} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-emerald-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Objetivos del Ejercicio</label>
            <textarea name="objetivos" rows={2} placeholder="Qué se busca entrenar..." value={formData.objetivos} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Desarrollo Paso a Paso</label>
            <textarea name="desarrollo" required rows={4} placeholder="Secuencia del entrenamiento..." value={formData.desarrollo} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

                    {/* Botón Guardar */}
          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={cargando}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold text-sm uppercase tracking-wide px-8 py-3 rounded-lg shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {cargando ? 'Guardando...' : 'Guardar Ejercicio'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}