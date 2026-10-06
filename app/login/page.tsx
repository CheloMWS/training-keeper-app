'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Función principal para iniciar sesión con Supabase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Traducimos los errores comunes al español
      if (error.message === 'Invalid login credentials') {
        setErrorMsg('El correo o la contraseña son incorrectos.');
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
    } else {
      // Si el inicio es correcto, viaja al menú principal desbloqueado
      router.push('/');
      router.refresh();
    }
  };
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col justify-center items-center font-sans">
      
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Encabezado del Formulario */}
        <div className="text-center mb-8">
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            Acceso Restringido
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white mt-3">
            INICIAR <span className="text-emerald-400">SESIÓN</span>
          </h2>
          <p className="text-neutral-400 text-xs mt-2">
            Ingresa tus credenciales  para desbloquear el panel técnico.
          </p>
        </div>

        {/* Mensaje de Error (Si las credenciales fallan) */}
        {errorMsg && (
          <div className="mb-4 bg-red-950/50 border border-red-800 text-red-200 text-xs p-3 rounded-xl text-center font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Campo Correo */}
          <div>
            <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="entrenador@ejemplo.com"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold text-sm py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] mt-2 flex items-center justify-center gap-2 ${
              loading
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                : 'bg-emerald-500 text-black hover:bg-emerald-400'
            }`}
          >
            {loading ? (
              <span>Validando...</span>
            ) : (
              <>
                <span>🔓 Desbloquear Panel</span>
              </>
            )}
          </button>

        </form>

        {/* Pie informativo */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-neutral-600 uppercase tracking-wider">
            Soporte Técnico — Training Keeper App
          </p>
        </div>

      </div>
    </div>
  );
}

