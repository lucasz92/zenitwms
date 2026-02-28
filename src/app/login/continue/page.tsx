/**
 * /login/continue — Clerk Elements navega aquí automáticamente cuando el usuario
 * completa el paso "start" (ingresa email/usuario) y hay múltiples estrategias.
 * Renderizamos el mismo LoginPage: Clerk.SignIn.Root detecta la URL y muestra
 * el paso "choose-strategy" o "verifications" según corresponda.
 */
export { default } from "../page";
