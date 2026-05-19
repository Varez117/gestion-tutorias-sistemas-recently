import { mockDB } from "../data.js";

export class Database {
  static DB_KEY = "tutoria_db_v6";

  static init() {
    if (!localStorage.getItem(this.DB_KEY)) {
      localStorage.setItem(this.DB_KEY, JSON.stringify(mockDB));
    }
  }

  static get() {
    return JSON.parse(localStorage.getItem(this.DB_KEY));
  }

  static save(data) {
    localStorage.setItem(this.DB_KEY, JSON.stringify(data));
  }

  static getAlumno(id) {
    const db = this.get();
    return db.alumnos.find((a) => a.id === id);
  }

  /**
   * Recupera la información de un tutor por su ID
   */
  static getTutor(id) {
    const db = this.get();
    return db.tutores.find((t) => t.id === id);
  }

  static updateUser(refId, data) {
    const db = this.get();
    const index = db.alumnos.findIndex((a) => a.id === refId);

    if (index !== -1) {
      db.alumnos[index] = { ...db.alumnos[index], ...data };
      this.save(db);

      window.dispatchEvent(new CustomEvent("db_updated"));
      return true;
    }
    return false;
  }
}
