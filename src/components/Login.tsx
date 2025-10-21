/**
 * Login Component - Sistema de Autenticación DAES
 * Usuario: ModoDios
 * Esquema: Negro + Verde Futurista
 */

import { useState, useEffect } from 'react';
import { Lock, User, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useLanguage } from '../lib/i18n.tsx';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Credenciales
  const VALID_USERNAME = 'ModoDios';
  const VALID_PASSWORD = 'DAES3334';

  // Efecto de animación de fondo
  useEffect(() => {
    const canvas = document.getElementById('matrix-bg') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = 'DAES01ModoDios';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff88';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simular delay de autenticación
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // Login exitoso
      localStorage.setItem('daes_authenticated', 'true');
      localStorage.setItem('daes_user', username);
      localStorage.setItem('daes_login_time', new Date().toISOString());
      onLogin();
    } else {
      setAttempts(prev => prev + 1);
      setError(t.loginInvalidCredentials);
      setPassword('');

      // Bloqueo temporal después de 3 intentos
      if (attempts >= 2) {
        setError(t.loginTooManyAttempts);
        setTimeout(() => {
          setAttempts(0);
          setError('');
        }, 30000);
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Fondo Matrix animado */}
      <canvas
        id="matrix-bg"
        className="absolute inset-0 opacity-20"
      />

      {/* Grid de fondo */}
      <div className="absolute inset-0 grid-cyber opacity-10" />

      {/* Contenedor principal */}
      <div className="relative z-10 h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo y título */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00cc6a] mb-6 glow-green-ultra pulse-green">
              <Shield className="w-10 h-10 text-black" />
            </div>
            <h1 className="text-4xl font-black text-neon-bright mb-2 tracking-wider">
              {t.loginTitle}
            </h1>
            <p className="text-cyber text-sm font-semibold tracking-widest">
              {t.loginSubtitle}
            </p>
            <div className="mt-4 text-[#4d7c4d] text-xs font-mono">
              CoreBanking Security Gateway
            </div>
          </div>

          {/* Formulario de login */}
          <div className="glass-panel rounded-2xl p-8 shadow-2xl border-glow">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo de usuario */}
              <div>
                <label className="block text-[#80ff80] text-sm font-semibold mb-2">
                  {t.loginUser}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-[#4d7c4d]" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black border border-[#1a1a1a] rounded-lg text-[#e0ffe0] placeholder-[#4d7c4d] focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/30 focus:shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all outline-none font-mono"
                    placeholder={t.loginUser}
                    disabled={isLoading || attempts >= 3}
                    required
                  />
                </div>
              </div>

              {/* Campo de contraseña */}
              <div>
                <label className="block text-[#80ff80] text-sm font-semibold mb-2">
                  {t.loginPassword}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-[#4d7c4d]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-black border border-[#1a1a1a] rounded-lg text-[#e0ffe0] placeholder-[#4d7c4d] focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/30 focus:shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all outline-none font-mono"
                    placeholder={t.loginPassword}
                    disabled={isLoading || attempts >= 3}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#4d7c4d] hover:text-[#80ff80] transition-colors"
                    disabled={isLoading || attempts >= 3}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-950/50 border border-red-500/50 rounded-lg p-3 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Botón de submit */}
              <button
                type="submit"
                disabled={isLoading || attempts >= 3}
                className={`w-full py-3 px-4 rounded-lg font-bold text-black transition-all flex items-center justify-center gap-2 ${
                  isLoading || attempts >= 3
                    ? 'bg-[#4d7c4d] cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00ffaa] hover:to-[#00ff88] shadow-[0_0_25px_rgba(0,255,136,0.5)] hover:shadow-[0_0_35px_rgba(0,255,136,0.8)] transform hover:scale-[1.02]'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>{t.loginAuthenticating}</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>{t.loginButton}</span>
                  </>
                )}
              </button>
            </form>

            {/* Información de seguridad */}
            <div className="mt-6 pt-6 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-2 text-[#4d7c4d] text-xs">
                <Lock className="w-4 h-4" />
                <span>{t.loginSecureConnection}</span>
              </div>
              <div className="mt-2 text-[#4d7c4d] text-xs">
                {t.loginAttempts}: {attempts}/3
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-[#4d7c4d] text-xs">
            <p>{t.loginCopyright}</p>
            <p className="mt-1">{t.loginAllRightsReserved} • {t.loginVersion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

