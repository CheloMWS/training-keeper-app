'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient'; // ← El arroba (@) buscará el archivo que acabamos de crear en la raíz

export default function CargarJugador() {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    club: '',        // Guardará el nombre del club seleccionado
    categoria: '',   // Guardará el nombre de la categoría seleccionada
    division: '',
    sexo: '',
    fecha_nacimiento: '',
    estado: 'Activo'
  });

  // NUEVOS ESTADOS: Listas que vendrán de la base de datos
  const [clubesDB, setClubesDB] = useState<any[]>([]);
  const [categoriasDB, setCategoriasDB] = useState<any[]>([]);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // 1. DESCARGAR CLUBES Y CATEGORÍAS REALES AL ABRIR LA PANTALLA
  useEffect(() => {
    const descargarFichasMaestras = async () => {
      const { data: clubes, error: err1 } = await supabase.from('clubes').select('*').order('nombre', { ascending: true });
      const { data: categorias, error: err2 } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });

      if (!err1 && clubes) setClubesDB(clubes);
      if (!err2 && categorias) setCategoriasDB(categorias);
    };

    descargarFichasMaestras();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const { error } = await supabase
        .from('alumnos')
        .insert([
          {
            nombre_completo: formData.nombre_completo.trim(),
            club: formData.club,
            categoria: formData.categoria,
            division: formData.division.trim().toUpperCase(),
            sexo: formData.sexo,
            fecha_nacimiento: formData.fecha_nacimiento,
            estado: formData.estado
          }
        ]);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: '¡Jugador/a fichado y guardado con éxito en la nube! 🚀' });
      setFormData({
        nombre_completo: '', club: '', categoria: '', division: '', sexo: '', fecha_nacimiento: '', estado: 'Activo'
      });

    } catch (error: any) {
      console.error(error);
      setMensaje({ tipo: 'error', texto: `Error al fichar: ${error.message || 'Verifique la conexión.'}` });
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
            <p className="text-neutral-400 text-sm mt-1">Fichaje de Jugadores — Registrar Jugador/a</p>
          </div>
          <div className="flex gap-2">
            <a href="/jugadores/historial" className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition-colors">
              📋 Ver Ejercicios por Jugador
            </a>
            <a href="/" className="text-xs text-neutral-400 hover:text-emerald-400 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
              ← Volver al Menú
            </a>
          </div>
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
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Nombre Completo del Jugador/a</label>
            <input 
              type="text" name="nombre_completo" required placeholder="Ej: Belén Succi" value={formData.nombre_completo} onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CLUB DESPLEGABLE DINÁMICO */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Club</label>
              <select 
                name="club" required value={formData.club} onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300"
              >
                <option value="">Seleccionar Club...</option>
                {clubesDB.map(c => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Fecha de Nacimiento</label>
              <input 
                type="date" name="fecha_nacimiento" required value={formData.fecha_nacimiento} onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CATEGORÍA DESPLEGABLE DINÁMICA */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Categoría</label>
              <select 
                name="categoria" required value={formData.categoria} onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300"
              >
                <option value="">Seleccionar...</option>
                {categoriasDB.map(cat => (
                  <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">División / Tira</label>
              <input 
                type="text" name="division" required placeholder="Ej: B" value={formData.division} onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Rama / Sexo</label>
              <select 
                name="sexo" required value={formData.sexo} onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300"
              >
                <option value="">Seleccionar</option>
                <option value="Damas">Damas</option>
                <option value="Caballeros">Caballeros</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Estado Ficha</label>
            <select 
              name="estado" value={formData.estado} onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-neutral-300"
            >
              <option value="Activo">Activo / Asiste</option>
              <option value="Inactivo">Inactivo / Licencia</option>
            </select>
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end pt-4">
            <button 
              type="submit" disabled={cargando}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold text-sm uppercase tracking-wide px-8 py-3 rounded-lg shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {cargando ? 'Guardando...' : 'Fichar Jugador/a'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}


