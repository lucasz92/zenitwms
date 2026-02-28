"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Brain,
    FileText,
    MessageSquare,
    Plus,
    Trash2,
    UploadCloud,
    Power,
    Search,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import {
    createKnowledgeDocument,
    toggleKnowledgeDocumentActive,
    deleteKnowledgeDocument,
    saveDocumentNote
} from "@/app/actions/knowledge";
import type { KnowledgeDocument, DocumentNote } from "@/lib/db/schema";

export type KnowledgeWithNotes = KnowledgeDocument & {
    notes: DocumentNote[];
};

export function KnowledgeView({ documents }: { documents: KnowledgeWithNotes[] }) {
    const [search, setSearch] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<KnowledgeWithNotes | null>(null);

    // Form states
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter
    const filteredDocs = documents.filter(d =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.content.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        if (!title.trim() || !content.trim()) {
            toast.error("El título y el contenido son obligatorios");
            return;
        }

        setIsSubmitting(true);
        const res = await createKnowledgeDocument({
            title: title.trim(),
            content: content.trim(),
            type: "MARKDOWN"
        });

        if (res.success) {
            toast.success("Documento insertado en el cerebro IA.");
            setTitle("");
            setContent("");
            setIsCreating(false);
        } else {
            toast.error(res.error);
        }
        setIsSubmitting(false);
    };

    const handleToggleState = async (id: string, currentState: boolean) => {
        const res = await toggleKnowledgeDocumentActive(id, currentState);
        if (res.success) toast.success(currentState ? "Documento desactivado" : "Documento activado");
        else toast.error("Error al cambiar estado");
    };

    const handleDelete = async (id: string, docTitle: string) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar el documento "${docTitle}" permanentemente?`)) return;
        const res = await deleteKnowledgeDocument(id);
        if (res.success) toast.success("Documento eliminado.");
        else toast.error("Error al eliminar documento.");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Nota: El PDF Parser nativo se mueve en V2, por lo que usaremos solo TXT/MD/CSV de momento
            // o delegaremos a un lector. Mantenemos el Text File Reader básico.
            const text = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target?.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsText(file);
            });

            setTitle(file.name.replace(/\.[^/.]+$/, "")); // Quitar extensión
            setContent(text);
            setIsCreating(true);
            toast.success("Archivo importado. Revisa y guarda.");
        } catch (error) {
            toast.error("Error leyendo el archivo. Soporte ideal: .txt, .md, .csv");
        }
        e.target.value = '';
    };

    return (
        <div className="space-y-6">
            {/* Header Cerebro IA (Decorativo inspirado en V1) */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-2 flex items-center gap-2"><Brain className="animate-pulse" /> Cerebro IA</h3>
                    <p className="opacity-90 max-w-2xl text-sm mb-6">
                        Aquí puedes enseñarle a tu asistente inteligente las reglas de la empresa. Las guías operativas, políticas de devoluciones, y reglas
                        de stock que estén <Badge className="bg-green-500 hover:bg-green-600 text-[10px] ml-1 mr-1">Activas</Badge> son inyectadas en la memoria del agente.
                    </p>

                    <div className="flex gap-3">
                        <Button
                            onClick={() => setIsCreating(true)}
                            className="bg-white text-purple-700 hover:bg-purple-50 font-bold border-0"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar Instrucción
                        </Button>

                        <div className="relative">
                            <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20 hover:text-white border-white/20">
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Importar Archivo
                            </Button>
                            <input
                                type="file"
                                accept=".txt,.md,.csv,.json"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                title="Importar texto o markdown"
                            />
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            </div>

            {/* Listado de Documentos */}
            <div className="space-y-4">
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar conocimientos..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.length === 0 ? (
                        <div className="col-span-full border-2 border-dashed rounded-xl p-12 text-center bg-muted/20">
                            <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <h3 className="text-lg font-medium">Bóveda Vacía</h3>
                            <p className="text-sm text-muted-foreground mt-1">El asistente IA no tiene directivas de empresa registradas.</p>
                        </div>
                    ) : (
                        filteredDocs.map((doc) => (
                            <Card
                                key={doc.id}
                                className={cn(
                                    "transition-all cursor-pointer hover:border-purple-300 relative group overflow-hidden",
                                    !doc.isActive && "opacity-60 bg-muted/50 grayscale-[50%]"
                                )}
                            >
                                <CardContent className="p-5" onClick={() => setSelectedDoc(doc)}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("p-1.5 rounded-lg", doc.isActive ? "bg-purple-100 text-purple-600" : "bg-muted text-muted-foreground")}>
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <h4 className="font-bold pr-14 leading-tight">{doc.title}</h4>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/30 p-3 rounded-lg border font-mono text-[11px] leading-relaxed">
                                        {doc.content}
                                    </p>

                                    <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("h-2 w-2 rounded-full", doc.isActive ? "bg-green-500" : "bg-slate-400")} />
                                            {doc.isActive ? "Activo" : "Inactivo"}
                                        </div>
                                        <span>Modificado el {format(new Date(doc.updatedAt || doc.createdAt), "dd MMM, yy", { locale: es })}</span>
                                    </div>
                                </CardContent>

                                {/* Acciones rápidas flotantes */}
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant={doc.isActive ? "secondary" : "default"}
                                        size="icon"
                                        className={cn("h-7 w-7 rounded-full shadow-sm", doc.isActive ? "" : "bg-green-600 hover:bg-green-700")}
                                        onClick={(e) => { e.stopPropagation(); handleToggleState(doc.id, doc.isActive); }}
                                        title={doc.isActive ? "Desactivar de IA" : "Reactivar"}
                                    >
                                        <Power className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-7 w-7 rounded-full shadow-sm"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.id, doc.title); }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* CREAR DOCUMENTO MODAL */}
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Nueva Instrucción para Inteligencia Artificial</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Título Referencial</label>
                            <Input
                                placeholder="Ej: Protocolo de Devoluciones (Electrodomésticos)"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex justify-between">
                                Contexto / Cuerpo del Documento
                                <span className="text-muted-foreground text-[10px] font-mono">Soporta Markdown</span>
                            </label>
                            <Textarea
                                className="min-h-[250px] font-mono text-xs leading-relaxed bg-muted/20"
                                placeholder="Escribe el conocimiento aquí. La IA leerá este texto textualmente."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={handleCreate}
                            disabled={isSubmitting || !title || !content}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                            Inyectar Conocimiento
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* VIEW DOCUMENT MODAL (El "Viewer" complejo del código anterior) */}
            <DocumentViewerModal
                doc={selectedDoc}
                open={!!selectedDoc}
                onClose={() => setSelectedDoc(null)}
            />
        </div>
    );
}

// Subcomponente encapsulado para ver y comentar
function DocumentViewerModal({ doc, open, onClose }: { doc: KnowledgeWithNotes | null, open: boolean, onClose: () => void }) {
    const [note, setNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Sync state internally when doc changes
    useEffect(() => {
        if (doc) {
            setNote(doc.notes[0]?.notes || "");
        }
    }, [doc]);

    if (!doc) return null;

    const handleSaveNote = async () => {
        setIsSaving(true);
        const res = await saveDocumentNote(doc.id, note);
        if (res.success) toast.success("Nota de gestión guardada.");
        else toast.error("Error al guardar nota");
        setIsSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col md:flex-row overflow-hidden gap-0 bg-background">
                {/* Lector Markdown Principal */}
                <div className="flex-1 flex flex-col min-w-0 border-r">
                    <div className="p-4 border-b bg-muted/10 shrink-0 flex items-center justify-between">
                        <div className="font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-600" />
                            {doc.title}
                        </div>
                        <Badge variant={doc.isActive ? "default" : "secondary"}>
                            {doc.isActive ? "Memoria Activa" : "Oculto para IA"}
                        </Badge>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-8 prose dark:prose-invert max-w-none prose-sm sm:prose-base prose-pre:bg-muted prose-pre:text-foreground prose-a:text-purple-600">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {doc.content}
                            </ReactMarkdown>
                        </div>
                    </ScrollArea>
                </div>

                {/* Columna de Notas de Gestión */}
                <div className="w-full md:w-80 flex flex-col bg-muted/10 shrink-0">
                    <div className="p-4 border-b text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <MessageSquare className="h-4 w-4" /> Notas de Gestión
                    </div>
                    <div className="flex-1 p-4">
                        <Textarea
                            className="w-full h-full resize-none bg-background shadow-inner font-mono text-sm leading-relaxed border-muted/50 focus-visible:ring-purple-500/50"
                            placeholder="Añade excepciones, cambios pendientes o información sensible de uso interno exclusivo para este protocolo (La IA no lee esto)..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                    <div className="p-4 border-t bg-background shrink-0">
                        <Button
                            className="w-full font-bold shadow-sm border"
                            variant="secondary"
                            onClick={handleSaveNote}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Guardar Notas
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
