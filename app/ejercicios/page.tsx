'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'; 
import { supabase } from '@/supabaseClient';

export default function CargarEjercicio() {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    desarrollo: '',
    objetivo: '', // ← Campo unificado de objetivos/subrubro a la nueva etiqueta técnica
    cantidad_jugadores: '',
    rubro: '',      
    club_asociado: '',
    multimedia_url: ''
  });

  // Catálogos cargados dinámicamente desde Supabase
  const [rubrosDB, setRubrosDB] = useState<any[]>([]);
  const [subrubrosDB, setSubrubrosDB] = useState<any[]>([]);
  const [objetivosFiltrados, setObjetivosFiltrados] = useState<any[]>([]); // ← Lista reactiva limpia

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // 1. CARGAR LOS RUBROS Y OBJETIVOS DESDE LAS TABLAS MAESTRAS
  useEffect(() => {
    const descargarFiltros = async () => {
      const { data: rubros } = await supabase.from('rubros').select('*');
      const { data: subrubros } = await supabase.from('subrubros').select('*'); // Mantiene lectura de tu tabla actual

      if (rubros) setRubrosDB(rubros);
      if (subrubros) setSubrubrosDB(subrubros);
    };

    descargarFiltros();
  }, []);

  // 2. EFECTO REACTIVO: Filtra los objetivos de la lista según el rubro táctico elegido
  useEffect(() => {
    if (formData.rubro) {
      const rubroActual = rubrosDB.find(r => r.nombre === formData.rubro);
      if (rubroActual) {
        const filtrados = subrubrosDB.filter(s => s.rubro_id === rubroActual.id);
        setObjetivosFiltrados(filtrados);
      } else {
        setObjetivosFiltrados([]);
      }
    } else {
      setObjetivosFiltrados([]);
    }
    setFormData(prev => ({ ...prev, objetivo: '' }));
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
            cantidad_jugadores: formData.cantidad_jugadores.trim(),
            rubro: formData.rubro,
            club_asociado: formData.club_asociado.trim(),
            multimedia_url: formData.multimedia_url.trim(),
            // Inyectamos el valor en espejo en ambos campos para sincronía total con dBeaver
            subrubro: formData.objetivo,
            objetivos: formData.objetivo
          }
        ]);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: '¡Ejercicio táctico guardado exitosamente por Objetivo! 🚀' });
      setFormData({
        codigo: '', nombre: '', desarrollo: '', objetivo: '',
        cantidad_jugadores: '', rubro: '', club_asociado: '', multimedia_url: ''
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
            <p className="text-neutral-400 text-sm mt-1">Catálogo de Ejercicios — Clasificación Inteligente por Objetivos</p>
          </div>
          <Link href="/" className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors bg-neutral-950">
            ← Volver al Menú
          </Link>
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

          {/* CLASIFICACIÓN DINÁMICA CONECTADA A RUBROS Y OBJETIVOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Clasificación (Tipo)</label>
              <select 
                name="rubro" 
                required 
                value={formData.rubro} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300"
              >
                <option value="">Seleccionar Tipo...</option>
                {rubrosDB.map(r => (
                  <option key={r.id} value={r.nombre}>{r.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Objetivo Principal</label>
              <select 
                name="objetivo" 
                required 
                value={formData.objetivo} 
                onChange={handleChange} 
                disabled={!formData.rubro}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300 disabled:bg-neutral-950 disabled:text-neutral-600"
              >
                <option value="">{formData.rubro ? "Seleccionar Objetivo..." : "Primero elija un Tipo"}</option>
                {objetivosFiltrados.map(o => (
                  <option key={o.id} value={o.nombre}>{o.nombre}</option>
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Desarrollo Paso a Paso</label>
            <textarea name="desarrollo" required rows={5} placeholder="Secuencia detallada del entrenamiento..." value={formData.desarrollo} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none leading-relaxed" />
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


