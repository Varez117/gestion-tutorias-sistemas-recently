import { Database } from './Database.js';
import { UI } from '../components/UI.js';

export class Auth {
    static login(user, pass, role) {
        const db = Database.get();
        const userMatch = db.auth_users.find(x => x.user === user && x.pass === pass && x.role === role);
        
        if (userMatch) {
            sessionStorage.setItem('activeUser', JSON.stringify(userMatch));
            UI.showToast("Autenticación verificada. Iniciando sesión...", "success");
            setTimeout(() => window.location.href = `${userMatch.role}.html`, 600);
            return true;
        }
        UI.showToast("Credenciales incorrectas.", "error");
        return false;
    }

    static logout() {
        sessionStorage.removeItem('activeUser');
        window.location.href = 'index.html';
    }

    static getActiveUser() {
        return JSON.parse(sessionStorage.getItem('activeUser'));
    }

    static checkAccess() {
        const user = this.getActiveUser();
        const isLoginPage = document.getElementById('page-login');
        
        if (!user && !isLoginPage) {
            window.location.href = 'index.html';
            return null;
        }
        return user;
    }
}

window.cerrarSesion = Auth.logout;