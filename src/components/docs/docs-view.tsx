"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    FileText,
    MessageSquare,
    Plus,
    Trash2,
    UploadCloud,
    Search,
    Loader2,
    Printer,
    Edit3,
    Save
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
    deleteKnowledgeDocument,
    saveDocumentNote,
    updateKnowledgeDocument
} from "@/app/actions/knowledge";
import type { KnowledgeDocument, DocumentNote } from "@/lib/db/schema";

export type KnowledgeWithNotes = KnowledgeDocument & {
    notes: DocumentNote[];
};

export function DocsView({ documents }: { documents: KnowledgeWithNotes[] }) {
    const [search, setSearch] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<KnowledgeWithNotes | null>(null);

    // Form states
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter
    const filteredDocs = documents.filter(d =>
        (d.title.toLowerCase().includes(search.toLowerCase()) ||
            d.content.toLowerCase().includes(search.toLowerCase())) &&
        // Usamos el flag isActive=true para ocultar los que son puramente del "Cerebro IA" en el caso de uso compartido, 
        // o viceversa. Aquí dejaremos los mismos docs pero con interfaz blanda para usuarios normales.
        d.id // fallback placeholder
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
            toast.success("Documento creado.");
            setTitle("");
            setContent("");
            setIsCreating(false);
        } else {
            toast.error(res.error);
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string, docTitle: string) => {
        if (!confirm(`¿Estás seguro de eliminar el documento "${docTitle}"?`)) return;
        const res = await deleteKnowledgeDocument(id);
        if (res.success) toast.success("Documento eliminado.");
        else toast.error("Error al eliminar documento.");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target?.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsText(file);
            });

            setTitle(file.name.replace(/\.[^/.]+$/, ""));
            setContent(text);
            setIsCreating(true);
            toast.success("Archivo subido. Revisa y guarda.");
        } catch (error) {
            toast.error("Error leyendo el archivo.");
        }
        e.target.value = '';
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-3 justify-end items-center mb-6">
                <Button
                    onClick={() => setIsCreating(true)}
                    variant="default"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Manual
                </Button>

                <div className="relative">
                    <Button variant="secondary">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Archivo Texto / MD
                    </Button>
                    <input
                        type="file"
                        accept=".txt,.md,.csv,.json"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar manuales..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.length === 0 ? (
                        <div className="col-span-full border-2 border-dashed rounded-xl p-12 text-center bg-muted/20">
                            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <h3 className="text-lg font-medium">No hay documentación</h3>
                            <p className="text-sm text-muted-foreground mt-1">Sube archivos o redacta manuales para tu equipo.</p>
                        </div>
                    ) : (
                        filteredDocs.map((doc) => (
                            <Card
                                key={doc.id}
                                className="transition-all cursor-pointer hover:border-blue-300 relative group overflow-hidden"
                            >
                                <CardContent className="p-5" onClick={() => setSelectedDoc(doc)}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <h4 className="font-bold pr-8 leading-tight">{doc.title}</h4>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/30 p-3 rounded-lg border text-[11px] leading-relaxed">
                                        {doc.content.substring(0, 150)}...
                                    </p>

                                    <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                        <span>Última mod. {format(new Date(doc.updatedAt || doc.createdAt), "dd MMM, yy", { locale: es })}</span>
                                    </div>
                                </CardContent>

                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
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

            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Nuevo Documento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Título</label>
                            <Input
                                placeholder="Ej: Política de Seguridad 2024"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium justify-between flex">Contenido <span className="text-muted-foreground text-[10px] font-mono">Soporta Markdown</span></label>
                            <Textarea
                                className="min-h-[300px] leading-relaxed"
                                placeholder="Redacta el manual..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleCreate}
                            disabled={isSubmitting || !title || !content}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                            Guardar Manual
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <DocumentViewerModal
                doc={selectedDoc}
                open={!!selectedDoc}
                onClose={() => setSelectedDoc(null)}
                onUpdate={(newDoc) => {
                    const mappedDoc: KnowledgeWithNotes = { ...newDoc, notes: selectedDoc?.notes || [] };
                    setSelectedDoc(mappedDoc);
                    // Opcionalmente actualizar el array en memoria si lo deseamos, pero `docs` vienen del backend.
                }}
            />
        </div>
    );
}

function DocumentViewerModal({ doc, open, onClose, onUpdate }: { doc: KnowledgeWithNotes | null, open: boolean, onClose: () => void, onUpdate?: (doc: KnowledgeDocument) => void }) {
    const [note, setNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [isSavingDoc, setIsSavingDoc] = useState(false);

    useEffect(() => {
        if (doc) {
            setNote(doc.notes[0]?.notes || "");
            setEditTitle(doc.title);
            setEditContent(doc.content);
            setIsEditing(false); // reset on doc change
        }
    }, [doc]);

    if (!doc) return null;

    const handleSaveNote = async () => {
        setIsSaving(true);
        const res = await saveDocumentNote(doc.id, note);
        if (res.success) toast.success("Historial guardado.");
        else toast.error("Error al guardar");
        setIsSaving(false);
    };

    const handleSaveDoc = async () => {
        setIsSavingDoc(true);
        const res = await updateKnowledgeDocument(doc.id, { title: editTitle, content: editContent });
        if (res.success) {
            toast.success("Documento actualizado.");
            setIsEditing(false);
            if (onUpdate) {
                // Notifica al padre los datos nuevos
                onUpdate({ ...doc, title: editTitle, content: editContent } as KnowledgeDocument);
            }
        } else {
            toast.error("Error al actualizar");
        }
        setIsSavingDoc(false);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                setIsEditing(false);
                onClose();
            }
        }}>
            <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 flex flex-col md:flex-row overflow-hidden gap-0 bg-background print:max-w-full print:w-full print:border-none print:shadow-none print:h-auto">
                <DialogTitle className="sr-only">{doc.title}</DialogTitle>

                {/* Lector Principal */}
                <div className="flex-1 flex flex-col min-w-0 md:border-r overflow-hidden print:w-full">
                    <div className="p-4 border-b bg-muted/10 shrink-0 flex items-center justify-between print:hidden">
                        <div className="font-bold flex items-center gap-2 flex-1 mr-4">
                            <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                            {isEditing ? (
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="h-8 md:w-80"
                                />
                            ) : (
                                <span className="truncate" title={doc.title}>{doc.title}</span>
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {isEditing ? (
                                <Button size="sm" onClick={handleSaveDoc} disabled={isSavingDoc}>
                                    {isSavingDoc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    Guardar
                                </Button>
                            ) : (
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" title="Editar Documento" onClick={() => setIsEditing(true)}>
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Imprimir Documento" onClick={handlePrint}>
                                        <Printer className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="flex-1 print:h-auto print:overflow-visible relative">
                        {isEditing ? (
                            <div className="p-4 h-full">
                                <Textarea
                                    className="w-full h-full min-h-[500px] font-mono whitespace-pre-wrap leading-relaxed border-none focus-visible:ring-0 resize-none p-4"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="p-8 prose dark:prose-invert max-w-none prose-sm sm:prose-base prose-pre:bg-muted prose-pre:text-foreground print:p-0 print:prose-p:text-black">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {doc.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Comentarios Compartidos - Hidden while printing */}
                <div className="w-full md:w-80 lg:w-96 flex flex-col bg-muted/10 shrink-0 print:hidden border-t md:border-t-0">
                    <div className="p-4 border-b text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <MessageSquare className="h-4 w-4" /> Comentarios
                    </div>
                    <div className="flex-1 p-4">
                        <Textarea
                            className="w-full h-full resize-none bg-background shadow-inner font-mono text-sm leading-relaxed border-muted/50 focus-visible:ring-blue-500/50"
                            placeholder="Anotaciones referidas a este archivo..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                    <div className="p-4 border-t bg-background shrink-0">
                        <Button
                            className="w-full font-bold shadow-sm"
                            variant="secondary"
                            onClick={handleSaveNote}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Actualizar Comentarios
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
