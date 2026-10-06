'use client';

import { useState } from 'react';
import { supabase } from '@/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    // Conexión oficial al sistema Auth de Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error: ${error.message}` });
      setCargando(false);
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Ingreso exitoso! Redirigiendo...' });
      // Redirige al menú principal o panel de control tras ingresar
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TRAINING KEEPER</h1>
          <p className="text-neutral-400 text-xs mt-1">Acceso Exclusivo para Entrenadores de Hockey</p>
        </div>

        {/* Alertas */}
        {mensaje.texto && (
          <div className={`p-3 mb-4 rounded-lg text-xs font-semibold border text-center ${
            mensaje.tipo === 'exito' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' : 'bg-red-950/40 text-red-400 border-red-800/60'
          }`}>{mensaje.texto}</div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1.5 font-medium">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              placeholder="nombre@club.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" 
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1.5 font-medium">Contraseña</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" 
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 text-neutral-950 font-bold py-3 rounded-lg text-sm transition-colors shadow-lg mt-2"
          >
            {cargando ? 'Verificando credenciales...' : 'INICIAR SESIÓN'}
          </button>
        </form>

      </div>
    </div>
  );
}
