"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
    ScanLine,
    Flashlight,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    MapPin,
    Box,
    Camera,
    UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateProductImage, updateProductLocation } from "@/app/actions/products";

type ScanResult =
    | { state: "idle" }
    | { state: "scanning" }
    | {
        state: "success";
        code: string;
        product: {
            id: string;
            name: string;
            stock: number;
            location: string | null;
            imageUrl: string | null;
            deposito: string | null;
            sector: string | null;
            fila: string | null;
            columna: string | null;
            estante: string | null;
            posicion: string | null;
        }
    }
    | { state: "not_found"; code: string }
    | { state: "error"; message: string };

// Dynamically load barcode detector (Web API, available in modern browsers)
declare global {
    interface Window {
        BarcodeDetector: any;
    }
}

export function BarcodeScanner() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<any>(null);
    const animFrameRef = useRef<number>(0);

    const [hasCamera, setHasCamera] = useState<boolean | null>(null);
    const [torch, setTorch] = useState(false);
    const [result, setResult] = useState<ScanResult>({ state: "idle" });
    const [manualCode, setManualCode] = useState("");
    const [showManual, setShowManual] = useState(false);

    // Image Upload State
    const [imgLoading, setImgLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Location Edit State
    const [showLocationEdit, setShowLocationEdit] = useState(false);
    const [locLoading, setLocLoading] = useState(false);
    const [locData, setLocData] = useState({
        deposito: "",
        sector: "",
        fila: "",
        columna: "",
        estante: "",
        posicion: "",
    });

    const stopCamera = useCallback(() => {
        cancelAnimationFrame(animFrameRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        setResult({ state: "idle" });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" }, // Cámara trasera
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // Inicializar BarcodeDetector (Chrome/Android nativo)
            if ("BarcodeDetector" in window) {
                detectorRef.current = new window.BarcodeDetector({
                    formats: [
                        "ean_13",
                        "ean_8",
                        "code_128",
                        "code_39",
                        "qr_code",
                        "upc_a",
                        "upc_e",
                    ],
                });
            }

            setHasCamera(true);
            scan();
        } catch {
            setHasCamera(false);
        }
    }, []); // eslint-disable-line

    const scan = useCallback(() => {
        const loop = async () => {
            if (!videoRef.current || !canvasRef.current || !detectorRef.current) {
                animFrameRef.current = requestAnimationFrame(loop);
                return;
            }

            const video = videoRef.current;
            if (video.readyState < 2) {
                animFrameRef.current = requestAnimationFrame(loop);
                return;
            }

            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.drawImage(video, 0, 0);

            try {
                const barcodes = await detectorRef.current.detect(canvas);
                if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    setResult({ state: "scanning" });
                    await handleDetected(code);
                    return; // Detener loop al encontrar
                }
            } catch {
                // BarcodeDetector aún cargando, ignorar
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
    }, []); // eslint-disable-line

    const handleDetected = async (code: string) => {
        stopCamera();
        setResult({ state: "scanning" });

        try {
            const res = await fetch(`/api/products/search?code=${encodeURIComponent(code)}`);
            if (res.ok) {
                const product = await res.json();
                setResult({ state: "success", code, product });
                setLocData({
                    deposito: product.deposito || "DEP01",
                    sector: product.sector || "",
                    fila: product.fila || "",
                    columna: product.columna || "",
                    estante: product.estante || "",
                    posicion: product.posicion || "",
                });
                setShowLocationEdit(false);
            } else if (res.status === 404) {
                setResult({ state: "not_found", code });
            } else {
                setResult({ state: "error", message: "Error al buscar el producto" });
            }
        } catch {
            setResult({ state: "error", message: "Sin conexión al servidor" });
        }
    };

    const toggleTorch = async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        try {
            await track.applyConstraints({
                advanced: [{ torch: !torch } as any],
            });
            setTorch(!torch);
        } catch {
            // Torch no soportado en este dispositivo
        }
    };

    const reset = () => {
        setResult({ state: "idle" });
        setManualCode("");
        setShowLocationEdit(false);
        startCamera();
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (result.state !== "success") return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Por favor selecciona un archivo de imagen válido.");
            return;
        }

        try {
            setImgLoading(true);

            const formData = new FormData();
            formData.append("file", file);
            formData.append("productId", result.product.id);

            const uploadRes = await fetch("/api/upload/image", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json();
                throw new Error(errorData.error || "Error al subir la imagen.");
            }

            const { url: uploadedUrl } = await uploadRes.json();

            const updateRes = await updateProductImage(result.product.id, uploadedUrl);

            if (!updateRes.ok) throw new Error(updateRes.error);

            toast.success("Fotografía actualizada exitosamente.");
            // Update local state to show new image
            setResult({
                ...result,
                product: { ...result.product, imageUrl: uploadedUrl }
            });
        } catch (error) {
            console.error(error);
            toast.error("Hubo un problema al subir la imagen.");
        } finally {
            setImgLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSaveLocation = async () => {
        if (result.state !== "success") return;
        try {
            setLocLoading(true);
            const formData = {
                deposito: locData.deposito,
                sector: locData.sector,
                fila: locData.fila,
                columna: locData.columna,
                estante: locData.estante,
                posicion: locData.posicion,
            };

            const updateRes = await updateProductLocation(result.product.id, formData);
            if (!updateRes.ok) throw new Error(updateRes.error);

            toast.success("Ubicación guardada correctamente");
            setShowLocationEdit(false);

            // Update local state to reflect the new location
            const ubicDisplay = [
                formData.deposito,
                formData.sector ? `${formData.sector}-` : "",
                formData.fila, formData.columna, formData.estante,
                formData.posicion ? `-${formData.posicion}` : ""
            ].filter(Boolean).join("").trim();

            setResult({
                ...result,
                product: { ...result.product, location: ubicDisplay || null, ...formData }
            });

        } catch (error) {
            console.error(error);
            toast.error("Error al guardar la ubicación");
        } finally {
            setLocLoading(false);
        }
    };


    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    return (
        <div className="flex flex-col h-full">
            {/* Viewport de cámara */}
            <div className="relative flex-1 bg-black overflow-hidden">
                <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de escaneo */}
                {result.state === "idle" && hasCamera && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {/* Marco de escaneo */}
                        <div className="relative h-56 w-72">
                            {/* Esquinas del marco */}
                            {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map(
                                (pos, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            "absolute h-8 w-8 border-white",
                                            pos,
                                            i === 0 && "border-t-2 border-l-2 rounded-tl-md",
                                            i === 1 && "border-t-2 border-r-2 rounded-tr-md",
                                            i === 2 && "border-b-2 border-l-2 rounded-bl-md",
                                            i === 3 && "border-b-2 border-r-2 rounded-br-md"
                                        )}
                                    />
                                )
                            )}
                            {/* Línea animada de escaneo */}
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-scan-line" />
                            <p className="absolute -bottom-8 left-0 right-0 text-center text-xs text-white/70">
                                Apuntá al código de barras
                            </p>
                        </div>
                    </div>
                )}

                {/* Sin cámara */}
                {hasCamera === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
                        <ScanLine className="h-12 w-12 opacity-40" />
                        <p className="text-sm opacity-70">Cámara no disponible</p>
                        <Button variant="outline" size="sm" onClick={() => setShowManual(true)}>
                            Ingresar código manual
                        </Button>
                    </div>
                )}

                {/* Scanning... overlay */}
                {result.state === "scanning" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="flex flex-col items-center gap-2 text-white">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p className="text-sm">Buscando producto...</p>
                        </div>
                    </div>
                )}

                {/* Controles superiores */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur-sm">
                        {hasCamera ? "Escáner activo" : "Iniciando..."}
                    </span>
                    <button
                        onClick={toggleTorch}
                        className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors",
                            torch ? "bg-yellow-400 text-black" : "bg-black/40 text-white"
                        )}
                    >
                        <Flashlight className="h-4 w-4" />
                    </button>
                </div>

                {/* Botón manual */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="rounded-full bg-black/40 px-4 py-1.5 text-xs text-white/80 backdrop-blur-sm"
                    >
                        Ingresar código manual
                    </button>
                </div>
            </div>

            {/* Panel de resultado */}
            {(result.state === "success" || result.state === "not_found" || result.state === "error") && (
                <div className="bg-background border-t border-border p-4 space-y-3">
                    {result.state === "success" && (
                        <>
                            <div className="flex items-start gap-4">
                                {result.product.imageUrl ? (
                                    <div className="relative h-16 w-16 shrink-0 rounded-md border border-border overflow-hidden bg-muted/50">
                                        <img
                                            src={result.product.imageUrl}
                                            alt={result.product.name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground font-mono">{result.code}</p>
                                        <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs font-semibold">
                                            <span>Stock:</span>
                                            <span className="text-foreground">{result.product.stock}</span>
                                        </div>
                                    </div>
                                    <p className="font-semibold text-foreground leading-tight mt-1">{result.product.name}</p>

                                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded border border-border/50">
                                        <MapPin className="h-3 w-3 text-primary" />
                                        <span>{result.product.location || "Sin ubicación"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <label className={cn(
                                    "flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-input bg-background/50 hover:bg-muted/50 transition-colors text-sm font-medium cursor-pointer",
                                    imgLoading && "opacity-50 pointer-events-none"
                                )}>
                                    {imgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                    <span>{result.product.imageUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                        disabled={imgLoading}
                                        ref={fileInputRef}
                                    />
                                </label>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-background/50"
                                    onClick={() => setShowLocationEdit(!showLocationEdit)}
                                >
                                    <Box className="mr-2 h-4 w-4" />
                                    Editar Ubic.
                                </Button>
                            </div>

                            {/* Location Edit Form */}
                            {showLocationEdit && (
                                <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-muted-foreground">Depósito</Label>
                                            <Input
                                                value={locData.deposito}
                                                onChange={e => setLocData({ ...locData, deposito: e.target.value.toUpperCase() })}
                                                placeholder="DEP01"
                                                className="h-8 text-xs font-mono uppercase"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-muted-foreground">Sector</Label>
                                            <Input
                                                value={locData.sector}
                                                onChange={e => setLocData({ ...locData, sector: e.target.value.toUpperCase() })}
                                                className="h-8 text-xs font-mono uppercase"
                                            />
                                        </div>
                                        {['fila', 'columna', 'estante', 'posicion'].map(field => (
                                            <div key={field} className="space-y-1">
                                                <Label className="text-[10px] uppercase text-muted-foreground">{field}</Label>
                                                <Input
                                                    value={locData[field as keyof typeof locData]}
                                                    onChange={e => setLocData({ ...locData, [field]: e.target.value.toUpperCase() })}
                                                    className="h-8 text-xs font-mono uppercase text-center"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        onClick={handleSaveLocation}
                                        disabled={locLoading}
                                        className="w-full h-8 text-xs"
                                    >
                                        {locLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                                        Guardar Ubicación
                                    </Button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-2 mt-2 pt-2 border-t border-border">
                                <Button variant="secondary" size="sm" onClick={reset}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Nuevo escaneo
                                </Button>
                            </div>
                        </>
                    )}

                    {result.state === "not_found" && (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold">Código no encontrado</p>
                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{result.code}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" onClick={reset}>
                                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                    Reintentar
                                </Button>
                                <Button size="sm">
                                    Agregar producto
                                </Button>
                            </div>
                        </>
                    )}

                    {result.state === "error" && (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                                    <X className="h-5 w-5 text-red-600" />
                                </div>
                                <p className="text-sm">{result.message}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={reset} className="w-full">
                                Reintentar
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* Input manual */}
            {showManual && (
                <div className="border-t border-border bg-background p-4 space-y-3">
                    <p className="text-sm font-medium">Código manual</p>
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && manualCode.trim()) {
                                    handleDetected(manualCode.trim());
                                    setShowManual(false);
                                }
                            }}
                            placeholder="Ej: 10-01 o 7790001234567"
                            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <Button
                            size="sm"
                            onClick={() => {
                                if (manualCode.trim()) {
                                    handleDetected(manualCode.trim());
                                    setShowManual(false);
                                }
                            }}
                        >
                            Buscar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
