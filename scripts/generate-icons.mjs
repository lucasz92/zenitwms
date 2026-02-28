/**
 * Script para generar los íconos PNG del PWA manifest usando canvas puro.
 * Crea los 5 tamaños: 72, 96, 128, 192, 512 en /public/icons/
 * 
 * Uso: node scripts/generate-icons.mjs
 */

import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log("📁 Carpeta /public/icons/ creada");
}

const SIZES = [72, 96, 128, 192, 512];

function drawIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    const r = size * 0.12; // border-radius

    // === Fondo redondeado ===
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

    // Fondo degradado
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, "#1a1a2e");
    bg.addColorStop(0.5, "#16213e");
    bg.addColorStop(1, "#2b2b2b");
    ctx.fillStyle = bg;
    ctx.fill();

    // === Rayo / Zap ===
    const cx = size / 2;
    const cy = size / 2;
    const scale = size / 512;

    // Halo glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.45);
    glow.addColorStop(0, "rgba(0, 123, 255, 0.35)");
    glow.addColorStop(1, "rgba(0, 123, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Dibujar el rayo (path en coordenadas relativas al centro, escalado)
    const s = size * 0.52; // tamaño del rayo relativo al canvas
    const x0 = cx - s * 0.18;
    const y0 = cy - s * 0.5;

    ctx.beginPath();
    // Forma del rayo (Z/zap shape)
    ctx.moveTo(cx + s * 0.08, cy - s * 0.5);   // arriba centro-derecha
    ctx.lineTo(cx - s * 0.22, cy + s * 0.02);  // mitad izquierda
    ctx.lineTo(cx + s * 0.06, cy + s * 0.02);  // hombro centro
    ctx.lineTo(cx - s * 0.08, cy + s * 0.5);   // abajo izquierda
    ctx.lineTo(cx + s * 0.22, cy - s * 0.02);  // mitad derecha
    ctx.lineTo(cx - s * 0.06, cy - s * 0.02);  // hombro centro
    ctx.closePath();

    // Gradiente del rayo
    const zapGrad = ctx.createLinearGradient(cx - s * 0.2, cy - s * 0.5, cx + s * 0.2, cy + s * 0.5);
    zapGrad.addColorStop(0, "#60b8ff");
    zapGrad.addColorStop(0.5, "#007BFF");
    zapGrad.addColorStop(1, "#4169E1");
    ctx.fillStyle = zapGrad;
    ctx.shadowColor = "#007BFF";
    ctx.shadowBlur = size * 0.12;
    ctx.fill();

    // Línea de brillo superior del rayo
    ctx.shadowBlur = 0;

    return canvas.toBuffer("image/png");
}

for (const size of SIZES) {
    const buffer = drawIcon(size);
    const outPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    fs.writeFileSync(outPath, buffer);
    console.log(`✅ icon-${size}x${size}.png generado`);
}

console.log("\n🎉 Todos los íconos fueron generados en /public/icons/");
