import { Database } from "./core/Database.js";
import { Auth } from "./core/Auth.js";
import { LoginController } from "./pages/LoginController.js";
import { AlumnoController } from "./pages/AlumnoController.js";
import { TutorController } from "./pages/TutorController.js";
import { AdminController } from "./pages/AdminController.js";
import { EncargadoController } from "./pages/EncargadoController.js";

const initApp = () => {
  console.info("[SYS-1F3A]");
  try {
    Database.init();
    console.info("[SYS-7C9D]");
  } catch (e) {
    console.error("[ERR-A91X]", e);
  }

  const pageId = document.body.id;
  console.info("[SYS-22B7]");

  if (pageId === "page-login") {
    new LoginController();
  } else {
    const activeUser = Auth.checkAccess();
    if (!activeUser) {
      console.warn("[WRN-4E2C]");
      return;
    }

    switch (pageId) {
      case "page-alumno":
        console.info("[SYS-9D01]");
        new AlumnoController(activeUser);
        break;
      case "page-tutor":
        console.info("[SYS-3AC8]");
        new TutorController(activeUser);
        break;
      case "page-admin":
        console.info("[SYS-5F77]");
        new AdminController(activeUser);
        break;
      case "page-encargado":
        console.info("[SYS-8B2E]");
        new EncargadoController(activeUser);
        break;
      default:
        console.warn("[WRN-0Z11]");
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
