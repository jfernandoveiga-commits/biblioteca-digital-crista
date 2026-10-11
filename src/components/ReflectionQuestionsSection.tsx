import React, { useState, useEffect, useRef } from 'react';
import { ReadingTheme, FontSizeScale } from '../types/book';
import { BibleReferenceTarget } from '../types/bible';
import { parseBibleReference } from '../services/bibleService';
import {
  getChapterReflections,
  saveReflectionAnswer,
  deleteReflectionAnswer,
} from '../services/reflectionStorageService';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ReflectionQuestionsSectionProps {
  bookId: string;
  chapterId: string;
  questions: string[];
  theme: ReadingTheme;
  fontSize: FontSizeScale;
  onOpenBibleReference?: (target: BibleReferenceTarget) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const ReflectionQuestionsSection: React.FC<ReflectionQuestionsSectionProps> = ({
  bookId,
  chapterId,
  questions,
  theme,
  fontSize,
  onOpenBibleReference,
}) => {
  // Estado das respostas carregadas para este livro/capítulo
  const [answers, setAnswers] = useState<Record<number, string>>({});
  // Itens expandidos (índices das perguntas abertas)
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  // Estado de salvamento individual por pergunta
  const [saveStatuses, setSaveStatuses] = useState<Record<number, SaveStatus>>({});

  // Timers para debouncing de salvamento automático
  const debounceTimersRef = useRef<Record<number, NodeJS.Timeout>>({});

  // Carrega respostas salvas quando o capítulo ou livro mudar
  useEffect(() => {
    const loaded = getChapterReflections(bookId, chapterId, questions.length);
    setAnswers(loaded);
    // Limpa estados de salvamento anteriores
    setSaveStatuses({});
  }, [bookId, chapterId, questions.length]);

  // Alterna expansão de uma pergunta
  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Trata digitação com auto-save debounced
  const handleTextChange = (index: number, newText: string) => {
    // Atualiza estado local imediatamente para a digitação fluida
    setAnswers((prev) => ({
      ...prev,
      [index]: newText,
    }));

    // Sinaliza que está no processo de salvamento
    setSaveStatuses((prev) => ({
      ...prev,
      [index]: 'saving',
    }));

    // Cancela timer anterior se houver
    if (debounceTimersRef.current[index]) {
      clearTimeout(debounceTimersRef.current[index]);
    }

    // Grava com atraso de 600ms após o término da digitação
    debounceTimersRef.current[index] = setTimeout(async () => {
      const success = await saveReflectionAnswer(bookId, chapterId, index, newText);
      setSaveStatuses((prev) => ({
        ...prev,
        [index]: success ? 'saved' : 'error',
      }));

      // Volta para 'idle' após 2.5s caso salvo
      if (success) {
        setTimeout(() => {
          setSaveStatuses((prev) => {
            if (prev[index] === 'saved') {
              return { ...prev, [index]: 'idle' };
            }
            return prev;
          });
        }, 2500);
      }
    }, 600);
  };

  // Exclui resposta de uma pergunta
  const handleDeleteAnswer = async (index: number) => {
    if (debounceTimersRef.current[index]) {
      clearTimeout(debounceTimersRef.current[index]);
    }
    setSaveStatuses((prev) => ({ ...prev, [index]: 'saving' }));
    const success = await deleteReflectionAnswer(bookId, chapterId, index);
    if (success) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      setSaveStatuses((prev) => ({ ...prev, [index]: 'idle' }));
    } else {
      setSaveStatuses((prev) => ({ ...prev, [index]: 'error' }));
    }
  };

  // Renderiza menções bíblicas no texto da pergunta na camada de apresentação
  const renderQuestionText = (text: string) => {
    if (!onOpenBibleReference) return text;
    // Captura referências como "Romanos 12:2", "Salmo 1", "Mateus 5", etc.
    const parts = text.split(/(\b(?:[1-3]\s+)?[A-Za-zÀ-ÿ]+\s+\d+(?::\d+(?:-\d+)?)?\b)/g);
    if (parts.length === 1) return text;

    return parts.map((part, pIdx) => {
      // Testa se este pedaço corresponde a uma referência bíblica
      if (/^[1-3]?\s*[A-Za-zÀ-ÿ]+\s+\d+/i.test(part)) {
        return (
          <button
            key={pIdx}
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              const parsed = await parseBibleReference(part);
              if (parsed) onOpenBibleReference(parsed);
            }}
            className="underline font-semibold decoration-stone-400 hover:decoration-stone-800 text-stone-900 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200 dark:decoration-amber-400/60 dark:hover:decoration-amber-300 cursor-pointer font-inherit inline transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 rounded-xs px-0.5"
            title={`Consultar ${part} na Bíblia Livre`}
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  // Quantidade de perguntas respondidas com texto não-vazio
  const answeredCount = Object.values(answers).filter(
    (text) => text && text.trim().length > 0
  ).length;

  // Estilos temáticos
  const cardBorderClass = {
    paper: 'border-stone-200/90 bg-stone-50/50 hover:border-stone-300',
    cream: 'border-[#DDD5BE] bg-[#F7F1E3]/50 hover:border-[#D1C6AC]',
    sepia: 'border-[#D8C7A8] bg-[#EFE3CD]/50 hover:border-[#CCBA97]',
    dark: 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700',
  }[theme];

  const cardExpandedBg = {
    paper: 'bg-stone-50/90',
    cream: 'bg-[#F5EFE0]/80',
    sepia: 'bg-[#EDE1CC]/80',
    dark: 'bg-zinc-900',
  }[theme];

  const textareaStyles = {
    paper: 'bg-white border-stone-200 text-stone-800 focus:border-stone-400 placeholder:text-stone-400',
    cream: 'bg-[#FAF6EC] border-[#DDD5BE] text-[#292524] focus:border-[#C4B79A] placeholder:text-stone-400',
    sepia: 'bg-[#F5ECD9] border-[#D8C7A8] text-[#3D3025] focus:border-[#BEAA88] placeholder:text-stone-500',
    dark: 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-400 placeholder:text-zinc-400',
  }[theme];

  const questionNumberColor = {
    paper: 'text-stone-600 bg-stone-100 border-stone-300',
    cream: 'text-stone-700 bg-[#EFE9D9] border-[#DDD5C0]',
    sepia: 'text-stone-800 bg-[#E7DBBE] border-[#D8C7AD]',
    dark: 'text-amber-300 bg-zinc-800 border-zinc-700',
  }[theme];

  const fontSizeClasses = {
    sm: 'text-[15.5px] leading-[1.7]',
    md: 'text-[17px] leading-[1.7]',
    lg: 'text-[19px] leading-[1.7]',
    xl: 'text-[21px] leading-[1.7]',
  }[fontSize];

  return (
    <section
      aria-label="Perguntas para Reflexão"
      className="mt-16 sm:mt-24 pt-12 border-t border-stone-200/80 dark:border-zinc-800 max-w-[65ch] mx-auto"
    >
      {/* Cabeçalho da Seção */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 text-stone-600 dark:text-zinc-300 mb-2">
          <HelpCircle className="w-4 h-4 opacity-85 text-stone-500 dark:text-amber-400" />
          <h2 className="text-xs sm:text-sm font-sans font-semibold tracking-[0.2em] uppercase">
            Perguntas para Reflexão
          </h2>
        </div>
        <div className="w-12 h-0.5 bg-stone-300 dark:bg-zinc-700 mx-auto mt-2" />

        {/* Indicador discreto de progresso */}
        <div className="mt-3 flex items-center justify-center gap-2 font-sans text-xs text-stone-500 dark:text-zinc-300">
          <span>
            {answeredCount} de {questions.length} perguntas respondidas
          </span>
          {answeredCount > 0 && (
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 select-none">·</span>
          )}
          {answeredCount === questions.length && (
            <span className="text-stone-700 dark:text-amber-300 font-medium">Todas respondidas</span>
          )}
        </div>
      </div>

      {/* Lista Interativa de Perguntas */}
      <div className="space-y-4">
        {questions.map((question, qIdx) => {
          const isExpanded = expandedIndices.has(qIdx);
          const answerText = answers[qIdx] || '';
          const hasAnswer = answerText.trim().length > 0;
          const status = saveStatuses[qIdx] || 'idle';

          return (
            <div
              key={qIdx}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${cardBorderClass} ${
                isExpanded ? cardExpandedBg : ''
              }`}
            >
              {/* Botão de Toque (Área de Toque >= 44px para Mobile) */}
              <button
                type="button"
                onClick={() => toggleExpand(qIdx)}
                className="w-full text-left p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4 transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-amber-400"
                aria-expanded={isExpanded}
                aria-controls={`reflection-answer-${qIdx}`}
              >
                {/* Número da Pergunta */}
                <span
                  className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border text-xs sm:text-sm font-sans font-semibold flex items-center justify-center transition-colors ${questionNumberColor}`}
                  aria-hidden="true"
                >
                  {qIdx + 1}
                </span>

                {/* Texto da Pergunta */}
                <div className="flex-1 pt-0.5">
                  <p className="font-serif text-base sm:text-lg leading-relaxed text-pretty text-stone-850 dark:text-zinc-100 m-0">
                    {renderQuestionText(question)}
                  </p>

                  {/* Indicador discreto de status quando recolhida */}
                  {!isExpanded && hasAnswer && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-sans text-stone-600 dark:text-zinc-300">
                      <Check className="w-3.5 h-3.5 text-stone-700 dark:text-amber-400" />
                      <span>Respondida</span>
                    </div>
                  )}
                </div>

                {/* Ícone de Expansão/Recolhimento */}
                <div className="shrink-0 pt-1 text-stone-400 hover:text-stone-600 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Área Expandida com Campo de Resposta Pessoal */}
              {isExpanded && (
                <div
                  id={`reflection-answer-${qIdx}`}
                  className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-black/5 dark:border-white/5 font-sans"
                >
                  <label
                    htmlFor={`textarea-reflection-${qIdx}`}
                    className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-2"
                  >
                    Sua reflexão pessoal:
                  </label>

                  <textarea
                    id={`textarea-reflection-${qIdx}`}
                    value={answerText}
                    onChange={(e) => handleTextChange(qIdx, e.target.value)}
                    placeholder="Escreva aqui suas reflexões, respostas ou aprendizados..."
                    rows={4}
                    className={`w-full p-3 sm:p-4 rounded-xl border focus:outline-hidden resize-y font-serif transition-colors ${textareaStyles} ${fontSizeClasses}`}
                  />

                  {/* Rodapé da Resposta: Status de Salvamento e Ações */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* Status de Gravação */}
                    <div className="flex items-center gap-1.5 min-h-[20px]">
                      {status === 'saving' && (
                        <span className="flex items-center gap-1 text-stone-500 dark:text-zinc-300">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </span>
                      )}
                      {status === 'saved' && (
                        <span className="flex items-center gap-1 text-stone-700 dark:text-zinc-200">
                          <Check className="w-3.5 h-3.5 text-stone-700 dark:text-amber-400" />
                          <span>Salvo no aparelho</span>
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-300">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Falha ao salvar no armazenamento</span>
                        </span>
                      )}
                      {status === 'idle' && hasAnswer && (
                        <span className="flex items-center gap-1 text-stone-500 dark:text-zinc-400 text-[11px]">
                          <Check className="w-3 h-3 opacity-70 text-stone-600 dark:text-amber-400" />
                          <span>Salvo</span>
                        </span>
                      )}
                      {status === 'idle' && !hasAnswer && (
                        <span className="text-stone-500 dark:text-zinc-400 text-[11px] flex items-center gap-1">
                          <Lock className="w-3 h-3 opacity-60" />
                          <span>Privado (salvo apenas no seu aparelho)</span>
                        </span>
                      )}
                    </div>

                    {/* Botão para limpar resposta */}
                    {hasAnswer && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAnswer(qIdx)}
                        className="text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-red-300 dark:hover:bg-white/10 transition-colors flex items-center gap-1 py-1 px-2 rounded-md hover:bg-black/5 text-[11px] cursor-pointer"
                        title="Apagar esta resposta"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpar</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
