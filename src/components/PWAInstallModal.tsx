import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ReadingTheme } from '../types/book';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ReadingTheme;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  theme = 'cream',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(() => (isIOS ? 'ios' : 'android'));
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div
        className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border relative flex flex-col max-h-[92vh] overflow-hidden ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-black/60'
            : 'bg-[#FCFBF8] border-stone-200 text-stone-900 shadow-stone-400/30'
        }`}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Topo: Ícone do App e Nome */}
        <div className="flex items-center gap-3.5 mb-5 shrink-0 pr-8">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-amber-500/30 p-1 flex items-center justify-center shadow-md shrink-0">
            <img
              src="/pwa-192x192.png"
              alt="Ícone Biblioteca Digital"
              className="w-12 h-12 rounded-xl object-contain"
              onError={(e) => {
                // Fallback caso imagem ainda carregando
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                PWA Nativo
              </span>
              {isInstalled && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Instalado
                </span>
              )}
            </div>
            <h2
              id="pwa-install-title"
              className="font-serif font-bold text-xl sm:text-2xl mt-0.5 text-stone-900 dark:text-zinc-50"
            >
              Biblioteca Digital
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400 font-serif">
              Instale na tela inicial do seu celular
            </p>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {/* Se o navegador suporta instalação direta em um clique (Chrome Android / Chromium) */}
          {isInstallable && !isInstalled && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                    Instalação Rápida Disponível
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                    Seu navegador suporta instalação direta em um clique. O aplicativo será adicionado
                    à tela inicial com ícone exclusivo e abrirá em janela própria sem abas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-semibold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? 'Instalando...' : 'Instalar Agora no Celular'}</span>
              </button>
            </div>
          )}

          {/* Se já está instalado */}
          {isInstalled && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Aplicativo Já Instalado</h4>
                <p className="text-xs text-stone-600 dark:text-zinc-300 mt-1 leading-relaxed">
                  A Biblioteca Digital já está pronta na sua tela inicial! Você pode abri-la diretamente
                  pelo ícone do celular para desfrutar da leitura em tela cheia e acesso offline.
                </p>
              </div>
            </div>
          )}

          {/* Vantagens do App */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-zinc-800/60 border border-black/5 dark:border-zinc-700/50 text-center">
              <Smartphone className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
              <div className="text-xs font-semibold">Tela Cheia</div>
              <div className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                Sem barra de endereço ou abas
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-zinc-800/60 border border-black/5 dark:border-zinc-700/50 text-center">
              <BookOpen className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
              <div className="text-xs font-semibold">Acesso Offline</div>
              <div className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                Livros salvos em cache
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-zinc-800/60 border border-black/5 dark:border-zinc-700/50 text-center">
              <Sparkles className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
              <div className="text-xs font-semibold">Abertura Rápida</div>
              <div className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                Ícone direto na tela inicial
              </div>
            </div>
          </div>

          {/* Abas de Orientação Passo a Passo (Android / iOS) */}
          <div className="pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 mb-2">
              Passo a Passo Manual por Sistema
            </div>

            <div className="flex rounded-xl bg-stone-200/70 dark:bg-zinc-800 p-1 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 shadow-xs'
                    : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 shadow-xs'
                    : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200'
                }`}
              >
                iPhone / iPad (Safari)
              </button>
            </div>

            {/* Conteúdo Android */}
            {activeTab === 'android' && (
              <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-stone-700 dark:text-zinc-300">
                    Abra o menu do <strong>Google Chrome</strong> tocando nos <strong>três pontinhos</strong> (
                    <MoreVertical className="w-3.5 h-3.5 inline text-stone-500" />) no canto superior direito.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-stone-700 dark:text-zinc-300">
                    Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-stone-700 dark:text-zinc-300">
                    Confirme em <strong>"Instalar"</strong>. O ícone da <strong>Biblioteca Digital</strong> aparecerá
                    entre os seus apps com tela cheia nativa.
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo iOS */}
            {activeTab === 'ios' && (
              <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/30 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-stone-700 dark:text-zinc-300">
                    No <strong>Safari</strong> do iPhone/iPad, toque no botão <strong>Compartilhar</strong> (
                    <Share2 className="w-3.5 h-3.5 inline text-blue-500" />) na barra inferior.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-stone-700 dark:text-zinc-300">
                    Role as opções e selecione <strong>"Adicionar à Tela de Início"</strong> (
                    <PlusSquare className="w-3.5 h-3.5 inline text-stone-500" />).
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-stone-700 dark:text-zinc-300">
                    Toque em <strong>"Adicionar"</strong> no canto superior direito. O ícone da <strong>Biblioteca Digital</strong> será adicionado à sua tela de início com abertura em tela cheia.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé da Modal */}
        <div className="mt-5 pt-4 border-t border-stone-200 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-stone-50 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
