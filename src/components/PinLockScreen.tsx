import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Clock,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
} from 'lucide-react';
import { authService, VerifyPinResult } from '../services/authService';
import { ReadingTheme } from '../types/book';
import { standardizePin } from '../utils/textFormatters';
import { PWAInstallButton } from './PWAInstallButton';

interface PinLockScreenProps {
  theme?: ReadingTheme;
  onAuthenticated: (result?: VerifyPinResult) => void;
  onNavigateToAdmin?: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  theme = 'cream',
  onAuthenticated,
  onNavigateToAdmin,
}) => {
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-foco no campo ao carregar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Contador decrescente quando bloqueado temporariamente
  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMessage(null);
          setErrorCode(null);
          setDiagnosticInfo(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || lockoutSeconds > 0) return;

    // Padroniza estritamente o PIN: converte para string, remove espaços e caracteres invisíveis
    const cleanPin = standardizePin(pin);
    if (!cleanPin) {
      setErrorMessage('Por favor, digite o PIN para entrar.');
      setErrorCode('empty_pin');
      setDiagnosticInfo('Nenhum dígito válido detectado no campo.');
      inputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);
    setDiagnosticInfo(null);

    const result: VerifyPinResult = await authService.verifyPin(cleanPin);

    setIsLoading(false);

    if (result.success) {
      setErrorMessage(null);
      setErrorCode(null);
      setDiagnosticInfo(null);
      onAuthenticated(result);
    } else {
      setErrorMessage(result.error || 'PIN incorreto. Tente novamente.');
      setErrorCode(result.code || 'invalid_pin');
      setDiagnosticInfo(result.diagnostic || null);

      if (typeof result.remainingAttempts === 'number') {
        setAttemptsLeft(result.remainingAttempts);
      }
      if (typeof result.retryAfter === 'number' && result.retryAfter > 0) {
        setLockoutSeconds(result.retryAfter);
      }
      // Limpa e foca para nova tentativa
      setPin('');
      inputRef.current?.focus();
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 font-sans ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#FBF8F3] text-stone-800'
      }`}
    >
      {/* Elemento central de autenticação */}
      <div className="w-full max-w-md mx-auto">
        <div
          className={`rounded-2xl p-6 sm:p-8 shadow-xl border backdrop-blur-xs transition-all ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-800/80 shadow-black/40'
              : 'bg-white/85 border-stone-200/90 shadow-stone-300/40'
          }`}
        >
          {/* Cabeçalho da Biblioteca */}
          <div className="text-center mb-7">
            <div
              className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 transition-transform duration-300 ${
                isDark
                  ? 'bg-zinc-800/80 text-amber-400 border border-zinc-700/60 shadow-inner'
                  : 'bg-stone-100 text-stone-700 border border-stone-200 shadow-xs'
              }`}
            >
              <BookOpen className="w-6 h-6 stroke-[1.75]" />
            </div>

            <h1
              className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${
                isDark ? 'text-zinc-50' : 'text-stone-900'
              }`}
            >
              Biblioteca Digital
            </h1>
            <p
              className={`font-serif text-xs sm:text-sm leading-relaxed max-w-xs mx-auto ${
                isDark ? 'text-zinc-400' : 'text-stone-600'
              }`}
            >
              Acesso restrito. Insira o PIN autorizado.
            </p>
          </div>

          {/* Formulário de PIN */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="pin-input"
                className={`block text-xs font-medium uppercase tracking-wider mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-stone-600'
                }`}
              >
                PIN de Acesso
              </label>

              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                    isDark ? 'text-zinc-500' : 'text-stone-400'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                </div>

                <input
                  id="pin-input"
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={pin}
                  onChange={(e) => {
                    // Padroniza e higieniza em tempo real contra espaços acidentais ou quebras de linha
                    const sanitized = standardizePin(e.target.value);
                    setPin(sanitized);
                    if (errorMessage && lockoutSeconds === 0) {
                      setErrorMessage(null);
                      setErrorCode(null);
                      setDiagnosticInfo(null);
                    }
                  }}
                  disabled={isLoading || lockoutSeconds > 0}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl text-base tracking-widest font-mono text-center sm:text-left transition-all outline-none border ${
                    isDark
                      ? 'bg-zinc-800/90 text-zinc-100 border-zinc-700 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20'
                      : 'bg-stone-50/80 text-stone-900 border-stone-300 focus:border-stone-600 focus:ring-2 focus:ring-stone-400/20'
                  } ${
                    lockoutSeconds > 0
                      ? 'opacity-60 cursor-not-allowed border-rose-300 dark:border-rose-800'
                      : errorMessage
                      ? 'border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/20'
                      : ''
                  }`}
                />

                {/* Botão de alternar visibilidade dos dígitos */}
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  disabled={isLoading || lockoutSeconds > 0}
                  aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                  className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors cursor-pointer ${
                    isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-stone-400 hover:text-stone-700'
                  }`}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Alerta de erro com diagnóstico claro e robusto */}
            {lockoutSeconds > 0 ? (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
                  isDark
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
                role="alert"
              >
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">Bloqueio temporário de segurança</p>
                  <p className="text-[11px] leading-relaxed">
                    Muitas tentativas consecutivas incorretas. Aguarde{' '}
                    <span className="font-bold font-mono">{lockoutSeconds}s</span> antes de tentar
                    novamente.
                  </p>
                </div>
              </div>
            ) : (
              errorMessage && (
                <div
                  className={`p-3.5 rounded-xl border space-y-2 text-xs animate-in fade-in duration-200 ${
                    isDark
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                  role="alert"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <div className="flex-1">
                      <p className="font-medium leading-relaxed">{errorMessage}</p>
                      {attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft < 5 && (
                        <p className="mt-1 text-[11px] opacity-90">
                          Tentativas restantes antes do bloqueio: <strong>{attemptsLeft}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Informação diagnóstica detalhada */}
                  {diagnosticInfo && (
                    <div
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                        isDark ? 'bg-rose-900/40 text-rose-200' : 'bg-rose-100/70 text-rose-900'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span>{diagnosticInfo}</span>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Ajuda e Orientações para Diagnóstico do PIN do Leitor */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dúvidas ou problemas com o PIN de leitor?</span>
                </span>
                {showHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showHelp && (
                <div
                  className={`mt-2 p-3.5 rounded-xl border text-[11px] space-y-2 leading-relaxed animate-in fade-in duration-200 ${
                    isDark
                      ? 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">•</span>
                    <p>
                      <strong>PINs Individuais:</strong> Leitores registrados pelo sistema (como Fernando Veiga e Ana Crachano) possuem códigos de acesso gerados pela administração.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">•</span>
                    <p>
                      <strong>Formato dos Dígitos:</strong> O aplicativo higieniza automaticamente espaços acidentais e pontuações ao digitar ou colar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">•</span>
                    <p>
                      <strong>Redefinição Rápida:</strong> Caso haja divergência no código entregue ao leitor, o administrador pode gerar um novo PIN a qualquer momento no Painel Administrativo.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de envio */}
            <button
              type="submit"
              disabled={isLoading || lockoutSeconds > 0 || !standardizePin(pin)}
              className={`w-full py-3 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                isDark
                  ? 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-950 shadow-md shadow-amber-400/10'
                  : 'bg-stone-800 hover:bg-stone-900 active:bg-black text-stone-50 shadow-md shadow-stone-800/10'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando no servidor...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>

          {/* Rodapé informativo de segurança */}
          <div
            className={`mt-6 pt-5 border-t flex flex-col items-center justify-center gap-3 text-[11px] text-center ${
              isDark
                ? 'border-zinc-800/80 text-zinc-400'
                : 'border-stone-200/80 text-stone-600'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Validação protegida no servidor · Sessão criptografada</span>
            </div>

            <PWAInstallButton theme={theme} variant="badge" />
          </div>
        </div>

        {/* Acesso exclusivo para administradores */}
        <div className="mt-5 text-center">
          {onNavigateToAdmin && (
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-stone-200/50 dark:hover:bg-zinc-900"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Área Administrativa</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
