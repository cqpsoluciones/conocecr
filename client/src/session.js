// client/src/session.js
// Manejo centralizado de la sesión del usuario consumidor.
// Usa claves propias ("conoce_user_*") para no chocar con el token del admin.

const TOKEN_KEY = 'conoce_user_token';
const USER_KEY = 'conoce_user_data';

export function guardarSesion(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function obtenerUsuario() {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function haySesion() {
  return !!obtenerToken();
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}