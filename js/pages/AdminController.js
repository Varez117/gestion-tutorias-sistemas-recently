import { Database } from '../core/Database.js';
import { UI } from '../components/UI.js';
import { Chatbot } from '../components/Chatbot.js';

export class AdminController {
    constructor(activeUser) {
        this.activeUser = activeUser;
        this.init();
    }

    init() {
        this.calcularMetricas();
        new Chatbot(this.activeUser, [
            { q: "¿Cómo determina la IA los Alertas de Rezago?", a: "Señala a alumnos en Baja Temporal o en 7mo semestre sin el 50% de tutorías acreditadas." }
        ]);
    }

    calcularMetricas() {
        try {
            const db = Database.get();
            let liberados = 0, elegibles = 0, enRiesgo = 0, enProceso = 0;

            db.alumnos.forEach(al => {
                const aprobadasAcad = al.historial_actividades.filter(a => UI.esAprobada(a.estado) && a.tipo === "Académica").length;
                const aprobadasExtra = al.historial_actividades.filter(a => UI.esAprobada(a.estado) && a.tipo === "Extraescolar").length;
                
                if (al.liberado) liberados++;
                else if (aprobadasAcad >= 2 && aprobadasExtra >= 2 && al.semestre >= 5) elegibles++;
                else if (al.estatus === "BAJA TEMPORAL" || (al.semestre >= 7 && aprobadasAcad + aprobadasExtra < 2)) enRiesgo++;
                else enProceso++;
            });

            document.getElementById("met-liberados").textContent = `${Math.round((liberados / db.alumnos.length) * 100)}%`;
            document.getElementById("met-riesgo").textContent = enRiesgo;
            document.getElementById("met-act").textContent = db.actividades_catalogo.length;

            const tbodyRiesgo = document.getElementById("tbody-riesgo");
            tbodyRiesgo.innerHTML = "";
            db.alumnos.filter(al => al.estatus === "BAJA TEMPORAL" || (al.semestre >= 7 && al.historial_actividades.filter(a => UI.esAprobada(a.estado)).length < 2))
                .forEach(al => {
                    tbodyRiesgo.innerHTML += `
                        <div class="flex justify-between items-center bg-white border-b border-slate-100 p-4 hover:bg-slate-50 transition-colors">
                            <div><p class="font-bold text-slate-800 text-sm">${al.nombre}</p><p class="text-[11px] text-slate-500 font-mono">${al.matricula} - Sem ${al.semestre}</p></div>
                            <span class="w-28 text-center bg-rose-50 text-rose-600 border border-rose-200 py-1 rounded-full text-[10px] font-bold">${al.estatus === "BAJA TEMPORAL" ? "BAJA TEMPORAL" : "REZAGO"}</span>
                        </div>`;
                });

            if (typeof Chart !== "undefined") {
                const ctxEstado = document.getElementById("chartEstado").getContext("2d");
                new Chart(ctxEstado, {
                    type: "doughnut",
                    data: {
                        labels: ["Liberados", "Elegibles", "En Proceso", "En Riesgo"],
                        datasets: [{ data: [liberados, elegibles, enProceso, enRiesgo], backgroundColor: ["#10b981", "#3b82f6", "#cbd5e1", "#f43f5e"], borderWidth: 0 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { usePointStyle: true, font: { family: "Montserrat", size: 10 } } } }, cutout: "75%" }
                });

                const ctxDemanda = document.getElementById("chartDemanda").getContext("2d");
                const nombresAct = db.actividades_catalogo.map(a => a.nombre.split(" ")[0] + " " + (a.nombre.split(" ")[1] || ""));
                const demandaAct = db.actividades_catalogo.map(a => Math.round((a.ocupados / a.cupo_max) * 100));
                
                new Chart(ctxDemanda, {
                    type: "bar",
                    data: {
                        labels: nombresAct,
                        datasets: [{ label: "% Ocupación", data: demandaAct, backgroundColor: "#1b396a", borderRadius: 4 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
                });
            }
        } catch (e) {
            console.error("Error cargando métricas:", e);
        }
    }
}