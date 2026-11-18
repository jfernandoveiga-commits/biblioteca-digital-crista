import React, { useState, useMemo, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { ReadingTheme } from '../types/book';
import { authService } from '../services/authService';
import {
  formatFullName,
  formatPhoneNumber,
  validateBrazilianMobilePhone,
  validateEmail,
  normalizeAccessCredential,
} from '../utils/textFormatters';

interface SelfRegistrationScreenProps {
  theme?: ReadingTheme;
  onBackToLogin: () => void;
  onNavigateToAdmin?: () => void;
}

export const SelfRegistrationScreen: React.FC<SelfRegistrationScreenProps> = ({
  theme = 'cream',
  onBackToLogin,
  onNavigateToAdmin,
}) => {
  const secretClickCountRef = useRef<number>(0);
  const lastSecretClickTimeRef = useRef<number>(0);

  const handleLogoSecretClick = () => {
    if (!onNavigateToAdmin) return;
    const now = Date.now();
    if (now - lastSecretClickTimeRef.current > 1500) {
      secretClickCountRef.current = 1;
    } else {
      secretClickCountRef.current += 1;
    }
    lastSecretClickTimeRef.current = now;

    if (secretClickCountRef.current >= 5) {
      secretClickCountRef.current = 0;
      onNavigateToAdmin();
    }
  };
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedReaderName, setCompletedReaderName] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const nameValidation = useMemo(() => {
    const clean = fullName.trim();
    if (!clean || clean.length < 3) {
      return { isValid: false, error: 'Informe seu nome completo.' };
    }
    if (clean.split(/\s+/).length < 2) {
      return { isValid: false, error: 'Informe nome e sobrenome.' };
    }
    return { isValid: true };
  }, [fullName]);

  const emailValidation = useMemo(() => {
    if (!email.trim()) return { isValid: true, normalized: '' };
    return validateEmail(email);
  }, [email]);

  const phoneValidation = useMemo(() => {
    if (!phone.trim()) return { isValid: true, normalized: '' };
    return validateBrazilianMobilePhone(phone);
  }, [phone]);

  const passwordValidation = useMemo(() => {
    const clean = normalizeAccessCredential(password);
    if (!clean) {
      return { isValid: false, error: 'Crie uma senha pessoal de acesso.' };
    }
    if (clean.length < 6) {
      return { isValid: false, error: 'A senha deve ter no mínimo 6 caracteres.' };
    }
    return { isValid: true };
  }, [password]);

  const confirmValidation = useMemo(() => {
    const cleanPass = normalizeAccessCredential(password);
    const cleanConf = normalizeAccessCredential(confirmPassword);
    if (!cleanConf) {
      return { isValid: false, error: 'Confirme sua senha pessoal.' };
    }
    if (cleanPass !== cleanConf) {
      return { isValid: false, error: 'As senhas digitadas não coincidem.' };
    }
    return { isValid: true };
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });
    setErrorMessage(null);

    const formattedName = formatFullName(fullName);
    setFullName(formattedName);

    if (!formattedName || formattedName.split(/\s+/).length < 2) {
      setErrorMessage('Por favor, informe seu nome completo com nome e sobrenome.');
      return;
    }

    const hasEmail = Boolean(email.trim());
    const hasPhone = Boolean(phone.trim());
    if (!hasEmail && !hasPhone) {
      setErrorMessage('Informe ao menos um meio de contato: E-mail ou WhatsApp.');
      return;
    }

    if (hasEmail && !emailValidation.isValid) {
      setErrorMessage(emailValidation.error || 'O e-mail informado é inválido.');
      return;
    }

    if (hasPhone && !phoneValidation.isValid) {
      setErrorMessage(
        phoneValidation.error || 'O número de WhatsApp deve seguir o formato (DD) 9XXXX-XXXX.'
      );
      return;
    }

    if (!passwordValidation.isValid) {
      setErrorMessage(passwordValidation.error || 'Crie uma senha válida com mínimo de 6 caracteres.');
      return;
    }

    if (!confirmValidation.isValid) {
      setErrorMessage(confirmValidation.error || 'As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    const res = await authService.registerSelfReader({
      fullName: formattedName,
      email: hasEmail ? emailValidation.normalized : undefined,
      phone: hasPhone ? phoneValidation.normalized : undefined,
      password: normalizeAccessCredential(password),
      confirmPassword: normalizeAccessCredential(confirmPassword),
    });
    setIsSubmitting(false);

    if (res.success) {
      setCompletedReaderName(res.readerName || formattedName);
      setSuccessMessage(
        res.message ||
          'Cadastro realizado com sucesso! Seu acesso será liberado em breve pela administração.'
      );
    } else {
      setErrorMessage(
        res.error || 'Não foi possível concluir o cadastro. Verifique os campos e tente novamente.'
      );
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 font-sans ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#FBF8F3] text-stone-800'
      }`}
    >
      <div className="w-full max-w-lg mx-auto my-6">
        <div
          className={`rounded-2xl p-6 sm:p-8 shadow-xl border backdrop-blur-xs transition-all ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-800/80 shadow-black/40'
              : 'bg-white/90 border-stone-200/90 shadow-stone-300/40'
          }`}
        >
          {/* Botão Voltar para Tela de Entrada */}
          <div className="mb-4">
            <button
              type="button"
              onClick={onBackToLogin}
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors py-1.5 px-2.5 rounded-lg cursor-pointer ${
                isDark
                  ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para entrar</span>
            </button>
          </div>

          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <div className="mb-3.5 flex justify-center">
              <button
                type="button"
                onClick={handleLogoSecretClick}
                aria-label="Logotipo Oficial da Biblioteca Digital"
                className="p-0 border-0 bg-transparent rounded-2xl touch-manipulation select-none focus:outline-none cursor-default"
              >
                <img
                  src="/icon.svg"
                  alt="Logotipo Oficial da Biblioteca Digital"
                  width={64}
                  height={64}
                  draggable={false}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-md shadow-stone-900/10 dark:shadow-black/50 border border-stone-200/80 dark:border-zinc-800 object-contain select-none pointer-events-none active:scale-95 transition-transform"
                />
              </button>
            </div>

            <h1
              className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-1.5 ${
                isDark ? 'text-zinc-50' : 'text-stone-900'
              }`}
            >
              Solicitar Acesso de Leitor
            </h1>

            <p
              className={`font-serif text-xs sm:text-sm leading-relaxed max-w-sm mx-auto ${
                isDark ? 'text-zinc-400' : 'text-stone-600'
              }`}
            >
              Preencha seus dados e crie sua senha pessoal. Seu acesso ficará disponível assim que for
              aprovado pela administração.
            </p>
          </div>

          {completedReaderName ? (
            /* Estado de Sucesso / Aguardando Liberação */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div
                className={`p-5 rounded-2xl border text-center space-y-3 ${
                  isDark
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>

                <h2 className="font-serif text-lg font-bold">
                  Cadastro Realizado com Sucesso!
                </h2>

                <p className="text-xs sm:text-sm leading-relaxed">
                  Obrigado, <strong className="font-semibold">{completedReaderName}</strong>!{' '}
                  {successMessage}
                </p>

                <div
                  className={`mt-2 p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs ${
                    isDark
                      ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="leading-relaxed">
                    <strong>Status atual: Pendente de Aprovação.</strong> Após a liberação pela
                    administração, utilize a senha pessoal que você criou para entrar na biblioteca.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onBackToLogin}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  isDark
                    ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-50'
                }`}
              >
                <span>Ir para a Tela de Entrada</span>
              </button>
            </div>
          ) : (
            /* Formulário de Auto-Cadastro */
            <>
              {errorMessage && (
                <div
                  role="alert"
                  className={`p-3.5 rounded-xl mb-5 flex items-start gap-2.5 text-xs animate-in fade-in duration-200 border ${
                    isDark
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Nome Completo */}
                <div>
                  <label
                    htmlFor="self-reg-name"
                    className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-stone-700'
                    }`}
                  >
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                        isDark ? 'text-zinc-500' : 'text-stone-400'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="self-reg-name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Ex: Maria Clara de Souza"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, fullName: true }));
                        if (fullName.trim()) {
                          setFullName(formatFullName(fullName));
                        }
                      }}
                      disabled={isSubmitting}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                        isDark
                          ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                          : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                      } ${
                        touched.fullName && !nameValidation.isValid
                          ? 'border-rose-400 dark:border-rose-500'
                          : ''
                      }`}
                    />
                  </div>
                  {touched.fullName && !nameValidation.isValid && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      {nameValidation.error}
                    </p>
                  )}
                </div>

                {/* E-mail e WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="self-reg-email"
                      className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${
                        isDark ? 'text-zinc-300' : 'text-stone-700'
                      }`}
                    >
                      E-mail
                    </label>
                    <div className="relative">
                      <div
                        className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                          isDark ? 'text-zinc-500' : 'text-stone-400'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="self-reg-email"
                        type="email"
                        autoComplete="email"
                        placeholder="voce@exemplo.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                          isDark
                            ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                            : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                        } ${
                          touched.email && email.trim() && !emailValidation.isValid
                            ? 'border-rose-400 dark:border-rose-500'
                            : ''
                        }`}
                      />
                    </div>
                    {touched.email && email.trim() && !emailValidation.isValid && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                        {emailValidation.error}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="self-reg-phone"
                      className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${
                        isDark ? 'text-zinc-300' : 'text-stone-700'
                      }`}
                    >
                      WhatsApp
                    </label>
                    <div className="relative">
                      <div
                        className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                          isDark ? 'text-zinc-500' : 'text-stone-400'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="self-reg-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(19) 99999-9999"
                        maxLength={15}
                        value={phone}
                        onChange={(e) => {
                          setPhone(formatPhoneNumber(e.target.value));
                          if (errorMessage) setErrorMessage(null);
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-hidden ${
                          isDark
                            ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                            : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                        } ${
                          touched.phone && phone.trim() && !phoneValidation.isValid
                            ? 'border-rose-400 dark:border-rose-500'
                            : ''
                        }`}
                      />
                    </div>
                    {touched.phone && phone.trim() && !phoneValidation.isValid && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                        {phoneValidation.error}
                      </p>
                    )}
                  </div>
                </div>

                <p className={`text-[11px] -mt-1 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                  Preencha seu E-mail, seu WhatsApp ou ambos para identificação pela administração.
                </p>

                {/* Senha Pessoal */}
                <div>
                  <label
                    htmlFor="self-reg-password"
                    className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-stone-700'
                    }`}
                  >
                    Crie sua Senha Pessoal <span className="text-rose-500">*</span>
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
                      id="self-reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Mínimo de 6 caracteres"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                      disabled={isSubmitting}
                      className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                        isDark
                          ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                          : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                      } ${
                        touched.password && !passwordValidation.isValid
                          ? 'border-rose-400 dark:border-rose-500'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className={`absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer ${
                        isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-stone-400 hover:text-stone-700'
                      }`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.password && !passwordValidation.isValid && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      {passwordValidation.error}
                    </p>
                  )}
                </div>

                {/* Confirmar Senha */}
                <div>
                  <label
                    htmlFor="self-reg-confirm-password"
                    className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-stone-700'
                    }`}
                  >
                    Confirmar Senha <span className="text-rose-500">*</span>
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
                      id="self-reg-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Repita a senha criada"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                      disabled={isSubmitting}
                      className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                        isDark
                          ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                          : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                      } ${
                        touched.confirmPassword && !confirmValidation.isValid
                          ? 'border-rose-400 dark:border-rose-500'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                      className={`absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer ${
                        isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-stone-400 hover:text-stone-700'
                      }`}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.confirmPassword && !confirmValidation.isValid && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      {confirmValidation.error}
                    </p>
                  )}
                </div>

                {/* Nota de aprovação editorial */}
                <div
                  className={`p-3 rounded-xl flex items-start gap-2.5 text-[11px] leading-relaxed border ${
                    isDark
                      ? 'bg-zinc-800/40 border-zinc-800 text-zinc-400'
                      : 'bg-stone-50 border-stone-200/80 text-stone-600'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    Sua senha é criptografada no servidor. Após o envio, seu cadastro ficará com
                    status pendente até a liberação pela administração.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    isDark
                      ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-50'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando cadastro...</span>
                    </>
                  ) : (
                    <span>Criar Cadastro e Solicitar Acesso</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
