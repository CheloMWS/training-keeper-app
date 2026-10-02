'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient'; // ← El arroba (@) buscará el archivo que acabamos de crear en la raíz

export default function ConfiguracionCategorias() {
  // Estados para Rubros y Subrubros
  const [nuevoRubro, setNuevoRubro] = useState('');
  const [rubrosLista, setRubrosLista] = useState<any[]>([]);
  const [nuevoSubRubro, setNuevoSubRubro] = useState('');
  const [rubroSeleccionado, setRubroSeleccionado] = useState('');

  // NUEVOS ESTADOS: Para Clubes y Categorías de Jugadores
  const [nuevoClub, setNuevoClub] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Descarga automática inicial de rubros
  useEffect(() => {
    cargarRubros();
  }, []);

  const cargarRubros = async () => {
    const { data, error } = await supabase.from('rubros').select('*').order('nombre', { ascending: true });
    if (!error && data) setRubrosLista(data);
  };

  // Funciones de Guardado para Ejercicios
  const guardarRubro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRubro.trim()) return;
    setCargando(true); setMensaje({ tipo: '', texto: '' });
    const { error } = await supabase.from('rubros').insert([{ nombre: nuevoRubro.trim() }]);
    if (error) { setMensaje({ tipo: 'error', texto: `Error: ${error.message}` }); } 
    else { setMensaje({ tipo: 'exito', texto: '¡Rubro guardado correctamente! 🎉' }); setNuevoRubro(''); cargarRubros(); }
    setCargando(false);
  };

  const guardarSubRubro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoSubRubro.trim() || !rubroSeleccionado) return;
    setCargando(true); setMensaje({ tipo: '', texto: '' });
    const { error } = await supabase.from('subrubros').insert([{ rubro_id: rubroSeleccionado, nombre: nuevoSubRubro.trim() }]);
    if (error) { setMensaje({ tipo: 'error', texto: `Error: ${error.message}` }); } 
    else { setMensaje({ tipo: 'exito', texto: '¡SubRubro guardado correctamente! 🎉' }); setNuevoSubRubro(''); }
    setCargando(false);
  };

  // NUEVAS FUNCIONES: Guardar Clubes y Categorías en la Base de Datos
  const guardarClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoClub.trim()) return;
    setCargando(true); setMensaje({ tipo: '', texto: '' });
    const { error } = await supabase.from('clubes').insert([{ nombre: nuevoClub.trim() }]);
    if (error) { setMensaje({ tipo: 'error', texto: `Error: ${error.message}` }); } 
    else { setMensaje({ tipo: 'exito', texto: '¡Club guardado con éxito en la nube! 🏑' }); setNuevoClub(''); }
    setCargando(false);
  };

  const guardarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    setCargando(true); setMensaje({ tipo: '', texto: '' });
    const { error } = await supabase.from('categorias').insert([{ nombre: nuevaCategoria.trim() }]);
    if (error) { setMensaje({ tipo: 'error', texto: `Error: ${error.message}` }); } 
    else { setMensaje({ tipo: 'exito', texto: '¡Categoría guardada con éxito en la nube! 🏆' }); setNuevaCategoria(''); }
    setCargando(false);
  };
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="border-b border-neutral-800 pb-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER APP</h1>
            <p className="text-neutral-400 text-sm mt-1">Configuración — Panel de Datos Maestros</p>
          </div>
          <a href="/" className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
            ← Volver al Menú
          </a>
        </div>

        {/* Alertas */}
        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-semibold border ${
            mensaje.tipo === 'exito' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' : 'bg-red-950/40 text-red-400 border-red-800/60'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* REJILLA GENERAL */}
        <div className="space-y-8">
          
          {/* SECCIÓN 1: CONFIGURACIÓN DE EJERCICIOS */}
          <div>
            <div className="text-neutral-400 font-bold text-xs uppercase tracking-wider mb-3">Estructura del Catálogo (Ejercicios)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tarjeta 1: Rubros */}
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-3">
                <h3 className="text-emerald-400 font-bold text-xs uppercase">1. Crear Rubro (Tipo)</h3>
                <form onSubmit={guardarRubro} className="space-y-3">
                  <input type="text" required placeholder="Ej: Técnica Individual" value={nuevoRubro} onChange={(e) => setNuevoRubro(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500" />
                  <button type="submit" disabled={cargando} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-colors">Añadir Rubro</button>
                </form>
              </div>

              {/* Tarjeta 2: Subrubros */}
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-3">
                <h3 className="text-emerald-400 font-bold text-xs uppercase">2. Crear SubRubro (Subtipo)</h3>
                <form onSubmit={guardarSubRubro} className="space-y-3">
                  <select required value={rubroSeleccionado} onChange={(e) => setRubroSeleccionado(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:outline-none">
                    <option value="">Seleccionar Rubro Padre...</option>
                    {rubrosLista.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                  <input type="text" required placeholder="Ej: Bloqueo Raso" value={nuevoSubRubro} onChange={(e) => setNuevoSubRubro(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500" />
                  <button type="submit" disabled={cargando || !rubroSeleccionado} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-colors disabled:bg-neutral-800 disabled:text-neutral-500">Añadir SubRubro</button>
                </form>
              </div>

            </div>
          </div>

          {/* SECCIÓN 2: CONFIGURACIÓN DE INSTITUCIONES Y DIVISIONES */}
          <div>
            <div className="text-neutral-400 font-bold text-xs uppercase tracking-wider mb-3">Estructura del Plantel (Jugadores / Equipos)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tarjeta 3: Clubes */}
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-3">
                <h3 className="text-emerald-400 font-bold text-xs uppercase">3. Dar de Alta Club</h3>
                <p className="text-[10px] text-neutral-500">Registrá los clubes que manejás para evitar errores de tipeo.</p>
                <form onSubmit={guardarClub} className="space-y-3">
                  <input type="text" required placeholder="Ej: Huracán" value={nuevoClub} onChange={(e) => setNuevoClub(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500" />
                  <button type="submit" disabled={cargando} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-colors">Guardar Club</button>
                </form>
              </div>

              {/* Tarjeta 4: Categorías */}
              <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-3">
                <h3 className="text-emerald-400 font-bold text-xs uppercase">4. Dar de Alta Categoría</h3>
                <p className="text-[10px] text-neutral-500">Configurá las divisiones del deporte (Ej: Primera, Intermedia, 5ta).</p>
                <form onSubmit={guardarCategoria} className="space-y-3">
                  <input type="text" required placeholder="Ej: 5ta (Sub-18)" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500" />
                  <button type="submit" disabled={cargando} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-colors">Guardar Categoría</button>
                </form>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
