import { Auth } from "../core/Auth.js";

export class LoginController {
  constructor() {
    console.info("[SYS-C4D2] Iniciando sistema...");
    this.setupSecurity();
    this.bindEvents();
  }

  bindEvents() {
    const form = document.getElementById("login-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const u = document.getElementById("user").value;
        const p = document.getElementById("pass").value;
        const r = document.getElementById("login-role").value;
        console.info("[SYS-6B1F]");
        Auth.login(u, p, r);
      });
    } else {
      console.error("[ERR-2X7A]");
    }

    const cards = document.querySelectorAll("[data-role]");
    if (cards.length === 0) {
      console.error("[ERR-9Q3L]");
    }

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const role = card.getAttribute("data-role");
        const title = card.getAttribute("data-title");
        console.info("[SYS-5E8C]");
        this.abrirLogin(role, title);
      });
    });

    const btnVolver = document.getElementById("btn-volver-hub");
    if (btnVolver) {
      btnVolver.addEventListener("click", () => {
        this.volverHub();
      });
    }
  }

  abrirLogin(role, titulo) {
    document.getElementById("hub-cards").classList.add("hidden", "opacity-0");
    const formContainer = document.getElementById("login-form-container");
    formContainer.classList.remove("hidden");
    setTimeout(
      () => formContainer.classList.remove("opacity-0", "scale-95"),
      50,
    );
    document.getElementById("login-title").textContent = titulo;
    document.getElementById("login-role").value = role;

    console.info("[SYS-A12E]");
  }

  volverHub() {
    const formContainer = document.getElementById("login-form-container");
    formContainer.classList.add("opacity-0", "scale-95");
    setTimeout(() => {
      formContainer.classList.add("hidden");
      const hub = document.getElementById("hub-cards");
      hub.classList.remove("hidden");
      setTimeout(() => hub.classList.remove("opacity-0"), 50);
    }, 300);
    document.getElementById("login-form").reset();

    console.info("[SYS-D77B]");
  }

  // --- NUEVO: SISTEMA DE SEGURIDAD AVANZADO (TRAMPA DE HIDRA) ---
  setupSecurity() {
    // 1. Bloqueo de interacción básica
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("selectstart", (e) => e.preventDefault());

    // 2. Trampa autoejecutable (IIFE) basada en tiempo y ofuscación
    (function () {
      const umbralDeteccion = 50; // Milisegundos de tolerancia

      const trampa = function () {
        const inicio = new Date().getTime();

        // Llamada ofuscada para evadir búsquedas simples de "debugger"
        // Si DevTools está abierto, el navegador hará una micropausa aquí
        (function () {
          return false;
        })["constructor"]("debugger")();

        const fin = new Date().getTime();

        // Si la diferencia de tiempo es mayor al umbral, alguien está inspeccionando
        if (fin - inicio > umbralDeteccion) {
          // Medida nuclear: Destruir el DOM y bloquear el sistema
          document.body.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#0f172a; color:#ef4444; font-family:sans-serif; text-align:center;">
              <h1 style="font-size:3rem; margin-bottom:10px;">🛡️ ACCESO DENEGADO</h1>
              <p style="font-size:1.2rem; color:#94a3b8;">Se ha detectado manipulación del entorno.</p>
              <p style="font-size:1rem; color:#64748b;">Cierre las herramientas de desarrollador y recargue la página.</p>
            </div>
          `;

          // Saturar la consola para molestar aún más
          setInterval(() => {
            console.clear();
            console.error("ENTORNO COMPROMETIDO - SESIÓN BLOQUEADA");
          }, 100);

          return; // Detener la ejecución normal
        }

        // Ejecutar de forma recursiva e impredecible (entre 500ms y 1.5s)
        setTimeout(trampa, Math.random() * 1000 + 500);
      };

      // Iniciar la trampa
      trampa();
    })();
  }
}
