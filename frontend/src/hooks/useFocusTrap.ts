import { useEffect, useRef } from 'react';

/**
 * Hook pour créer un focus trap dans un élément
 * Confine la navigation au clavier à l'intérieur d'un conteneur (modal, drawer, etc.)
 * Conforme aux recommandations WCAG 2.1 Level AA
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Sauvegarder l'élément actuellement focusé
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;

    // Récupérer tous les éléments focusables dans le conteneur
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',');

      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el) => {
        // Vérifier que l'élément est visible
        return el.offsetParent !== null;
      });
    };

    // Focus sur le premier élément focusable au montage
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Gérer la navigation au Tab
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Si Shift+Tab sur le premier élément, aller au dernier
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Si Tab sur le dernier élément, aller au premier
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Cleanup: restaurer le focus sur l'élément précédent
    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Restaurer le focus seulement si l'élément existe encore dans le DOM
      if (previouslyFocusedElement.current && document.body.contains(previouslyFocusedElement.current)) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};
