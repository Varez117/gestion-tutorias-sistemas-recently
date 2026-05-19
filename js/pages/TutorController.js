import { Database } from "../core/Database.js";
import { UI } from "../components/UI.js";
import { Chatbot } from "../components/Chatbot.js";
import { StorageManager } from "../core/StorageManager.js";

export class TutorController {
  constructor(activeUser) {
    this.activeUser = { ...activeUser, refId: Number(activeUser.refId) };
    this.currentDate = new Date();
    // Estados de filtros y búsqueda
    this.filtroTexto = "";
    this.filtroSemestre = "all";
    this.filtroEstatus = "all";
    this.pendingNoteDate = null;

    window.tutorCtrl = this;
    this.init();
  }

  init() {
    this.setupSecurity(); // <--- NUEVO: Inicializar seguridad anticopia/inspector
    this.injectStyles();
    this.renderUI();
    this.setupNavigation();

    const btnPerfil = document.getElementById("nav-perfil");
    if (btnPerfil) btnPerfil.classList.add("active");

    new Chatbot(this.activeUser, [
      {
        q: "¿Qué significa el botón Evaluar?",
        a: "Significa que el alumno ya completó 2 actividades académicas y 2 extraescolares satisfactoriamente.",
      },
    ]);

    // Listeners de UI Principal
    document.getElementById("btn-menu").onclick = () =>
      document.getElementById("sidebar").classList.toggle("active");

    // Listeners de Modales
    document.getElementById("btn-close-modal-nota").onclick = () =>
      this.closeModalNota();
    document.getElementById("btn-cancelar-nota").onclick = () =>
      this.closeModalNota();
    document.getElementById("btn-guardar-nota").onclick = () =>
      this.saveNuevaNota();
    document.getElementById("btn-nueva-nota").onclick = () =>
      this.abrirModalNota();
    document.getElementById("btn-close-expediente").onclick = () =>
      this.closeModalExpediente();

    // Listeners de Búsqueda y Filtros
    document.getElementById("busqueda-alumno").oninput = (e) => {
      this.filtroTexto = e.target.value.toLowerCase();
      this.renderTutorados();
    };
    document.getElementById("filtro-semestre").onchange = (e) => {
      this.filtroSemestre = e.target.value;
      this.renderTutorados();
    };
    document.getElementById("filtro-estatus").onchange = (e) => {
      this.filtroEstatus = e.target.value;
      this.renderTutorados();
    };
    document.getElementById("btn-reset-filtros").onclick = () =>
      this.resetFiltros();

    // Listeners de Calendario
    document.getElementById("prev-month").onclick = () => this.changeMonth(-1);
    document.getElementById("next-month").onclick = () => this.changeMonth(1);

    window.addEventListener("db_updated", () => this.renderUI());
  }

  resetFiltros() {
    this.filtroTexto = "";
    this.filtroSemestre = "all";
    this.filtroEstatus = "all";
    document.getElementById("busqueda-alumno").value = "";
    document.getElementById("filtro-semestre").value = "all";
    document.getElementById("filtro-estatus").value = "all";
    this.renderTutorados();
    UI.showToast("Filtros restablecidos.", "info");
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
    const tutor = Database.getTutor(this.activeUser.refId);
    if (!tutor) return;

    this.loadAvatar();

    document.getElementById("lbl-nombre").textContent = tutor.nombre;
    document.getElementById("lbl-empleado").textContent = tutor.numero_empleado;
    document.getElementById("lbl-area").textContent = tutor.area;
    document.getElementById("lbl-horario").textContent = tutor.horario_atencion;

    this.renderTutorados();
  }

  renderTutorados() {
    const container = document.getElementById("lista-tutorados");
    if (!container) return;

    const db = Database.get();
    let misAlumnos = db.alumnos.filter(
      (a) => Number(a.tutorId) === this.activeUser.refId,
    );

    if (this.filtroSemestre !== "all") {
      misAlumnos = misAlumnos.filter(
        (a) => a.semestre.toString() === this.filtroSemestre,
      );
    }

    misAlumnos = misAlumnos.map((alumno) => {
      const academicas = alumno.historial_actividades.filter(
        (act) => act.tipo === "Académica" && UI.esAprobada(act.estado),
      ).length;
      const extraescolares = alumno.historial_actividades.filter(
        (act) => act.tipo === "Extraescolar" && UI.esAprobada(act.estado),
      ).length;

      const cumpleRegla = academicas >= 2 && extraescolares >= 2;
      const esLiberado =
        alumno.liberado ||
        alumno.historial_actividades.some(
          (a) => a.tipo === "Acreditación Institucional",
        );

      let statusId = "pendiente";
      if (esLiberado) statusId = "liberado";
      else if (cumpleRegla) statusId = "evaluar";

      return { ...alumno, statusId, esLiberado, cumpleRegla };
    });

    if (this.filtroEstatus !== "all") {
      misAlumnos = misAlumnos.filter((a) => a.statusId === this.filtroEstatus);
    }

    if (this.filtroTexto) {
      misAlumnos.sort((a, b) => {
        const matchA =
          a.nombre.toLowerCase().includes(this.filtroTexto) ||
          a.matricula.toLowerCase().includes(this.filtroTexto);
        const matchB =
          b.nombre.toLowerCase().includes(this.filtroTexto) ||
          b.matricula.toLowerCase().includes(this.filtroTexto);
        if (matchA && !matchB) return -1;
        if (!matchA && matchB) return 1;
        return 0;
      });
    }

    container.innerHTML =
      misAlumnos.length === 0
        ? "<p class='text-center p-4 text-slate-400'>Sin tutorados registrados.</p>"
        : "";

    misAlumnos.forEach((alumno) => {
      const item = document.createElement("div");
      item.className = "item-actividad bg-blanco border-gris mb-3";

      let statusHTML = "";
      if (alumno.esLiberado) {
        statusHTML = `<span class="badge-aprobado">LIBERADO</span>`;
      } else if (alumno.cumpleRegla) {
        statusHTML = `<button onclick="window.tutorCtrl.abrirExpediente(${alumno.id}, false)" class="btn-evaluar">EVALUAR</button>`;
      } else {
        statusHTML = `<span class="badge-reprobado">PENDIENTE</span>`;
      }

      item.innerHTML = `
        <div class="act-izq">
          <button class="btn-view-eye" onclick="window.tutorCtrl.abrirExpediente(${alumno.id}, true)" title="Ver Detalle">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <div class="act-info">
            <p class="act-nombre">${alumno.nombre}</p>
            <p class="texto-etiqueta">${alumno.matricula} • ${alumno.carrera}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="badge-detalle">${alumno.semestre}° Sem</span>
          ${statusHTML}
        </div>`;
      container.appendChild(item);
    });
  }

  // --- LÓGICA EXPEDIENTE Y VISUALIZACIÓN DE ARCHIVOS ---
  abrirExpediente(idAlumno, readOnly = false) {
    const alumno = Database.getAlumno(idAlumno);
    if (!alumno) return;

    document.getElementById("exp-nombre").textContent = alumno.nombre;
    document.getElementById("exp-matricula").textContent = alumno.matricula;
    document.getElementById("exp-promedio").textContent =
      alumno.prom_sin_rep + "%";

    const lista = document.getElementById("exp-lista-actividades");
    lista.innerHTML = "";

    alumno.historial_actividades.forEach((act, index) => {
      const row = document.createElement("div");
      row.className =
        "flex justify-between items-center p-2 border-b border-slate-100 text-sm";

      let fileButtonHTML = "";
      if (act.tieneArchivo) {
        fileButtonHTML = `
          <button class="btn-evaluar ml-3" style="padding: 4px 8px; font-size: 0.7rem; display: flex; align-items: center; gap: 4px;" onclick="window.tutorCtrl.viewStudentFile(${alumno.id}, ${index})" title="Ver Evidencia PDF">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> 
            PDF
          </button>`;
      }

      row.innerHTML = `
        <div class="flex-1"><p class="font-bold">${act.nombre}</p><p class="text-[10px] text-slate-400 uppercase">${act.tipo}</p></div>
        <div class="flex items-center justify-end">
          <span class="${UI.esAprobada(act.estado) ? "text-emerald-600" : "text-rose-600"} font-bold">${act.estado}</span>
          ${fileButtonHTML}
        </div>`;
      lista.appendChild(row);
    });

    const footer = document.getElementById("exp-footer");
    footer.innerHTML = readOnly
      ? `<button class="btn-primario w-full" onclick="window.tutorCtrl.closeModalExpediente()">Cerrar Vista</button>`
      : `<button class="btn-outline-danger" onclick="window.tutorCtrl.closeModalExpediente()">Cancelar</button>
         <button class="btn-primario" onclick="window.tutorCtrl.liberarAlumno(${alumno.id})">Liberar Tutorías</button>`;

    document.getElementById("modal-expediente").style.display = "flex";
  }

  async viewStudentFile(idAlumno, indexActividad) {
    try {
      const fileId = `${idAlumno}_act_${indexActividad}`;
      UI.showToast("Abriendo archivo...", "info");
      const file = await StorageManager.get(fileId);

      if (file) {
        const blob = new Blob([file], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank") ||
          alert(
            "Por favor, permite las ventanas emergentes en tu navegador para ver el PDF.",
          );

        // Limpiamos la URL después de un minuto para no saturar la memoria
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        UI.showToast("El documento no se encontró en la base local.", "error");
      }
    } catch (e) {
      console.error("Error al recuperar el PDF del alumno:", e);
      UI.showToast("Error al intentar abrir el archivo.", "error");
    }
  }

  liberarAlumno(idAlumno) {
    const db = Database.get();
    const alumno = db.alumnos.find((a) => a.id === idAlumno);
    alumno.liberado = true;
    alumno.historial_actividades.push({
      id_actividad: "LIB_OFICIAL",
      nombre: "Tutorías (Liberación)",
      tipo: "Acreditación Institucional",
      estado: "Liberado",
    });
    Database.save(db);
    UI.showToast(`¡Alumno ${alumno.matricula} liberado con éxito!`, "success");
    this.closeModalExpediente();
    this.renderTutorados();
  }

  closeModalExpediente() {
    document.getElementById("modal-expediente").style.display = "none";
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
    const notas = this.getNotas();

    for (let i = 0; i < firstDay; i++)
      grid.appendChild(document.createElement("div"));

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${d}/${month + 1}/${year}`;
      const dayEl = document.createElement("div");
      dayEl.className = "calendar-day";
      dayEl.textContent = d;

      if (notas.some((n) => n.fecha === dateStr)) {
        const dot = document.createElement("div");
        dot.className = "note-indicator";
        dayEl.appendChild(dot);
      }

      dayEl.onclick = () => this.abrirModalNota(dateStr);
      grid.appendChild(dayEl);
    }
  }

  // --- LÓGICA NOTAS ---
  getNotas() {
    return (
      JSON.parse(
        localStorage.getItem(`notas_tutor_${this.activeUser.refId}`),
      ) || []
    );
  }

  getCategoryIcon(categoria) {
    const svgs = {
      nota: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"></path><path d="M15 3v6h6"></path><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg>`,
      seguimiento: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
      urgente: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
    };
    return svgs[categoria] || svgs.nota;
  }

  abrirModalNota(fecha = null) {
    this.pendingNoteDate = fecha;
    document.getElementById("nota-fecha-display").textContent = fecha
      ? `Fecha: ${fecha}`
      : "Nota General";
    document.getElementById("txt-nota-contenido").value = "";
    document.getElementById("modal-nota").style.display = "flex";
  }

  closeModalNota() {
    document.getElementById("modal-nota").style.display = "none";
  }

  saveNuevaNota() {
    const texto = document.getElementById("txt-nota-contenido").value.trim();
    if (!texto) return;
    const notas = this.getNotas();
    notas.push({
      id: Date.now(),
      texto,
      fecha: this.pendingNoteDate,
      categoria: document.getElementById("sel-nota-categoria").value,
    });
    localStorage.setItem(
      `notas_tutor_${this.activeUser.refId}`,
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

    if (notas.length === 0) {
      container.innerHTML = "<p class='texto-etiqueta'>No hay notas.</p>";
      return;
    }

    const notasOrdenadas = [...notas].sort((a, b) => {
      if (!a.fecha && !b.fecha) return b.id - a.id;
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;

      const parseDate = (str) => {
        const [d, m, y] = str.split("/");
        return new Date(y, m - 1, d);
      };
      return parseDate(a.fecha) - parseDate(b.fecha);
    });

    container.innerHTML = "";
    notasOrdenadas.forEach((n) => {
      const item = document.createElement("div");
      item.className = `item-actividad nota-card cat-${n.categoria}`;
      item.innerHTML = `
        <div class="act-izq">
            <div class="icon-container-nota bg-icon-${n.categoria}">
                ${this.getCategoryIcon(n.categoria)}
            </div>
            <div class="info-nota">
                <p class="nota-nombre-p">${n.texto}</p>
                <p class="nota-fecha-p">📅 ${n.fecha || "General"}</p>
            </div>
        </div>
        <button class="btn-borrar-nota-img" onclick="window.tutorCtrl.eliminarNota(${n.id})">Borrar</button>`;
      container.appendChild(item);
    });
  }

  eliminarNota(id) {
    const nuevas = this.getNotas().filter((n) => n.id !== id);
    localStorage.setItem(
      `notas_tutor_${this.activeUser.refId}`,
      JSON.stringify(nuevas),
    );
    this.renderNotas();
    this.renderCalendar();
    UI.showToast("Nota eliminada.", "info");
  }

  // --- NAVEGACIÓN ---
  setupNavigation() {
    const navMapping = {
      "nav-perfil": "section-perfil",
      "nav-calendario": "section-calendario",
      "nav-notas": "section-notas",
    };
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.onclick = () => {
        document
          .querySelectorAll(".nav-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelectorAll(".content-section")
          .forEach((s) => (s.style.display = "none"));
        btn.classList.add("active");
        document.getElementById(navMapping[btn.id]).style.display = "block";
        if (btn.id === "nav-calendario") this.renderCalendar();
        if (btn.id === "nav-notas") this.renderNotas();
      };
    });
  }

  injectStyles() {
    if (document.getElementById("tutor-injected-styles")) return;
    const style = document.createElement("style");
    style.id = "tutor-injected-styles";
    style.textContent = `
      .nav-btn.active { background-color: #eff6ff !important; color: #3b82f6 !important; transform: scale(1.02); }
      .btn-reset { background: #f1f5f9; color: #64748b; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s; }
      .btn-reset:hover { background: #d6dadf; color: #0f172a; }
      .btn-view-eye { background: #f8fafc; color: #64748b; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s; }
      .btn-view-eye:hover { background: #1b396a; color: white; border-color: #1b396a; }
      .btn-evaluar { background: #eff6ff; color: #3b82f6; padding: 6px 14px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; border: 1px solid #bfdbfe; cursor: pointer; transition: 0.2s; }
      .btn-evaluar:hover { background: #3b82f6; color: white; transform: scale(1.05); }
      .badge-aprobado { background: #ecfdf5; color: #10b981; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; border: 1px solid #a7f3d0; }
      .badge-reprobado { background: #fff1f2; color: #f43f5e; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; border: 1px solid #fecdd3; }
      
      .nota-card { 
        padding: 1rem 1.5rem !important; 
        border-radius: 1.25rem !important; 
        margin-bottom: 1rem !important; 
        border: 1px solid #e2e8f0 !important;
        display: flex; justify-content: space-between; align-items: center;
      }
      
      .cat-nota { background: #eff6ff !important; border-left: 5px solid #3b82f6 !important; }
      .cat-seguimiento { background: #fffbeb !important; border-left: 5px solid #f59e0b !important; }
      .cat-urgente { background: #fef2f2 !important; border-left: 5px solid #ef4444 !important; }

      .icon-container-nota { 
        width: 44px; height: 44px; border-radius: 10px; 
        display: flex; align-items: center; justify-content: center; margin-right: 1.25rem; 
      }
      .bg-icon-nota { background: #dbeafe; color: #2563eb; }
      .bg-icon-seguimiento { background: #fef3c7; color: #d97706; }
      .bg-icon-urgente { background: #fee2e2; color: #dc2626; }

      .nota-nombre-p { font-weight: 800; color: #1e293b; font-size: 0.95rem; margin: 0; }
      .nota-fecha-p { font-size: 0.75rem; color: #94a3b8; font-weight: 700; margin-top: 2px; }

      .btn-borrar-nota-img {
        background: rgba(255,255,255,0.6); color: #64748b; 
        padding: 6px 18px; border-radius: 10px; font-size: 0.75rem; 
        font-weight: 800; border: 1px solid #e2e8f0; cursor: pointer;
        transition: all 0.2s;
      }
      .btn-borrar-nota-img:hover { background: #f43f5e; color: white; border-color: #f43f5e; }

      .note-indicator { width: 6px; height: 6px; background: #8b5cf6; border-radius: 50%; position: absolute; bottom: 6px; }
      .calendar-day { aspect-ratio: 1.4/1; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 10px; position: relative; font-weight: 700; transition: 0.2s; }
      .calendar-day:hover { background: #eff6ff; border-color: #3b82f6; transform: translateY(-2px); }
      
      @media (max-width: 768px) {
        .sidebar { position: fixed; left: -100%; top: 70px; bottom: 0; width: 260px; z-index: 1000; background: white; transition: 0.3s; }
        .sidebar.active { left: 0; }
        .mobile-header { display: flex; }
      }
    `;
    document.head.appendChild(style);
  }

  // --- NUEVO: SISTEMA DE SEGURIDAD ANTICOPIA/INSPECTOR ---
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
