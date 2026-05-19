import { Database } from "../core/Database.js";
import { UI } from "../components/UI.js";
import { Chatbot } from "../components/Chatbot.js";
import { StorageManager } from "../core/StorageManager.js";
import { PDFService } from "../core/PDFService.js";

export class AlumnoController {
  constructor(activeUser) {
    this.activeUser = activeUser;
    this.selectedFile = null;
    this.currentActId = null;
    this.isUploading = false;

    // Estado Calendario y Notas
    this.currentDate = new Date();
    this.feriados = [];
    this.pendingNoteDate = null;

    this.init();
  }

  async init() {
    this.setupSecurity();
    this.renderUI();
    this.setupNavigation();
    await this.loadFeriados();
    this.injectStatusStyles();

    new Chatbot(this.activeUser, [
      {
        q: "Hola Sussan, ¿Quién eres?",
        a: "¡Hola! Soy Sussan, tu asistente virtual para ayudarte a gestionar tu calendario, brindarte informacion para tus actividades complementarias y acompañarte en el proceso de tutorias mientars estudias.",
      },
      {
        q: "¿Cuál es mi avance en las actividades?",
        a: "Haz clic en cualquier día para agendar una nota personalizada vinculada a esa fecha.",
      },
      {
        q: "¿Cómo libero mi crédito de tutorías?",
        a: "Haz clic en cualquier día para agendar una nota personalizada vinculada a esa fecha.",
      },
    ]);

    // UI Listeners Originales
    const btnMenu = document.getElementById("btn-menu");
    const sidebar = document.getElementById("sidebar");
    if (btnMenu && sidebar)
      btnMenu.onclick = () => sidebar.classList.toggle("active");

    document.getElementById("btn-close-modal").onclick = () =>
      this.closeModal();
    document.getElementById("btn-cancelar-upload").onclick = () =>
      this.closeModal();

    // Listeners Modal Notas
    document.getElementById("btn-close-modal-nota").onclick = () =>
      this.closeModalNota();
    document.getElementById("btn-cancelar-nota").onclick = () =>
      this.closeModalNota();
    document.getElementById("btn-guardar-nota").onclick = () =>
      this.saveNuevaNota();

    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("file-input");
    if (dropArea) dropArea.onclick = () => fileInput.click();
    if (fileInput)
      fileInput.onchange = (e) => this.handleFileSelect(e.target.files[0]);

    ["dragenter", "dragover", "dragleave", "drop"].forEach((name) => {
      dropArea?.addEventListener(name, (e) => e.preventDefault(), false);
    });
    dropArea?.addEventListener(
      "drop",
      (e) => this.handleFileSelect(e.dataTransfer.files[0]),
      false,
    );

    document.getElementById("btn-guardar-pdf").onclick = () =>
      this.processAndSavePDF();

    // Controles Calendario
    document.getElementById("prev-month").onclick = () => this.changeMonth(-1);
    document.getElementById("next-month").onclick = () => this.changeMonth(1);
    document.getElementById("btn-nueva-nota").onclick = () =>
      this.promptNuevaNota();

    // Controles para Modal de Privacidad
    const linkPrivacidad = document.getElementById("link-privacidad");
    const modalPrivacidad = document.getElementById("modal-privacidad");
    if (linkPrivacidad && modalPrivacidad) {
      linkPrivacidad.onclick = () => {
        modalPrivacidad.style.display = "flex";
      };
    }
    const closePrivModal = () => {
      if (modalPrivacidad) modalPrivacidad.style.display = "none";
    };
    const btnClosePriv = document.getElementById("btn-close-privacidad");
    const btnAceptarPriv = document.getElementById("btn-aceptar-privacidad");
    if (btnClosePriv) btnClosePriv.onclick = closePrivModal;
    if (btnAceptarPriv) btnAceptarPriv.onclick = closePrivModal;

    window.addEventListener("db_updated", () => this.renderUI());

    // Iniciar modal de bienvenida
    this.setupWelcomeModal();
  }

  // --- MODAL DE BIENVENIDA ---
  setupWelcomeModal() {
    const modalBienvenida = document.getElementById("modal-bienvenida");
    const alumno = Database.getAlumno(this.activeUser.refId);

    if (modalBienvenida && alumno) {
      const primerNombre = alumno.nombre.split(" ")[0];
      document.getElementById("bienvenida-nombre").textContent = primerNombre;

      const cerrarBienvenida = () => {
        modalBienvenida.style.display = "none";
      };

      document.getElementById("btn-close-splash").onclick = cerrarBienvenida;

      document.getElementById("btn-splash-avance").onclick = () => {
        document.getElementById("nav-perfil").click();
        cerrarBienvenida();
      };

      document.getElementById("btn-splash-tutor").onclick = () => {
        document.getElementById("nav-tutor").click();
        cerrarBienvenida();
      };

      document.getElementById("btn-splash-calendario").onclick = () => {
        document.getElementById("nav-calendario").click();
        cerrarBienvenida();
      };

      document.getElementById("btn-splash-notas").onclick = () => {
        document.getElementById("nav-notas").click();
        cerrarBienvenida();
      };

      document.getElementById("btn-splash-chatbot").onclick = () => {
        cerrarBienvenida();
        const btnChat = document.getElementById("open-chat-btn");
        if (btnChat) btnChat.click();
      };

      modalBienvenida.style.display = "flex";
    }
  }

  async loadFeriados() {
    try {
      //const response = await fetch("../components/FreeDaysCalendar.json");
      const data = await response.json();
      this.feriados = data.dias_descanso;
    } catch (e) {
      //console.error("Error al cargar feriados", e);
    }
  }

  setupNavigation() {
    const navMapping = {
      "nav-perfil": "section-perfil",
      "nav-tutor": "section-tutor",
      "nav-calendario": "section-calendario",
      "nav-notas": "section-notas",
    };

    const navButtons = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".content-section");
    const sidebar = document.getElementById("sidebar");

    document.getElementById("nav-perfil").classList.add("active");

    navButtons.forEach((btn) => {
      btn.onclick = () => {
        if (sidebar) sidebar.classList.remove("active");
        navButtons.forEach((b) => b.classList.remove("active"));
        sections.forEach((s) => (s.style.display = "none"));

        btn.classList.add("active");
        const sectionId = navMapping[btn.id];
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.style.display = "block";

        if (btn.id === "nav-tutor") this.renderTutorInfo();
        if (btn.id === "nav-calendario") this.renderCalendar();
        if (btn.id === "nav-notas") this.renderNotas();
      };
    });
  }

  // --- LÓGICA CALENDARIO ---
  changeMonth(offset) {
    this.currentDate.setMonth(this.currentDate.getMonth() + offset);
    this.renderCalendar();
  }

  renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("calendar-month-year");
    if (!grid || !label) return;
    grid.innerHTML = "";

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    label.textContent = new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
    }).format(this.currentDate);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++)
      grid.appendChild(document.createElement("div"));

    const notas = this.getNotas();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEl = document.createElement("div");
      dayEl.className = "calendar-day";
      dayEl.innerHTML = `<span>${day}</span>`;

      const feriado = this.feriados.find((f) => f.fecha === dateStr);
      if (feriado) {
        dayEl.classList.add("day-feriado");
        dayEl.title = feriado.nombre;
      }

      if (notas.some((n) => n.fecha === dateStr)) {
        const dot = document.createElement("div");
        dot.className = "note-indicator";
        dayEl.appendChild(dot);
      }

      dayEl.onclick = () => this.promptNuevaNota(dateStr);
      grid.appendChild(dayEl);
    }
  }

  // --- LÓGICA NOTAS CON PERSISTENCIA ---
  getNotas() {
    return (
      JSON.parse(localStorage.getItem(`notas_${this.activeUser.refId}`)) || []
    );
  }

  getCategoryIcon(categoria) {
    const svgs = {
      tarea: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
      examen: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
      nota: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"></path><path d="M15 3v6h6"></path><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg>`,
      otro: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    };
    return svgs[categoria] || svgs.nota;
  }

  promptNuevaNota(fecha = null) {
    this.pendingNoteDate = fecha;
    const displayLabel = document.getElementById("nota-fecha-display");
    if (displayLabel)
      displayLabel.textContent = fecha ? `Fecha: ${fecha}` : "Nota General";
    document.getElementById("txt-nota-contenido").value = "";
    document.getElementById("modal-nota").style.display = "flex";
  }

  closeModalNota() {
    document.getElementById("modal-nota").style.display = "none";
    this.pendingNoteDate = null;
  }

  saveNuevaNota() {
    const texto = document.getElementById("txt-nota-contenido").value.trim();
    const categoria = document.getElementById("sel-nota-categoria").value;
    if (!texto) return;

    const notas = this.getNotas();
    notas.push({
      id: Date.now(),
      texto,
      categoria,
      fecha: this.pendingNoteDate,
      creada: new Date().toLocaleDateString(),
    });

    localStorage.setItem(
      `notas_${this.activeUser.refId}`,
      JSON.stringify(notas),
    );
    this.closeModalNota();
    this.renderNotas();
    this.renderCalendar();
    UI.showToast("Nota guardada correctamente.", "success");
  }

  renderNotas() {
    const container = document.getElementById("lista-notas");
    if (!container) return;

    const notas = this.getNotas();
    container.innerHTML = "";

    if (notas.length === 0) {
      container.innerHTML =
        "<p class='texto-etiqueta'>No tienes notas guardadas.</p>";
      return;
    }

    // Ordenamiento Ascendente
    const notasOrdenadas = [...notas].sort((a, b) => {
      if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha);
      if (!a.fecha && b.fecha) return -1;
      if (a.fecha && !b.fecha) return 1;
      return a.id - b.id;
    });

    notasOrdenadas.forEach((nota) => {
      const item = document.createElement("div");
      item.className = `item-actividad bg-blanco border-gris cat-${nota.categoria}`;
      item.innerHTML = `
        <div class="act-izq">
            <div class="act-icono-svg bg-${nota.categoria}">
                ${this.getCategoryIcon(nota.categoria)}
            </div>
            <div class="act-info">
                <p class="act-nombre">${nota.texto}</p>
                <p class="texto-etiqueta">${nota.fecha ? `📅 ${nota.fecha}` : "📝 Nota General"}</p>
            </div>
        </div>
        <button class="btn-outline-danger" style="padding: 5px 10px; font-size: 0.7rem;" onclick="window.alumnoCtrl.eliminarNota(${nota.id})">Borrar</button>
      `;
      container.appendChild(item);
    });
  }

  eliminarNota(id) {
    let notas = this.getNotas();
    notas = notas.filter((n) => n.id !== id);
    localStorage.setItem(
      `notas_${this.activeUser.refId}`,
      JSON.stringify(notas),
    );
    this.renderNotas();
    this.renderCalendar();
    UI.showToast("Nota eliminada.", "info");
  }

  // --- LÓGICA TUTOR ---
  renderTutorInfo() {
    const alumno = Database.getAlumno(this.activeUser.refId);
    const tutor = Database.getTutor(alumno.tutorId);
    const container = document.getElementById("tutor-info-content");
    if (!tutor) {
      container.innerHTML =
        "<p class='texto-etiqueta'>Información no disponible.</p>";
      return;
    }
    container.innerHTML = `
        <section class="tarjeta flex-row">
          <div class="avatar-container"><div class="avatar-fallback"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div></div>
          <div class="info-container">
            <p class="texto-etiqueta">${tutor.area}</p>
            <h2 class="texto-titulo">${tutor.nombre}</h2>
            <div class="info-detalles">
              <span class="badge-detalle"><span class="dot-azul"></span> No. Empleado: ${tutor.numero_empleado}</span>
              <span class="badge-detalle"><span class="dot-celeste"></span> Horario: ${tutor.horario_atencion}</span>
            </div>
          </div>
        </section>
    `;
  }

  // --- PDF & ESTILOS ---
  injectStatusStyles() {
    window.alumnoCtrl = this;
    if (document.getElementById("status-styles-core")) return;
    const style = document.createElement("style");
    style.id = "status-styles-core";
    style.textContent = `
        .status-badge { margin-left: 10px; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; display: inline-block; }
        .status-info { background: #eff6ff; color: #3b82f6; border-color: #dbeafe; }
        .status-success { background: #ecfdf5; color: #10b981; border-color: #d1fae5; }
        .status-error { background: #fff1f2; color: #f43f5e; border-color: #ffe4e6; }
        #btn-guardar-pdf:disabled { cursor: not-allowed; opacity: 0.7; }
    `;
    document.head.appendChild(style);
  }

  updateStatusLabel(text, type = "info") {
    const container = document.getElementById("modal-actividad-nombre");
    let label = document.getElementById("status-badge-upload");
    if (!label) {
      label = document.createElement("span");
      label.id = "status-badge-upload";
      container.appendChild(label);
    }
    label.textContent = text;
    label.className = `status-badge status-${type}`;
  }

  handleFileSelect(file) {
    if (file && file.type === "application/pdf") {
      this.selectedFile = file;
      document.getElementById("file-name-display").textContent = file.name;
      document.getElementById("btn-guardar-pdf").disabled = false;
      this.updateStatusLabel("Archivo listo", "info");
    }
  }

  // --- MODIFICADO: Interceptamos la consola de PDFService para leer el código de error exacto
  async processAndSavePDF() {
    if (!this.selectedFile || this.isUploading || !this.currentActId) return;
    this.isUploading = true;
    const btnSave = document.getElementById("btn-guardar-pdf");
    btnSave.disabled = true;
    btnSave.textContent = "Procesando...";

    let errorEspecifico = null;
    const originalConsoleLog = console.log;

    try {
      const actModal = document
        .getElementById("modal-actividad-nombre")
        .firstChild.textContent.trim();
      const alumno = Database.getAlumno(this.activeUser.refId);
      const index = parseInt(this.currentActId.split("-")[1]);

      let qrData = null;
      let pdfTextRaw = "";

      try {
        qrData = await PDFService.scanQRCode(this.selectedFile);
        pdfTextRaw = await PDFService.extractText(this.selectedFile);
      } catch (e) {
        throw new Error("Error al leer el documento PDF.");
      }

      // Sobrescribimos console.log temporalmente para atrapar los mensajes de PDFService
      console.log = function (...args) {
        // Ejecutamos el log original siempre
        originalConsoleLog.apply(console, args);

        // PDFService manda algo como: console.log("[SYS-8X1A]", 0)
        if (args.length >= 2 && args[1] === 0) {
          const rawCode = String(args[0]).replace(/\[|\]/g, ""); // Extrae "SYS-8X1A"

          const errorMap = {
            "SYS-F9A1": "Inicio auditoría",
            "SYS-Q1B7": "Bloque QR",
            "SYS-3E8D": "QR Incorrecto o no detectado",
            "SYS-H8C3": "Bloque identidad",
            "SYS-8X1A": "Nombre no coincide con el alumno",
            "SYS-6T2N": "Matrícula no coincide con el alumno",
            "SYS-J7D2": "Bloque académico",
            "SYS-4P0S": "Actividad incorrecta",
            "SYS-9K3E": "Carrera incorrecta",
            "SYS-Z9X0": "Resultado final",
          };

          // Guardamos el primer error específico que encontremos (ignorando el resultado final global)
          if (errorMap[rawCode] && !errorEspecifico && rawCode !== "SYS-Z9X0") {
            errorEspecifico = "Error: " + errorMap[rawCode];
          }
        }
      };

      // Ejecutamos la validación
      const validacion = PDFService.validateData(
        qrData,
        pdfTextRaw,
        alumno,
        actModal,
      );

      // Si falla, disparamos nuestro error personalizado capturado por el interceptor
      if (!validacion) {
        throw new Error(
          errorEspecifico || "Error de validación en el documento.",
        );
      }

      // Si todo es correcto:
      this.updateStatusLabel("¡Éxito! Guardando...", "success");
      const fileId = `${this.activeUser.refId}_act_${index}`;
      await StorageManager.save(fileId, this.selectedFile);

      alumno.historial_actividades[index].tieneArchivo = true;
      Database.updateUser(this.activeUser.refId, alumno);

      btnSave.textContent = "¡Guardado!";
      UI.showToast("¡Archivo guardado con éxito!", "success");

      setTimeout(() => this.closeModal(), 2000);
    } catch (e) {
      this.updateStatusLabel(e.message, "error");
      btnSave.disabled = false;
      btnSave.textContent = "Guardar Archivo";
    } finally {
      // SIEMPRE restauramos la consola a su estado natural, pase lo que pase
      console.log = originalConsoleLog;
      this.isUploading = false;
    }
  }

  async viewStoredFile(index) {
    try {
      const fileId = `${this.activeUser.refId}_act_${index}`;
      const file = await StorageManager.get(fileId);
      if (file) {
        UI.showToast("Abriendo archivo...", "info");
        const blob = new Blob([file], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank") || alert("Permite ventanas emergentes");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      console.error("Error PDF:", e);
      UI.showToast("No se pudo abrir el archivo.", "error");
    }
  }

  // --- MODIFICADO: Bug fijado. Limpiar estado visual y variables al abrir el modal
  openModal(actNombre, actId) {
    this.currentActId = actId;
    this.selectedFile = null;
    this.isUploading = false;

    document.getElementById("modal-actividad-nombre").textContent = actNombre;

    // Limpiamos la caché visual del input file
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";

    // Restauramos el texto de archivo seleccionado
    const display = document.getElementById("file-name-display");
    if (display) display.textContent = "Ningún archivo seleccionado";

    // Bloqueamos el botón y restablecemos su texto
    const btnSave = document.getElementById("btn-guardar-pdf");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "Guardar Archivo";
    }

    // Borramos el aviso rojo/verde si quedó del intento anterior
    const label = document.getElementById("status-badge-upload");
    if (label) label.remove();

    document.getElementById("modal-upload").style.display = "flex";
  }

  // --- MODIFICADO: Bug fijado. Limpiar caché en background al cerrar
  closeModal() {
    document.getElementById("modal-upload").style.display = "none";
    this.selectedFile = null;
    this.currentActId = null;
    this.isUploading = false;

    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
  }

  // --- LÓGICA AVATAR DE USUARIO ---
  async loadAvatar() {
    const container =
      document.getElementById("avatar-perfil-usuario") ||
      document.querySelector(".avatar-perfil-usuario");
    if (!container) return;

    const avatarKey = `avatar_${this.activeUser.refId}`;
    let file = null;
    try {
      file = await StorageManager.get(avatarKey);
    } catch (e) {
      // Sin avatar personalizado
    }

    const svgDefault = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

    container.style.cursor = "pointer";
    container.title = "Haz clic para cambiar tu foto de perfil";
    container.style.overflow = "hidden";
    container.style.borderRadius = "50%";

    if (file) {
      const blob = new Blob([file], { type: file.type || "image/jpeg" });
      const url = URL.createObjectURL(blob);
      container.innerHTML = `<img src="${url}" alt="Perfil" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      container.innerHTML = `<div class="avatar-fallback" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #94a3b8;">${svgDefault}</div>`;
    }

    let fileInput = document.getElementById("input-avatar-upload");
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.id = "input-avatar-upload";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);

      fileInput.onchange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
          try {
            await StorageManager.save(avatarKey, selectedFile);
            UI.showToast("Foto de perfil actualizada", "success");
            this.loadAvatar();
          } catch (error) {
            UI.showToast("Error al guardar la foto", "error");
            console.error(error);
          }
        }
      };
    }
    container.onclick = () => fileInput.click();
  }

  renderUI() {
    this.loadAvatar();
    const alumno = Database.getAlumno(this.activeUser.refId);
    if (!alumno) return;

    document.getElementById("lbl-nombre").textContent = alumno.nombre;
    document.getElementById("lbl-matricula").textContent = alumno.matricula;
    document.getElementById("lbl-carrera").textContent = alumno.carrera;
    document.getElementById("lbl-semestre").textContent = alumno.semestre;

    const countAcad = alumno.historial_actividades.filter(
      (a) => a.tipo === "Académica" && a.estado !== "Insuficiente",
    ).length;
    const countExtra = alumno.historial_actividades.filter(
      (a) => a.tipo === "Extraescolar" && a.estado !== "Insuficiente",
    ).length;
    document.getElementById("prog-acad").textContent =
      `${Math.min(countAcad, 2)} de 2`;
    document.getElementById("prog-extra").textContent =
      `${Math.min(countExtra, 2)} de 2`;

    const svgLib = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
    const svgAcad = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
    const svgExtra = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>`;

    const listaHistorial = document.getElementById("lista-historial");
    if (!listaHistorial) return;
    listaHistorial.innerHTML = "";
    const template = document.getElementById("tpl-actividad");

    alumno.historial_actividades.forEach((act, index) => {
      const clone = template.content.cloneNode(true);
      const isLib = act.tipo === "Acreditación Institucional";
      const isAprobada = UI.esAprobada(act.estado); // Verificamos si pasó o no

      clone.querySelector(".act-nombre").textContent = act.nombre;
      clone.querySelector(".act-tipo").textContent = act.tipo;

      // ESTADO: Mostrar Acreditado / No acreditado
      const actEstado = clone.querySelector(".act-estado");
      actEstado.textContent = isAprobada ? "Acreditado" : "No acreditado";

      clone.querySelector(".act-icono").innerHTML = isLib
        ? svgLib
        : act.tipo === "Académica"
          ? svgAcad
          : svgExtra;

      const btnAdjuntar = clone.querySelector(".btn-adjuntar");
      const instruccionesP = clone.querySelector(".act-instrucciones");

      if (isLib) {
        actEstado.style.backgroundColor = "#eff6ff"; // Azul claro
        actEstado.style.color = "#3b82f6"; // Azul
        actEstado.style.borderColor = "#dbeafe";
        instruccionesP.textContent = "Créditos liberados en el sistema.";
        instruccionesP.style.color = "#3b82f6"; // Azul
      } else {
        if (isAprobada) {
          actEstado.style.backgroundColor = "#ecfdf5"; // Verde claro
          actEstado.style.color = "#10b981"; // Verde
          actEstado.style.borderColor = "#d1fae5";

          btnAdjuntar.style.display = "flex";

          if (act.tieneArchivo) {
            // Caso: Aprobado y YA TIENE Constancia adjunta
            btnAdjuntar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Ver Constancia`;
            btnAdjuntar.onclick = () => this.viewStoredFile(index);

            instruccionesP.textContent = "Completado";
            instruccionesP.style.color = "#10b981"; // Verde
          } else {
            // Caso: Aprobado pero FALTA Constancia
            btnAdjuntar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Adjuntar Constancia`;
            btnAdjuntar.onclick = () =>
              this.openModal(act.nombre, `act-${index}`);

            instruccionesP.textContent = "Falta evidencia";
            instruccionesP.style.color = "#f59e0b"; // Naranja/Ambar
          }
        } else {
          // Caso: No Acreditada
          actEstado.style.backgroundColor = "#fff1f2"; // Rojo claro
          actEstado.style.color = "#ef4444"; // Rojo
          actEstado.style.borderColor = "#ffe4e6";
          instruccionesP.textContent = "No acreditada";
          instruccionesP.style.color = "#ef4444"; // Rojo
        }
      }
      listaHistorial.appendChild(clone);
    });
  }

  // --- SISTEMA DE SEGURIDAD ANTICOPIA/INSPECTOR ---
  setupSecurity() {
    window.addEventListener("keydown", (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
        this.triggerSecurityLogout();
      }
    });

    const threshold = 160;
    window.addEventListener("resize", () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        this.triggerSecurityLogout();
      }
    });
  }

  triggerSecurityLogout() {
    console.warn("Intento de apertura de DevTools detectado.");
    alert(
      "Acción no permitida. Por razones de seguridad, la sesión se cerrará.",
    );
    if (typeof window.cerrarSesion === "function") {
      window.cerrarSesion();
    } else {
      window.location.href = "index.html";
    }
  }
}
