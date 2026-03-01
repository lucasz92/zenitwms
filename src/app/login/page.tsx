"use client";

import { useState, useEffect } from "react";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import * as SignUp from "@clerk/elements/sign-up";
import { Zap, Mail, Info, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function LoginNavbar() {
    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-8 py-6 bg-background/30 backdrop-blur-md"
        >
            <div className="flex items-center gap-3">
                <div className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#2d2d2d] shadow-lg transition-all hover:scale-110 active:scale-95">
                    <Zap className="h-5 w-5 text-white transition-transform group-hover:rotate-12" />
                    <div className="absolute inset-0 rounded-xl bg-primary/20 animate-pulse blur-sm -z-10" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-base tracking-tight text-[#2d2d2d]">Zenit WMS</span>
                    <span className="text-[9px] font-mono tracking-[0.2em] text-[#2d2d2d]/60 uppercase">Management System</span>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <a href="mailto:contacto@zenitwms.com" className="group relative py-1 text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-[#2d2d2d]/70 hover:text-[#2d2d2d] transition-colors">
                    <span className="flex items-center gap-2 italic"><Mail className="h-3 w-3" /> Contacto</span>
                    <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#2d2d2d] transition-all group-hover:w-full" />
                </a>
                <a href="#" className="group relative py-1 text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-[#2d2d2d]/70 hover:text-[#2d2d2d] transition-colors">
                    <span className="flex items-center gap-2 italic"><Info className="h-3 w-3" /> Información</span>
                    <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#2d2d2d] transition-all group-hover:w-full" />
                </a>
            </div>
        </motion.nav>
    );
}

// Discarded FloatingElements per user request "descarta las imagenes"
function BlueprintGrid() {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-[0.07]">
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(#2d2d2d 1px, transparent 1px),
                        linear-gradient(90deg, #2d2d2d 1px, transparent 1px),
                        linear-gradient(#2d2d2d 0.5px, transparent 0.5px),
                        linear-gradient(90deg, #2d2d2d 0.5px, transparent 0.5px)
                    `,
                    backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
                    backgroundPosition: '-1px -1px'
                }}
            />
            {/* Sutil vignette */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-white/80" />
        </div>
    );
}

export default function LoginPage() {
    const [isRightPanelActive, setPanelActive] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (window.location.hash === '#sign-up') {
            setPanelActive(true);
        }
    }, []);

    if (!mounted) return null;

    return (
        <div className="kinetic-auth-body">
            <LoginNavbar />
            <BlueprintGrid />

            {/* Background Grain/Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />


            <style dangerouslySetInnerHTML={{
                __html: `
                .kinetic-auth-body {
                    display: flex; align-items: center; justify-content: center;
                    min-height: 100vh; margin: 0; overflow: hidden;
                    padding: 1rem;
                    position: relative;

                      /* ─ Fondo base light mode ─ */
                    background-color: #fbfbfb;
                }
                .auth-card {
                    background-color: #ffffff; border-radius: 40px;
                    box-shadow:
                        0 20px 40px -10px rgba(0, 0, 0, 0.05),
                        0 0 1px 0 rgba(0, 0, 0, 0.1);
                    position: relative; overflow: hidden; width: 1000px;
                    max-width: 100%; min-height: 650px; display: flex;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .form-container {
                    position: absolute; top: 0; height: 100%; transition: all 0.8s cubic-bezier(0.8, 0, 0.2, 1);
                    width: 50%; display: flex; flex-direction: column; justify-content: center; z-index: 1;
                }
                .sign-in-container { left: 0; z-index: 2; }
                .sign-up-container { left: 0; opacity: 0; z-index: 1; }
                .auth-card.right-panel-active .sign-in-container { transform: translateX(100%); opacity: 0; }
                .auth-card.right-panel-active .sign-up-container { transform: translateX(100%); opacity: 1; z-index: 5; animation: show 0.6s; }
                @keyframes show {
                    0%, 49.99% { opacity: 0; z-index: 1; }
                    50%, 100% { opacity: 1; z-index: 5; }
                }
                .overlay-container {
                    position: absolute; top: 0; left: 50%; width: 50%; height: 100%;
                    overflow: hidden; transition: transform 0.8s cubic-bezier(0.8, 0, 0.2, 1); z-index: 100;
                }
                .auth-card.right-panel-active .overlay-container { transform: translateX(-100%); }
                .overlay {
                    background: linear-gradient(135deg, #007BFF 0%, #4169E1 55%, #2b2b2b 100%);
                    background-repeat: no-repeat; background-size: cover; background-position: 0 0;
                    color: #FFFFFF; position: relative; left: -100%; height: 100%; width: 200%;
                    transform: translateX(0); transition: transform 0.8s cubic-bezier(0.8, 0, 0.2, 1);
                }
                .auth-card.right-panel-active .overlay { transform: translateX(50%); }
                .overlay-panel {
                    position: absolute; display: flex; align-items: center; justify-content: center;
                    flex-direction: column; padding: 0 40px; text-align: center; top: 0; height: 100%;
                    width: 50%; transform: translateX(0); transition: transform 0.8s cubic-bezier(0.8, 0, 0.2, 1);
                }
                .overlay-left { transform: translateX(-20%); }
                .auth-card.right-panel-active .overlay-left { transform: translateX(0); }
                .overlay-right { right: 0; transform: translateX(0); }
                .auth-card.right-panel-active .overlay-right { transform: translateX(20%); }
                .spectral-blob {
                    position: absolute; width: 300px; height: 300px; background: rgba(255, 255, 255, 0.1);
                    filter: blur(60px); border-radius: 50%; z-index: 0; animation: pulse 8s infinite alternate;
                }
                @keyframes pulse {
                    0% { transform: scale(1) translate(0, 0); }
                    100% { transform: scale(1.2) translate(20px, 40px); }
                }
                .btn-ghost {
                    background: transparent; border: 2px solid rgba(255, 255, 255, 0.7); border-radius: 12px;
                    color: #fff; font-size: 13px; font-weight: 700; padding: 12px 40px; text-transform: uppercase;
                    letter-spacing: 0.5px; cursor: pointer; transition: all 0.3s ease;
                }
                .btn-ghost:hover { background: #fff; color: #007BFF; transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0, 123, 255, 0.3); }
                
                /* ─ Vignette central: oscurece bordes y enfoca la card ─ */
                .kinetic-auth-body::before {
                    content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
                    background: radial-gradient(
                        ellipse 70% 70% at 50% 50%,
                        transparent 40%,
                        rgba(176,196,226,0.25) 100%
                    );
                }

                /* ─ Rayo de energía diagonal: muy sutil, se mueve lentamente ─ */
                .kinetic-auth-body::after {
                    content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
                    background: linear-gradient(
                        125deg,
                        transparent 20%,
                        rgba(65,105,225,0.035) 40%,
                        rgba(0,123,255,0.025) 50%,
                        transparent 70%
                    );
                    background-size: 200% 200%;
                    animation: grid-sweep 10s ease-in-out infinite alternate;
                }

                @keyframes grid-sweep {
                    0%   { background-position: 0% 0%; }
                    100% { background-position: 100% 100%; }
                }

                /* Asegurar que la card quede sobre los pseudoelementos */
                .auth-card { position: relative; z-index: 1; }

                /* ── DARK MODE ── */
                @media (prefers-color-scheme: dark) {
                    .kinetic-auth-body {
                        background-color: #111827;
                        background-image:
                            radial-gradient(circle, rgba(0,123,255,0.45) 1px, transparent 1px),
                            linear-gradient(rgba(0,123,255,0.07) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,123,255,0.07) 1px, transparent 1px),
                            linear-gradient(rgba(0,123,255,0.14) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,123,255,0.14) 1px, transparent 1px);
                    }
                    .kinetic-auth-body::before {
                        background: radial-gradient(
                            ellipse 70% 70% at 50% 50%,
                            transparent 35%,
                            rgba(10,15,30,0.55) 100%
                        );
                    }
                    .kinetic-auth-body::after {
                        background: linear-gradient(
                            125deg,
                            transparent 20%,
                            rgba(0,123,255,0.06) 40%,
                            rgba(65,105,225,0.04) 50%,
                            transparent 70%
                        );
                        background-size: 200% 200%;
                    }
                }
                /* Clase .dark (toggle manual del dashboard) */
                .dark .kinetic-auth-body {
                    background-color: #111827;
                    background-image:
                        radial-gradient(circle, rgba(0,123,255,0.45) 1px, transparent 1px),
                        linear-gradient(rgba(0,123,255,0.07) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,123,255,0.07) 1px, transparent 1px),
                        linear-gradient(rgba(0,123,255,0.14) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,123,255,0.14) 1px, transparent 1px);
                }

                @media (max-width: 768px) {
                    .auth-card { flex-direction: column; min-height: 100dvh; width: 100%; border-radius: 0; border: none; }
                    .form-container { width: 100%; height: 60%; top: 0; padding: 1rem; }
                    .overlay-container { width: 100%; height: 40%; left: 0; top: 60%; }
                    .overlay { width: 200%; height: 100%; }
                    .overlay-panel { width: 50%; padding: 0 20px; }
                    .auth-card.right-panel-active .sign-in-container { transform: translateX(-100%); }
                    .auth-card.right-panel-active .sign-up-container { transform: translateX(0); left: 0; }
                    .sign-up-container { left: 100%; opacity: 1; }
                    .auth-card.right-panel-active .overlay-container { transform: translateX(0); }
                    .auth-card.right-panel-active .overlay { transform: translateX(-50%); }
                }
            ` }} />

            <div className={cn("auth-card", isRightPanelActive && "right-panel-active")}>

                {/* ---------- SIGN UP CONTAINER ---------- */}
                <div className="form-container sign-up-container bg-background">
                    <div className="flex flex-col items-center w-full px-4 md:px-12 text-center h-full overflow-y-auto justify-center py-6 styled-scrollbar">
                        <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Crear Cuenta</h1>
                        <p className="text-muted-foreground text-xs mb-6 font-mono uppercase tracking-widest">Registro</p>

                        <SignUp.Root>
                            <SignUp.Step name="start" className="w-full text-left space-y-4">
                                <span className="text-muted-foreground text-xs mb-4 text-center block">ingresá tus datos para continuar</span>

                                <div className="flex gap-4 w-full">
                                    <Clerk.Field name="firstName" className="w-1/2">
                                        <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Nombre</Clerk.Label>
                                        <Clerk.Input className="bg-muted/60 border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:border-blue-500 focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-blue-500/15 focus:shadow-none outline-none w-full placeholder:text-muted-foreground/60" />
                                        <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1" />
                                    </Clerk.Field>

                                    <Clerk.Field name="lastName" className="w-1/2">
                                        <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Apellido</Clerk.Label>
                                        <Clerk.Input className="bg-muted/60 border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:border-blue-500 focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-blue-500/15 focus:shadow-none outline-none w-full placeholder:text-muted-foreground/60" />
                                        <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1" />
                                    </Clerk.Field>
                                </div>

                                <Clerk.Field name="username">
                                    <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Nombre de usuario</Clerk.Label>
                                    <Clerk.Input className="bg-muted/60 border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:border-blue-500 focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-blue-500/15 focus:shadow-none outline-none w-full placeholder:text-muted-foreground/60" />
                                    <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1" />
                                </Clerk.Field>

                                <Clerk.Field name="emailAddress">
                                    <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Correo electrónico</Clerk.Label>
                                    <Clerk.Input className="bg-muted/60 border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:border-blue-500 focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-blue-500/15 focus:shadow-none outline-none w-full placeholder:text-muted-foreground/60" type="email" />
                                    <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1" />
                                </Clerk.Field>

                                <Clerk.Field name="password">
                                    <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Contraseña</Clerk.Label>
                                    <Clerk.Input className="bg-muted/60 border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:border-blue-500 focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-blue-500/15 focus:shadow-none outline-none w-full placeholder:text-muted-foreground/60" type="password" />
                                    <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1" />
                                </Clerk.Field>

                                <SignUp.Action submit className="w-full mt-4 h-12 rounded-xl bg-foreground text-background font-bold text-[13px] uppercase tracking-wide shadow-md hover:shadow-lg transition-all active:scale-95 border-none">
                                    CONTINUAR
                                </SignUp.Action>
                            </SignUp.Step>

                            <SignUp.Step name="verifications" className="w-full text-left space-y-4">
                                <SignUp.Strategy name="email_code">
                                    <h2 className="text-center font-bold text-lg mb-2">Revisá tu email</h2>
                                    <p className="text-center text-sm text-muted-foreground mb-4">Te enviamos un código de verificación.</p>
                                    <Clerk.Field name="code">
                                        <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Código de verificación</Clerk.Label>
                                        <Clerk.Input className="bg-muted/50 border-2 border-transparent focus:border-primary focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-primary/10 outline-none w-full text-center tracking-widest" />
                                        <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1 block text-center" />
                                    </Clerk.Field>
                                    <SignUp.Action submit className="w-full mt-6 h-12 rounded-xl bg-foreground text-background font-bold text-[13px] uppercase tracking-wide shadow-md hover:shadow-lg transition-all active:scale-95 border-none">
                                        VERIFICAR
                                    </SignUp.Action>
                                </SignUp.Strategy>
                            </SignUp.Step>
                        </SignUp.Root>
                    </div>
                </div>

                {/* ---------- SIGN IN CONTAINER ---------- */}
                <div className="form-container sign-in-container bg-background">
                    <div className="flex flex-col items-center w-full px-4 md:px-12 text-center h-full overflow-y-auto justify-center py-6 styled-scrollbar">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary shadow-sm">
                                <Zap className="h-3 w-3 text-primary-foreground" />
                            </div>
                            <span className="font-bold text-sm tracking-tight text-muted-foreground">Zenit WMS</span>
                        </div>
                        <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Bienvenido</h1>
                        <p className="text-muted-foreground text-xs mb-8 font-mono uppercase tracking-widest">Acceso al sistema</p>

                        <SignIn.Root>
                            {/* Paso Base: Iniciar con Cuenta / Continuar */}
                            <SignIn.Step name="start" className="w-full text-left space-y-5">
                                <span className="text-muted-foreground text-xs mb-4 text-center block">ingresá tus credenciales</span>

                                <Clerk.Field name="identifier">
                                    <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Correo o nombre de usuario</Clerk.Label>
                                    <Clerk.Input className="bg-muted/60 border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:border-blue-500 focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-blue-500/15 focus:shadow-none outline-none w-full placeholder:text-muted-foreground/60" />
                                    <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1 block" />
                                </Clerk.Field>

                                <SignIn.Action submit className="w-full mt-4 h-12 rounded-xl bg-foreground text-background font-bold text-[13px] uppercase tracking-wide shadow-md hover:shadow-lg transition-all active:scale-95 border-none">
                                    CONTINUAR
                                </SignIn.Action>

                                <div className="text-center mt-6 flex flex-col items-center justify-center opacity-70">
                                    <div className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                                        <Zap className="h-3 w-3" /> Protegido por Clerk
                                    </div>
                                </div>
                            </SignIn.Step>

                            {/* Paso "choose-strategy": elegir método cuando hay múltiples estrategias */}
                            <SignIn.Step name="choose-strategy" className="w-full text-left space-y-4">
                                <h2 className="text-center font-bold text-xl tracking-tight mb-1">Elegí cómo ingresar</h2>
                                <p className="text-center text-sm text-muted-foreground mb-4">Seleccioná un método de verificación.</p>

                                <SignIn.SupportedStrategy name="password">
                                    <SignIn.Action navigate="previous" className="w-full h-11 rounded-xl border-2 border-border bg-muted/40 px-4 text-sm font-semibold hover:bg-muted/70 transition-all">
                                        Contraseña
                                    </SignIn.Action>
                                </SignIn.SupportedStrategy>

                                <SignIn.SupportedStrategy name="email_code">
                                    <SignIn.Action navigate="previous" className="w-full h-11 rounded-xl border-2 border-border bg-muted/40 px-4 text-sm font-semibold hover:bg-muted/70 transition-all">
                                        Código por email
                                    </SignIn.Action>
                                </SignIn.SupportedStrategy>
                            </SignIn.Step>

                            {/* Paso secundario: Contraseña */}
                            <SignIn.Step name="verifications" className="w-full text-left space-y-5">
                                <h2 className="text-center font-bold text-xl tracking-tight mb-2">Verificá tu identidad</h2>
                                <p className="text-center text-sm text-muted-foreground mb-6">Bienvenido. Ingresá tu contraseña para continuar.</p>

                                <SignIn.Strategy name="password">
                                    <Clerk.Field name="password">
                                        <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Contraseña</Clerk.Label>
                                        <Clerk.Input className="bg-muted/60 border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:border-blue-500 focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-blue-500/15 focus:shadow-none outline-none w-full placeholder:text-muted-foreground/60" type="password" />
                                        <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1 block" />
                                    </Clerk.Field>

                                    <SignIn.Action submit className="w-full mt-6 h-12 rounded-xl bg-foreground text-background font-bold text-[13px] uppercase tracking-wide shadow-md hover:shadow-lg transition-all active:scale-95 border-none">
                                        INGRESAR
                                    </SignIn.Action>
                                </SignIn.Strategy>

                                <SignIn.Strategy name="email_code">
                                    <Clerk.Field name="code">
                                        <Clerk.Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1 block">Código de verificación</Clerk.Label>
                                        <Clerk.Input className="bg-muted/60 border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:border-blue-500 focus:bg-background rounded-xl px-4 py-3 h-12 text-sm transition-all focus:ring-4 focus:ring-blue-500/15 focus:shadow-none outline-none w-full text-center tracking-widest" />
                                        <Clerk.FieldError className="text-red-500 text-xs mt-1 ml-1 block text-center" />
                                    </Clerk.Field>
                                    <SignIn.Action submit className="w-full mt-6 h-12 rounded-xl bg-foreground text-background font-bold text-[13px] uppercase tracking-wide shadow-md hover:shadow-lg transition-all active:scale-95 border-none">
                                        VERIFICAR
                                    </SignIn.Action>
                                </SignIn.Strategy>
                            </SignIn.Step>


                        </SignIn.Root>
                    </div>
                </div>

                {/* ---------- OVERLAY CONTAINER (Hero Panel) ---------- */}
                <div className="overlay-container">
                    <div className="overlay pointer-events-none">
                        <div className="spectral-blob" style={{ top: '-10%', left: '-10%' }}></div>
                        <div className="spectral-blob" style={{ bottom: '-10%', right: '-10%', animationDelay: '2s' }}></div>

                        <div className="overlay-panel overlay-left pointer-events-auto">
                            <h2 className="text-4xl font-extrabold mb-4 text-white">¡Hola!</h2>
                            <p className="mb-8 font-light text-primary-foreground/80 leading-relaxed text-center max-w-[80%] mx-auto">
                                Ingresá tus datos y empezá a gestionar tu inventario.
                            </p>
                            <button
                                className="btn-ghost"
                                onClick={() => {
                                    setPanelActive(false);
                                    window.history.pushState(null, '', '/login#sign-in');
                                }}
                            >
                                Iniciar Sesión
                            </button>
                        </div>

                        <div className="overlay-panel overlay-right pointer-events-auto">
                            <h2 className="text-4xl font-extrabold mb-4 text-white">¡Nos alegra verte!</h2>
                            <p className="mb-8 font-light text-primary-foreground/80 leading-relaxed text-center max-w-[80%] mx-auto">
                                Mantené tu flujo de trabajo ágil y siempre conectado.
                            </p>
                            <button
                                className="btn-ghost"
                                onClick={() => {
                                    setPanelActive(true);
                                    window.history.pushState(null, '', '/login#sign-up');
                                }}
                            >
                                Registrarse
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .styled-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .styled-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .styled-scrollbar::-webkit-scrollbar-thumb {
                    background-color: var(--muted);
                    border-radius: 10px;
                }
                .styled-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: var(--muted-foreground);
                }
            `}} />
        </div>
    );
}
