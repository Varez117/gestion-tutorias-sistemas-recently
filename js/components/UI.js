export class UI {
  static activeToast = null;
  static toastTimer = null;

  static esAprobada(estado) {
    return [
      "Suficiente",
      "Notable",
      "Excelente",
      "Aprobada",
      "Liberado",
    ].includes(estado);
  }

  static showToast(msg, type = "success", duration = 4000) {
    // 🔒 si ya hay un toast activo → ignorar
    if (UI.activeToast) return;

    let container = document.getElementById("toast-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "fixed top-6 right-6 z-50";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className = `
        toast-glass
        flex flex-col
        gap-2
        px-6 py-4
        rounded-2xl
        shadow-xl
        border
        backdrop-blur-xl
        transition-all duration-300
        translate-x-8 opacity-0
        min-w-[320px]
        max-w-[380px]
        font-semibold
        text-sm
        `;

    toast.style.background = "rgba(255,255,255,0.82)";

    if (type === "success")
      toast.classList.add("border-emerald-200", "text-emerald-700");
    if (type === "error") toast.classList.add("border-red-200", "text-red-700");
    if (type === "info")
      toast.classList.add("border-blue-200", "text-blue-700");

    const row = document.createElement("div");
    row.className = "flex items-center gap-3";

    const icon = document.createElement("span");
    icon.className = "toast-icon flex items-center";
    icon.innerHTML = UI.getIcon(type);

    const text = document.createElement("span");
    text.textContent = msg;

    row.appendChild(icon);
    row.appendChild(text);

    const progress = document.createElement("div");
    progress.className = "toast-progress";

    const bar = document.createElement("div");
    bar.className = "toast-progress-bar";
    bar.style.animationDuration = duration + "ms";

    progress.appendChild(bar);

    toast.appendChild(row);
    toast.appendChild(progress);

    container.appendChild(toast);

    UI.activeToast = toast;

    // animación entrada
    setTimeout(() => {
      toast.classList.remove("translate-x-8", "opacity-0");
    }, 20);

    UI.toastTimer = setTimeout(() => {
      UI.closeToast();
    }, duration);
  }

  static closeToast() {
    if (!UI.activeToast) return;

    UI.activeToast.classList.add("opacity-0", "translate-x-8");

    setTimeout(() => {
      UI.activeToast?.remove();
      UI.activeToast = null;
    }, 250);
  }

  static getIcon(type) {
    if (type === "success") {
      return `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="22" height="22" viewBox="0 0 24 24">
            <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/></svg>`;
    }

    if (type === "error") {
      return `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="22" height="22" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.3 13.3l-1 1L12 13l-3.3 
            3.3-1-1L11 12 7.7 8.7l1-1L12 11l3.3-3.3 1 1L13 12z"/></svg>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="22" height="22" viewBox="0 0 24 24">
        <path d="M11 9h2V7h-2v2zm0 8h2v-6h-2v6zm1-15C6.48 
        2 2 6.48 2 12s4.48 10 10 10 10-4.48 
        10-10S17.52 2 12 2z"/></svg>`;
  }
}
