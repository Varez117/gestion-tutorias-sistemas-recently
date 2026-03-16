import { Auth } from "../core/Auth.js";



export class LoginController {
  constructor() {
    console.log("🟢 LoginController instanciado.");
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
        console.log(`Intentando login -> Usuario: ${u}, Rol: ${r}`);
        Auth.login(u, p, r);
      });
    } else {
      console.error("🔴 No se encontró el formulario 'login-form'.");
    }

    const cards = document.querySelectorAll("[data-role]");
    if (cards.length === 0) {
      console.error(
        "🔴 No se encontraron las tarjetas (Falta atributo data-role).",
      );
    }

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const role = card.getAttribute("data-role");
        const title = card.getAttribute("data-title");
        console.log(`🟢 Clic detectado en tarjeta: ${title}`);
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
  }

}
