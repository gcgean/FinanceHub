import { useEffect } from "react";

export function useGlobalEnter() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Enter key
      if (e.key !== "Enter") return;
      
      // If default is already prevented (e.g. by a library like cmdk), skip
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement;
      
      const isInput = target.tagName === "INPUT";
      const isSelect = target.tagName === "SELECT";
      const isTextArea = target.tagName === "TEXTAREA";
      
      // Only intercept navigation for inputs, selects, and textareas.
      // Buttons (including Select triggers) should keep default behavior (click/activate).
      if (!isInput && !isSelect && !isTextArea) return;

      // Allow Shift+Enter in Textarea for new line
      if (isTextArea && e.shiftKey) return;

      // Avoid interfering with open Comboboxes/Menus
      // Check if the element itself indicates it controls an expanded menu
      if (target.getAttribute("aria-expanded") === "true") return;

      // Check if the element is part of a combobox that might be handling Enter
      if (target.getAttribute("role") === "combobox" && target.getAttribute("aria-expanded") === "true") return;

      // If a Radix portal/content está aberto, evitamos navegação para não interferir
      const radixOpen =
        document.querySelector("[data-radix-popper-content-wrapper]") ||
        document.querySelector("[data-state='open'][data-radix-portal]");
      if (radixOpen) return;

      // Prevent default form submission or newline
      e.preventDefault();

      // Find all focusable elements in the document
      // We limit scope to the current active dialog if possible, but document.querySelectorAll respects DOM order.
      // If a modal is open, focus should ideally stay within it.
      // Radix Dialog uses FocusScope, which might fight us if we try to focus outside.
      // But standard tabbing works, so querySelectorAll usually finds the right sequence.
      // Note: We include buttons in the *target* list so we can navigate TO them.
      const selector = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
      
      const allFocusables = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
      
      // Filter visible elements
      const focusables = allFocusables.filter((element) => {
        // Check visibility (offsetParent is null for hidden elements)
        // Also check if inside a hidden container (aria-hidden) - simplistic check
        if (element.offsetParent === null) return false;
        if (element.hasAttribute("disabled")) return false;
        if (element.tabIndex === -1) return false;
        return true;
      });

      const index = focusables.indexOf(target);
      
      if (index > -1) {
        // Move foco de forma assíncrona para evitar cascatas de atualização durante animações
        const nextIndex = (index + 1) % focusables.length;
        const nextEl = focusables[nextIndex];
        setTimeout(() => {
          nextEl?.focus();
        }, 0);
      }
    };

    // Use capture=false (bubble) to allow other event handlers to preventDefault first if needed
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
