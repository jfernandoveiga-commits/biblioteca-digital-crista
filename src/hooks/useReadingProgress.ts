import { useEffect, useState, RefObject } from 'react';

/**
 * Hook para acompanhar com precisão o progresso real de leitura dentro do capítulo.
 * Calcula o percentual baseado na posição do artigo na tela.
 * Preparado para suportar futura persistência e retomada de leitura.
 */
export function useReadingProgress(contentRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const element = contentRef.current;
      if (!element) {
        // Fallback para documento caso o elemento específico não esteja montado
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          const scrolled = Math.min(100, Math.max(0, Math.round((window.scrollY / docHeight) * 100)));
          setProgress(scrolled);
        }
        return;
      }

      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + window.scrollY;
      const elementHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Início da leitura quando o elemento atinge a metade superior da tela
      const scrollPosition = window.scrollY - elementTop + (windowHeight * 0.4);
      const totalScrollableDistance = elementHeight - (windowHeight * 0.4);

      if (totalScrollableDistance <= 0) {
        setProgress(100);
        return;
      }

      let currentPercent = (scrollPosition / totalScrollableDistance) * 100;
      currentPercent = Math.min(100, Math.max(0, Math.round(currentPercent)));
      setProgress(currentPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [contentRef]);

  return progress;
}
