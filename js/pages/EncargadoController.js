import { Database } from '../core/Database.js';
import { UI } from '../components/UI.js';
import { Chatbot } from '../components/Chatbot.js';

export class EncargadoController {
    constructor(activeUser) {
        this.activeUser = activeUser;
        window.evaluarAlumno = this.evaluarAlumno.bind(this);
        this.init();
    }

    init() {
        const idAct = this.activeUser.idActividad;
        const actividad = Database.get().actividades_catalogo.find(a => a.id === idAct);
        document.getElementById("nombre-act").textContent = actividad.nombre;
        
        this.renderEvaluacion();
        new Chatbot(this.activeUser, [
            { q: "¿Por qué no me aparecen alumnos para evaluar?", a: "Solo aparecen los inscritos formalmente este semestre." }
        ]);
    }

    renderEvaluacion() {
        const container = document.getElementById("tbody-evaluacion");
        container.innerHTML = "";
        const idAct = this.activeUser.idActividad;
        const alumnosCursando = Database.get().alumnos.filter(a => a.actividad_actual && a.actividad_actual.id_actividad === idAct);

        if (alumnosCursando.length === 0) {
            container.innerHTML = `<div class="text-center py-12 text-slate-500 font-medium">No hay alumnos pendientes por evaluar.</div>`;
            return;
        }

        alumnosCursando.forEach(alumno => {
            container.innerHTML += `
                <div class="flex flex-col md:grid md:grid-cols-4 md:items-center bg-white border-b border-slate-100 p-4 md:py-5 hover:bg-slate-50 transition-colors gap-4 md:gap-0">
                    <div class="md:col-span-2"><p class="font-extrabold text-slate-800 text-sm md:text-base">${alumno.nombre}</p><p class="text-[11px] text-slate-500 font-mono tracking-wide uppercase">${alumno.matricula} - ${alumno.carrera}</p></div>
                    <div class="md:text-center"><span class="w-32 inline-block text-center bg-slate-100 text-slate-500 py-1.5 rounded-full text-[10px] font-bold border border-slate-200">CURSANDO</span></div>
                    <div class="flex flex-col sm:flex-row gap-2 md:justify-end">
                        <select id="eval-${alumno.id}" class="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 focus:border-[#1b396a] outline-none shadow-sm">
                            <option value="">Seleccionar...</option><option value="Excelente" class="text-emerald-600">Excelente</option><option value="Notable" class="text-blue-600">Notable</option><option value="Suficiente" class="text-slate-700">Suficiente</option><option value="Insuficiente" class="text-rose-600">Insuficiente</option>
                        </select>
                        <button onclick="evaluarAlumno(${alumno.id})" class="w-full sm:w-auto bg-[#1b396a] text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md">Evaluar</button>
                    </div>
                </div>`;
        });
    }

    evaluarAlumno(idAlumno) {
        const calificacion = document.getElementById(`eval-${idAlumno}`).value;
        if (!calificacion) return UI.showToast("Selecciona el nivel de competencia primero.", "error");

        const db = Database.get();
        const al = db.alumnos.find(a => a.id === idAlumno);
        
        UI.confirmarAccion("Confirmar Calificación", `¿Asentar <b>"${calificacion}"</b> a ${al.nombre}?`, "Asentar", () => {
            al.historial_actividades.push({ id_actividad: al.actividad_actual.id_actividad, nombre: al.actividad_actual.nombre, tipo: al.actividad_actual.tipo, estado: calificacion });
            al.actividad_actual = null;
            Database.save(db);
            UI.showToast(`Evaluado correctamente.`, "success");
            this.renderEvaluacion();
        });
    }
}