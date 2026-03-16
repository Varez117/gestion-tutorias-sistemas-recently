import { Database } from "./core/Database.js";
import { Auth } from "./core/Auth.js";
import { LoginController } from "./pages/LoginController.js";
import { AlumnoController } from "./pages/AlumnoController.js";
import { TutorController } from "./pages/TutorController.js";
import { AdminController } from "./pages/AdminController.js";
import { EncargadoController } from "./pages/EncargadoController.js";

const initApp = () => {
  console.log("🟢 main.js ejecutándose...");
  try {
    Database.init();
    console.log("🟢 Base de datos cargada.");
  } catch (e) {
    console.error("🔴 Error al inicializar base de datos:", e);
  }

  const pageId = document.body.id;
  console.log("🟢 Página detectada:", pageId);

  if (pageId === "page-login") {
    new LoginController();
  } else {
    const activeUser = Auth.checkAccess();
    if (!activeUser) return;

    switch (pageId) {
      case "page-alumno":
        new AlumnoController(activeUser);
        break;
      case "page-tutor":
        new TutorController(activeUser);
        break;
      case "page-admin":
        new AdminController(activeUser);
        break;
      case "page-encargado":
        new EncargadoController(activeUser);
        break;
    }
  }
};

// Arranque seguro sin importar cómo de rápido cargue el navegador
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
