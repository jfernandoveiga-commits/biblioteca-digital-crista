import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  User,
  Phone,
  Calendar,
  Clock,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import {
  ReadingTheme,
  ReaderGender,
  ReaderMaritalStatus,
  ReaderProfileUpdateInput,
  ReaderProfile,
} from '../types/book';
import {
  formatFullName,
  formatPhoneNumber,
  validateBrazilianMobilePhone,
  calculateDetailedAge,
  standardizePin,
} from '../utils/textFormatters';
import { authService } from '../services/authService';

interface ReaderRegistrationScreenProps {
  theme?: ReadingTheme;
  initialName?: string;
  onRegistrationSuccess: (profile: ReaderProfile) => void;
  onLogout: () => void;
}

const GENDER_OPTIONS: ReaderGender[] = [
  'Feminino',
  'Masculino',
  'Prefiro não informar',
];

const MARITAL_STATUS_OPTIONS: ReaderMaritalStatus[] = [
  'Solteiro(a)',
  'Casado(a)',
  'União estável',
  'Separado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'Prefiro não informar',
];

export const ReaderRegistrationScreen: React.FC<ReaderRegistrationScreenProps> = ({
  theme = 'cream',
  initialName = '',
  onRegistrationSuccess,
  onLogout,
}) => {
  // Campos do formulário - iniciam totalmente em branco
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [gender, setGender] = useState<ReaderGender | ''>('');
  const [maritalStatus, setMaritalStatus] = useState<ReaderMaritalStatus | ''>('');

  // Estados de controle e validação
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCelebration, setSuccessCelebration] = useState<ReaderProfile | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Cálculo automático de idade a partir da data de nascimento (campo fica em branco até a data ser preenchida)
  const ageDetail = useMemo(() => {
    if (!birthDate) {
      return {
        formatted: '',
        isValid: false,
        years: 0,
        months: 0,
        days: 0,
      };
    }
    return calculateDetailedAge(birthDate);
  }, [birthDate]);

  // Validação dinâmica do telefone
  const phoneValidation = useMemo(() => {
    if (!phone) {
      return { isValid: false, normalized: '', error: 'Campo obrigatório' };
    }
    return validateBrazilianMobilePhone(phone);
  }, [phone]);

  // Validação dinâmica do nome
  const nameValidation = useMemo(() => {
    const clean = fullName.trim();
    if (!clean) return { isValid: false, error: 'O nome completo é obrigatório.' };
    const parts = clean.split(/\s+/);
    if (parts.length < 2) {
      return { isValid: false, error: 'Informe nome e sobrenome.' };
    }
    return { isValid: true };
  }, [fullName]);

  // Manipulador de digitação do telefone celular (com máscara automática em tempo real)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    if (errorMessage) setErrorMessage(null);
  };

  // Manipulador de digitação do nome (formata automaticamente ao sair do campo ou durante digitação)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value);
    if (errorMessage) setErrorMessage(null);
  };

  const handleNameBlur = () => {
    setTouched((prev) => ({ ...prev, fullName: true }));
    if (fullName.trim()) {
      const formatted = formatFullName(fullName);
      setFullName(formatted);
    }
  };

  // Data máxima para o seletor de nascimento (hoje)
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      phone: true,
      birthDate: true,
      gender: true,
      maritalStatus: true,
    });

    // Formata o nome antes de validar e enviar
    const formattedName = formatFullName(fullName);
    setFullName(formattedName);

    if (!formattedName || formattedName.split(/\s+/).length < 2) {
      setErrorMessage('Por favor, informe seu nome completo com sobrenome.');
      return;
    }

    if (!phoneValidation.isValid) {
      setErrorMessage(
        phoneValidation.error ||
          'Por favor, informe um telefone celular brasileiro válido com DDD.'
      );
      return;
    }

    if (!birthDate) {
      setErrorMessage('Por favor, selecione sua data de nascimento.');
      return;
    }

    if (!ageDetail.isValid) {
      setErrorMessage(ageDetail.error || 'A data de nascimento informada é inválida.');
      return;
    }

    if (!gender) {
      setErrorMessage('Por favor, selecione seu sexo.');
      return;
    }

    if (!maritalStatus) {
      setErrorMessage('Por favor, selecione seu estado civil.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: ReaderProfileUpdateInput = {
      fullName: formattedName,
      phone: phoneValidation.normalized,
      birthDate,
      gender: gender as ReaderGender,
      maritalStatus: maritalStatus as ReaderMaritalStatus,
    };

    const res = await authService.registerProfile(payload);
    setIsSubmitting(false);

    if (res.success && res.profile) {
      // Exibe breve celebração antes de avançar para a biblioteca
      setSuccessCelebration(res.profile);
      setTimeout(() => {
        onRegistrationSuccess(res.profile!);
      }, 1500);
    } else {
      setErrorMessage(
        res.error || 'Ocorreu um erro ao salvar o cadastro. Verifique os dados e tente novamente.'
      );
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 font-sans ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#FBF8F3] text-stone-800'
      }`}
    >
      <div className="w-full max-w-xl mx-auto my-6">
        <div
          className={`rounded-2xl p-6 sm:p-9 shadow-xl border backdrop-blur-xs transition-all ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-800/80 shadow-black/40'
              : 'bg-white/90 border-stone-200/90 shadow-stone-300/40'
          }`}
        >
          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <div
              className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3.5 transition-transform duration-300 ${
                isDark
                  ? 'bg-zinc-800/80 text-amber-400 border border-zinc-700/60 shadow-inner'
                  : 'bg-stone-100 text-stone-700 border border-stone-200 shadow-xs'
              }`}
            >
              <BookOpen className="w-6 h-6 stroke-[1.75]" />
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase mb-2 ${
                isDark
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              Primeiro Acesso
            </span>

            <h1
              className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${
                isDark ? 'text-zinc-50' : 'text-stone-900'
              }`}
            >
              Cadastro do Leitor
            </h1>

            <p
              className={`text-xs sm:text-sm leading-relaxed max-w-md mx-auto ${
                isDark ? 'text-zinc-400' : 'text-stone-600'
              }`}
            >
              Seu PIN foi validado com sucesso! Preencha seus dados pessoais uma única vez para
              liberar seu acesso completo à Biblioteca Digital.
            </p>
          </div>

          {/* Feedback de Celebração de Sucesso */}
          {successCelebration && (
            <div
              className={`p-4 rounded-xl mb-6 text-center animate-in zoom-in-95 duration-200 border ${
                isDark
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-serif font-bold text-base">
                Cadastro Concluído com Sucesso!
              </h3>
              <p className="text-xs mt-1">
                Bem-vindo(a), <span className="font-semibold">{successCelebration.fullName}</span>!
                Abrindo a Biblioteca Digital...
              </p>
            </div>
          )}

          {/* Mensagem de Erro Geral */}
          {errorMessage && (
            <div
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

          {/* Formulário de Cadastro */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
            {/* 1. NOME COMPLETO */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="reader-name"
                  className={`block text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-zinc-300' : 'text-stone-700'
                  }`}
                >
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
              </div>

              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                    isDark ? 'text-zinc-500' : 'text-stone-400'
                  }`}
                >
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reader-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  disabled={isSubmitting || Boolean(successCelebration)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                    isDark
                      ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                      : 'bg-white border-stone-300 text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
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

            {/* 2. TELEFONE CELULAR (WHATSAPP) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="reader-phone"
                  className={`block text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-zinc-300' : 'text-stone-700'
                  }`}
                >
                  Telefone Celular / WhatsApp <span className="text-rose-500">*</span>
                </label>
              </div>

              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                    isDark ? 'text-zinc-500' : 'text-stone-400'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="reader-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  disabled={isSubmitting || Boolean(successCelebration)}
                  maxLength={15}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-hidden ${
                    isDark
                      ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                      : 'bg-white border-stone-300 text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                  } ${
                    touched.phone && !phoneValidation.isValid
                      ? 'border-rose-400 dark:border-rose-500'
                      : ''
                  }`}
                />
              </div>

              {touched.phone && !phoneValidation.isValid && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                  {phoneValidation.error}
                </p>
              )}
            </div>

            {/* 3. DATA DE NASCIMENTO & 4. IDADE CALCULADA AUTOMATICAMENTE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data de Nascimento */}
              <div>
                <label
                  htmlFor="reader-birthdate"
                  className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-stone-700'
                  }`}
                >
                  Data de Nascimento <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                      isDark ? 'text-zinc-500' : 'text-stone-400'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="reader-birthdate"
                    type="date"
                    required
                    max={todayStr}
                    value={birthDate}
                    onChange={(e) => {
                      setBirthDate(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, birthDate: true }))}
                    disabled={isSubmitting || Boolean(successCelebration)}
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden ${
                      isDark
                        ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                        : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                    } ${
                      touched.birthDate && !ageDetail.isValid
                        ? 'border-rose-400 dark:border-rose-500'
                        : ''
                    }`}
                  />
                </div>
                {touched.birthDate && !ageDetail.isValid && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                    {ageDetail.error || 'Data inválida.'}
                  </p>
                )}
              </div>

              {/* Idade calculada (Somente Leitura) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="reader-age"
                    className={`block text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-zinc-300' : 'text-stone-700'
                    }`}
                  >
                    Idade Calculada
                  </label>
                </div>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                      ageDetail.isValid
                        ? 'text-amber-500'
                        : isDark
                        ? 'text-zinc-600'
                        : 'text-stone-400'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    id="reader-age"
                    type="text"
                    readOnly
                    disabled
                    aria-readonly="true"
                    value={ageDetail.formatted}
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm font-medium cursor-not-allowed select-none transition-all ${
                      ageDetail.isValid
                        ? isDark
                          ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                          : 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : isDark
                        ? 'bg-zinc-800/40 border-zinc-700/60 text-zinc-500'
                        : 'bg-stone-100/70 border-stone-200 text-stone-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 5. SEXO & 6. ESTADO CIVIL (Listas de opções rolantes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sexo */}
              <div>
                <label
                  htmlFor="reader-gender"
                  className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-stone-700'
                  }`}
                >
                  Sexo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="reader-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as ReaderGender)}
                    disabled={isSubmitting || Boolean(successCelebration)}
                    className={`w-full pl-3.5 pr-8 py-2.5 rounded-xl border text-sm appearance-none transition-all focus:outline-hidden cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                        : 'bg-white border-stone-300 text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                    }`}
                  >
                    <option value="" disabled className={isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-stone-400'}>
                      Selecione...
                    </option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className={isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-white text-stone-900'}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none ${
                      isDark ? 'text-zinc-500' : 'text-stone-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Estado Civil */}
              <div>
                <label
                  htmlFor="reader-marital"
                  className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-stone-700'
                  }`}
                >
                  Estado Civil <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="reader-marital"
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value as ReaderMaritalStatus)}
                    disabled={isSubmitting || Boolean(successCelebration)}
                    className={`w-full pl-3.5 pr-8 py-2.5 rounded-xl border text-sm appearance-none transition-all focus:outline-hidden cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                        : 'bg-white border-stone-300 text-stone-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
                    }`}
                  >
                    <option value="" disabled className={isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-stone-400'}>
                      Selecione...
                    </option>
                    {MARITAL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className={isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-white text-stone-900'}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none ${
                      isDark ? 'text-zinc-500' : 'text-stone-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso de privacidade e vinculação interna */}
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 text-[11px] leading-relaxed border ${
                isDark
                  ? 'bg-zinc-800/40 border-zinc-800 text-zinc-400'
                  : 'bg-stone-50 border-stone-200/70 text-stone-600'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                Seus dados cadastrais ficam associados ao seu PIN de acesso seguro na Biblioteca
                Digital. Em acessos futuros, a entrada será direta e sem necessidade de novo cadastro.
              </div>
            </div>

            {/* Botão de Envio Principal */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting || Boolean(successCelebration)}
                className={`w-full sm:flex-1 py-3 px-5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  isSubmitting || Boolean(successCelebration)
                    ? 'opacity-60 cursor-not-allowed bg-stone-400 text-white'
                    : isDark
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-amber-500/10 active:scale-[0.99]'
                    : 'bg-stone-900 hover:bg-stone-800 text-white font-semibold shadow-stone-900/10 active:scale-[0.99]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando dados cadastrais...</span>
                  </>
                ) : successCelebration ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Cadastro Concluído!</span>
                  </>
                ) : (
                  <>
                    <span>Concluir Cadastro e Entrar</span>
                  </>
                )}
              </button>

              {/* Botão de Cancelar / Sair */}
              <button
                type="button"
                onClick={onLogout}
                disabled={isSubmitting || Boolean(successCelebration)}
                className={`w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                  isDark
                    ? 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    : 'border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
                title="Encerrar sessão e voltar à tela inicial"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Voltar ao PIN</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
