import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageCircle,
  Sparkles,
  Send,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Wand2,
  Heart,
  Smile,
  ExternalLink,
  Loader2,
  HelpCircle,
  Clock,
  Phone,
  BookmarkCheck,
  Megaphone,
  MessageSquareQuote,
  Star,
  Coffee,
} from 'lucide-react';
import { ReaderAccessRecord, Book } from '../types/book';
import { libraryBooks } from '../data/booksCatalog';
import { adminAuthService } from '../services/adminAuthService';

interface ReaderWhatsAppAssistantProps {
  reader: ReaderAccessRecord;
  isDark?: boolean;
}

type ReadyModelType = 'new_chapter' | 'feedback' | 'welcome' | 'encouragement' | 'reminder';

interface HistoryDraft {
  id: string;
  type: string;
  title: string;
  text: string;
  timestamp: string;
  isAiGenerated?: boolean;
}

/**
 * Sanitiza e normaliza texto em UTF-8 estrito:
 * - Normaliza caracteres Unicode para a forma canônica NFC (preserva acentuação e emojis compostos)
 * - Garante string bem-formada (elimina surrogates UTF-16 isolados que quebram encodeURIComponent e URLs)
 * - Remove caracteres de substituição corrompidos (\uFFFD / ), BOM (\uFEFF) e bytes nulos
 * - Normaliza quebras de linha para \n simples (evita \r\n que gera %0D%0A e corrompe o layout no WhatsApp Web)
 * - Corrige mojibakes clássicos causados por conversões ISO-8859-1 -> UTF-8
 * - Remove cercas de código markdown caso a IA as inclua
 */
export function sanitizeWhatsAppText(raw: string): string {
  if (!raw) return '';
  let text = String(raw);

  // 1. Normalização Unicode canônica NFC
  if (typeof text.normalize === 'function') {
    text = text.normalize('NFC');
  }

  // 2. String bem-formada (evita URIError: URI malformed em encodeURIComponent)
  if (typeof (text as any).toWellFormed === 'function') {
    text = (text as any).toWellFormed();
  } else {
    text = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  }

  // 3. Remove caracteres corrompidos, de substituição Unicode e marcadores invisíveis
  text = text.replace(/\uFFFD/g, '').replace(/\uFEFF/g, '').replace(/\0/g, '');

  // 4. Normaliza quebras de linha para \n simples (WhatsApp)
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 5. Correção de mojibake comum em navegadores com charset legado
  const mojibakeReplacements: [RegExp, string][] = [
    [/Ã£/g, 'ã'], [/Ã¡/g, 'á'], [/Ã /g, 'à'], [/Ã¢/g, 'â'],
    [/Ã©/g, 'é'], [/Ãª/g, 'ê'], [/Ã­/g, 'í'],
    [/Ã³/g, 'ó'], [/Ã´/g, 'ô'], [/Ãµ/g, 'õ'],
    [/Ãº/g, 'ú'], [/Ã§/g, 'ç'],
    [/Ãƒ/g, 'Ã'], [/Ã/g, 'Á'], [/Ã€/g, 'À'], [/Ã‚/g, 'Â'],
    [/Ã‰/g, 'É'], [/ÃŠ/g, 'Ê'], [/Ã/g, 'Í'],
    [/Ã“/g, 'Ó'], [/Ã”/g, 'Ô'], [/Ã•/g, 'Õ'],
    [/Ãš/g, 'Ú'], [/Ã‡/g, 'Ç'],
    [/â€“/g, '–'], [/â€”/g, '—'],
    [/â€˜/g, '‘'], [/â€™/g, '’'],
    [/â€œ/g, '“'], [/â€/g, '”'],
    [/Â /g, ' '],
  ];

  for (const [regex, replacement] of mojibakeReplacements) {
    text = text.replace(regex, replacement);
  }

  // 6. Remove cercas de código markdown acidentais
  text = text
    .replace(/^```[a-zA-Z]*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  return text;
}

/**
 * Função resiliente para copiar texto para a área de transferência:
 * Suporta tanto navigator.clipboard moderno quanto fallback seguro via document.execCommand
 * para compatibilidade total em iframes e navegadores restritos.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const clean = sanitizeWhatsAppText(text);

  if (navigator?.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(clean);
      return true;
    } catch (err) {
      console.warn('[copyTextToClipboard] navigator.clipboard falhou, utilizando fallback:', err);
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = clean;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, clean.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('[copyTextToClipboard] Falha no fallback de cópia:', err);
    return false;
  }
}

/**
 * Formata o número internacional para o link wa.me:
 * Remove caracteres especiais, remove zero inicial de DDD e garante DDI 55 do Brasil.
 */
export function getFullWhatsAppPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export const ReaderWhatsAppAssistant: React.FC<ReaderWhatsAppAssistantProps> = ({
  reader,
  isDark = false,
}) => {
  // 1. Extração do nome e telefone do leitor
  const fullName = reader.profile?.fullName || reader.name || 'Leitor';
  const firstName = useMemo(() => {
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || fullName;
  }, [fullName]);

  const rawPhone = reader.profile?.phone || '';
  const cleanPhone = useMemo(() => {
    const digits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
    return digits;
  }, [rawPhone]);
  const [manualPhone, setManualPhone] = useState<string>('');

  // 2. Livro e Capítulo Selecionados
  const [selectedBookId, setSelectedBookId] = useState<string>(
    libraryBooks[0]?.id || 'entre-a-cruz-e-o-mundo'
  );

  const selectedBook = useMemo(() => {
    return libraryBooks.find((b) => b.id === selectedBookId) || libraryBooks[0];
  }, [selectedBookId]);

  const [selectedChapterId, setSelectedChapterId] = useState<string>(() => {
    const firstCh = selectedBook?.chapters[0];
    return firstCh?.id || 'capitulo-1';
  });

  // Atualiza capítulo padrão ao mudar o livro
  useEffect(() => {
    if (selectedBook && selectedBook.chapters.length > 0) {
      const exists = selectedBook.chapters.some((c) => c.id === selectedChapterId);
      if (!exists) {
        setSelectedChapterId(selectedBook.chapters[0].id);
      }
    }
  }, [selectedBookId, selectedBook, selectedChapterId]);

  const selectedChapter = useMemo(() => {
    return selectedBook?.chapters.find((c) => c.id === selectedChapterId) || selectedBook?.chapters[0];
  }, [selectedBook, selectedChapterId]);

  const chapterLabel = selectedChapter
    ? selectedChapter.romanNumber || `Capítulo ${selectedChapter.number}`
    : 'Capítulo';
  const chapterFullTitle = selectedChapter
    ? `${chapterLabel}${selectedChapter.title ? ` · ${selectedChapter.title}` : ''}`
    : 'Capítulo Atual';

  // 3. Modelos Prontos e Dinâmicos
  const buildDynamicMessage = (type: ReadyModelType): string => {
    const bookTitle = selectedBook?.title || 'Entre a Cruz e o Mundo';

    let rawTemplate = '';
    switch (type) {
      case 'new_chapter':
        rawTemplate = `Olá, ${firstName}! 👋 Aqui é o Pr. Fernando Veiga.\n\nPassando para avisar que o *${chapterFullTitle}* do livro *${bookTitle}* já está liberado para você na nossa Biblioteca Digital! 📖✨\n\nPreparei esse trecho com muito carinho e oração. Quando puder ler, que Deus fale profundamente ao seu coração.\n\nUm grande abraço fraterno,\n*Pr. Fernando Veiga* 🙏`;
        break;

      case 'feedback':
        rawTemplate = `Olá, ${firstName}, tudo bem? Aqui é o Pr. Fernando Veiga.\n\nGostaria muito de saber como tem sido sua experiência com a leitura de *${bookTitle}*, especialmente o *${chapterFullTitle}*! ☕📖\n\nAlgum ponto ou reflexão falou de forma marcante ao seu coração até agora? Ficarei muito feliz em ouvir suas impressões quando tiver um tempinho!\n\nQue Deus abençoe sua caminhada,\n*Pr. Fernando Veiga* 💛`;
        break;

      case 'welcome':
        rawTemplate = `Olá, ${firstName}! Que alegria imensa ter você conosco na nossa Biblioteca Digital! Seja muito bem-vindo(a)! 🌟\n\nSeu acesso já está liberado para ler a obra *${bookTitle}*. Minha oração sincera é que cada página seja um instrumento de paz, sabedoria e renovo espiritual para a sua vida.\n\nQualquer dúvida sobre a leitura, pode me chamar por aqui!\n\nCom carinho e oração,\n*Pr. Fernando Veiga* 🙏✨`;
        break;

      case 'encouragement':
        rawTemplate = `Olá, ${firstName}! Passando para desejar um dia abençoado e lembrar que Deus cuida com amor de cada detalhe da sua história. 💛\n\nQue a leitura de *${bookTitle}* traga paz, renovo e esperança para a sua semana. Conte sempre com minhas orações por sua vida e família!\n\nUm fraterno abraço,\n*Pr. Fernando Veiga* 🙏`;
        break;

      case 'reminder':
        rawTemplate = `Olá, ${firstName}, como você está? Passando carinhosamente para lembrar que o *${chapterFullTitle}* de *${bookTitle}* está te esperando na Biblioteca Digital para aquele momento especial de pausa e edificação espiritual. 📖🌿\n\nTenha uma excelente leitura!\n\nAbraço fraterno,\n*Pr. Fernando Veiga*`;
        break;

      default:
        rawTemplate = '';
    }

    return sanitizeWhatsAppText(rawTemplate);
  };

  // 4. Estado da Mensagem Atual
  const [activeModel, setActiveModel] = useState<ReadyModelType | 'custom'>('new_chapter');
  const [messageText, setMessageText] = useState<string>(() => buildDynamicMessage('new_chapter'));
  const [copied, setCopied] = useState<boolean>(false);

  // 5. Chat Livre com IA
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [historyDrafts, setHistoryDrafts] = useState<HistoryDraft[]>([]);

  // Atualiza mensagem quando o livro, capítulo ou modelo pronto mudam (se não for personalizada por IA)
  const handleSelectModel = (type: ReadyModelType) => {
    setActiveModel(type);
    const newMsg = buildDynamicMessage(type);
    setMessageText(newMsg);
  };

  // 6. Chamada à IA Gemini para Redação Personalizada
  const handleGenerateAiMessage = async (customInstruction?: string) => {
    const promptToSend = (customInstruction || aiPrompt).trim();
    if (!promptToSend && !customInstruction) return;

    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const res = await adminAuthService.generateWhatsAppMessage({
        readerName: fullName,
        readerPhone: cleanPhone,
        bookTitle: selectedBook?.title || 'Entre a Cruz e o Mundo',
        chapterTitle: chapterFullTitle,
        prompt: promptToSend,
        messageType: 'custom',
      });

      if (res.success && res.message) {
        const cleanAiMessage = sanitizeWhatsAppText(res.message);
        setMessageText(cleanAiMessage);
        setActiveModel('custom');

        // Adiciona ao histórico de rascunhos desta sessão
        const newDraft: HistoryDraft = {
          id: String(Date.now()),
          type: 'IA Personalizada',
          title: promptToSend.slice(0, 45) + (promptToSend.length > 45 ? '...' : ''),
          text: cleanAiMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAiGenerated: true,
        };
        setHistoryDrafts((prev) => [newDraft, ...prev.slice(0, 5)]);
        setAiPrompt('');
      } else {
        setAiError(res.error || 'Não foi possível gerar a mensagem personalizada com a IA.');
      }
    } catch (err: any) {
      setAiError(err?.message || 'Erro de conexão ao solicitar mensagem para a IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 7. Envio para o WhatsApp com montagem direta oficial (evita bug de redirecionador do wa.me)
  const handleOpenWhatsApp = async (preferredTarget: 'direct_api' | 'web_direct' = 'direct_api') => {
    const targetPhone = cleanPhone || manualPhone;
    const fullPhone = getFullWhatsAppPhone(targetPhone);
    if (!fullPhone) {
      alert('Por favor, informe o número de WhatsApp do leitor para abrir a conversa.');
      return;
    }

    // 1. Sanitiza texto em UTF-8 canônico perfeito
    const cleanMessage = sanitizeWhatsAppText(messageText);
    setMessageText(cleanMessage);

    // 2. Copia automaticamente para a área de transferência do autor (salvaguarda definitiva contra o bug do WhatsApp Web)
    await copyTextToClipboard(cleanMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3500);

    // 3. Monta o link utilizando o endpoint oficial direto da API da Meta ou WhatsApp Web direto
    // Isso evita o salto duplo de redirecionamento HTTP 302 do "wa.me" que corrompe emojis em navegadores desktop
    const encodedMessage = encodeURIComponent(cleanMessage);
    const url =
      preferredTarget === 'web_direct'
        ? `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedMessage}`
        : `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedMessage}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 8. Copiar Mensagem com sanitização e fallback seguro
  const handleCopyMessage = async () => {
    const cleanMessage = sanitizeWhatsAppText(messageText);
    setMessageText(cleanMessage);

    const success = await copyTextToClipboard(cleanMessage);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      // Caso ocorra alguma restrição extrema do navegador
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Ideias e sugestões rápidas para o autor clicar
  const promptSuggestions = [
    'Convidar para ler as perguntas de reflexão',
    'Palavra carinhosa de ânimo e oração',
    'Mensagem acolhedora de aniversário',
    'Perguntar se teve alguma dúvida no capítulo',
  ];

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all space-y-4 ${
        isDark
          ? 'bg-zinc-900/90 border-emerald-900/40 shadow-emerald-950/20'
          : 'bg-emerald-50/40 border-emerald-200/70 shadow-xs'
      }`}
    >
      {/* CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-emerald-200/50 dark:border-emerald-900/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-serif font-bold text-sm sm:text-base text-stone-900 dark:text-zinc-50">
                Mensagens Inteligentes para o WhatsApp
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                IA Pastoral
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-zinc-400 font-sans mt-0.5">
              Modelos automáticos e redação com IA para interação humana e carinhosa do Pr. Fernando Veiga com o leitor.
            </p>
          </div>
        </div>

        {cleanPhone && (
          <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 self-start sm:self-center">
            {reader.profile?.phoneFormatted || cleanPhone}
          </span>
        )}
      </div>

      {/* SELETORES DE CONTEXTO: LIVRO E CAPÍTULO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white/70 dark:bg-zinc-800/60 border border-emerald-200/60 dark:border-zinc-700">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 mb-1">
            Livro Selecionado
          </label>
          <div className="relative">
            <select
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                const book = libraryBooks.find((b) => b.id === e.target.value);
                if (book && book.chapters.length > 0) {
                  setSelectedChapterId(book.chapters[0].id);
                }
              }}
              className="w-full text-xs font-serif font-semibold rounded-lg py-1.5 px-2.5 border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:outline-emerald-500 cursor-pointer"
            >
              {libraryBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 mb-1">
            Capítulo Selecionado
          </label>
          <select
            value={selectedChapterId}
            onChange={(e) => setSelectedChapterId(e.target.value)}
            className="w-full text-xs font-serif font-semibold rounded-lg py-1.5 px-2.5 border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:outline-emerald-500 cursor-pointer"
          >
            {selectedBook?.chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.romanNumber || `Capítulo ${ch.number}`} — {ch.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MODELOS PRONTOS E DINÂMICOS */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 block">
          Modelos Prontos & Dinâmicos (Preenchimento Automático)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'new_chapter' as ReadyModelType, label: 'Avisar sobre novo capítulo', Icon: Megaphone },
            { id: 'feedback' as ReadyModelType, label: 'Pedir feedback da leitura', Icon: MessageSquareQuote },
            { id: 'welcome' as ReadyModelType, label: 'Boas-vindas à Biblioteca', Icon: Star },
            { id: 'encouragement' as ReadyModelType, label: 'Palavra de Encorajamento', Icon: Heart },
            { id: 'reminder' as ReadyModelType, label: 'Lembrete Carinhoso', Icon: Coffee },
          ].map((m) => {
            const isSelected = activeModel === m.id;
            const IconComponent = m.Icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectModel(m.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 border border-stone-200 dark:border-zinc-700 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300'
                }`}
              >
                <IconComponent
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CAMPO DE CHAT LIVRE COM IA (GEMINI) */}
      <div className="p-3.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-stone-900 dark:text-zinc-100 font-serif">
              Redação Livre com IA (Sob Demanda)
            </span>
          </div>
          <span className="text-[10px] text-stone-400 dark:text-zinc-500">
            Personalize com o tom do Pr. Fernando Veiga
          </span>
        </div>

        {/* Input de Chat Livre */}
        <div className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isGeneratingAi && aiPrompt.trim()) {
                e.preventDefault();
                handleGenerateAiMessage();
              }
            }}
            placeholder={`Ex: Escreva uma mensagem carinhosa convidando ${firstName} para refletir sobre o capítulo 1...`}
            className="flex-1 text-xs rounded-xl px-3 py-2 border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-amber-500"
            disabled={isGeneratingAi}
          />
          <button
            type="button"
            onClick={() => handleGenerateAiMessage()}
            disabled={isGeneratingAi || !aiPrompt.trim()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
            title="Pedir para a IA redigir a mensagem agora"
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Redigindo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pedir à IA</span>
              </>
            )}
          </button>
        </div>

        {/* Sugestões rápidas de prompt */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-semibold text-stone-400 dark:text-zinc-500">
            Ideias rápidas:
          </span>
          {promptSuggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleGenerateAiMessage(sug)}
              disabled={isGeneratingAi}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-zinc-700/60 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer border border-stone-200/60 dark:border-zinc-600"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Mensagem de Erro se houver */}
        {aiError && (
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300">
            {aiError}
          </div>
        )}
      </div>

      {/* ÁREA DE PRÉ-VISUALIZAÇÃO E EDIÇÃO DA MENSAGEM */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Texto Pronto para o WhatsApp (Editável pelo Autor)</span>
          </label>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 font-sans">
              <Check className="w-2.5 h-2.5 text-emerald-500" />
              UTF-8 Limpo · Emojis Preservados
            </span>
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono">
              {messageText.length} caracteres
            </span>
          </div>
        </div>

        {/* Textarea estilizado com balão do WhatsApp */}
        <div className="relative rounded-2xl border border-emerald-300/80 dark:border-emerald-800/60 bg-[#EFEAE2]/50 dark:bg-[#121B22] p-3 shadow-inner">
          <textarea
            rows={7}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onBlur={() => setMessageText((prev) => sanitizeWhatsAppText(prev))}
            className="w-full text-xs font-sans leading-relaxed bg-white dark:bg-[#1F2C34] text-stone-900 dark:text-zinc-100 p-3 rounded-xl border border-stone-200/80 dark:border-zinc-700 focus:outline-emerald-500 resize-y shadow-xs"
            placeholder="Digite ou edite a mensagem que será enviada pelo WhatsApp..."
          />
        </div>

        {/* Refinamentos Rápidos com IA */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-stone-400 dark:text-zinc-500 text-[10px]">Refinar com IA:</span>
            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={() => handleGenerateAiMessage('Reescreva a mensagem deixando-a mais curta e direta para o WhatsApp')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 text-stone-600 dark:text-zinc-300 cursor-pointer text-[10px]"
            >
              Mais curta
            </button>
            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={() => handleGenerateAiMessage('Reescreva a mensagem com um tom ainda mais caloroso, afetuoso e acolhedor')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 text-stone-600 dark:text-zinc-300 cursor-pointer text-[10px]"
            >
              Mais calorosa
            </button>
            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={() => handleGenerateAiMessage('Adicione à mensagem uma breve pergunta reflexiva incentivando a responder')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 text-stone-600 dark:text-zinc-300 cursor-pointer text-[10px]"
            >
              Incentivar resposta
            </button>
          </div>

          {/* Histórico rápido de rascunhos */}
          {historyDrafts.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-stone-400 dark:text-zinc-500">Rascunhos:</span>
              {historyDrafts.slice(0, 3).map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setMessageText(sanitizeWhatsAppText(d.text))}
                  className="px-1.5 py-0.5 rounded-sm text-[10px] bg-stone-200 dark:bg-zinc-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-stone-700 dark:text-zinc-200 cursor-pointer"
                  title={d.title}
                >
                  #{i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SE O LEITOR NÃO TIVER TELEFONE CADASTRADO */}
      {!cleanPhone && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Este leitor ainda não cadastrou o WhatsApp. Digite o número para abrir a conversa:</span>
          </div>
          <input
            type="tel"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="Ex: (11) 99999-9999"
            className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 max-w-xs"
          />
        </div>
      )}

      {/* BOTÕES DE AÇÃO: ENVIAR NO WHATSAPP & COPIAR */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="text-[11px] text-stone-500 dark:text-zinc-400">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">💡 Dica de Envio:</span> Ao clicar, o texto é copiado automaticamente. Se o WhatsApp Web no PC apresentar qualquer interrogação no campo, basta pressionar <kbd className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-zinc-700 font-mono text-[10px] text-stone-800 dark:text-zinc-200 font-bold">Ctrl+V</kbd> (Colar).
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Botão Copiar */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            {/* Botão Abrir WhatsApp Direto */}
            <button
              type="button"
              onClick={() => handleOpenWhatsApp('direct_api')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer"
              title="Abre o WhatsApp oficial sem passar pelo redirecionador do wa.me"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
              <ExternalLink className="w-3 h-3 opacity-75" />
            </button>

            {/* Atalho direto para WhatsApp Web (Desktop) */}
            <button
              type="button"
              onClick={() => handleOpenWhatsApp('web_direct')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 transition-all cursor-pointer"
              title="Abre diretamente na aba do WhatsApp Web no navegador"
            >
              <span>Versão Web</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
