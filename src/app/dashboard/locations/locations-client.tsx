"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, List, Plus } from "lucide-react";
import { WarehouseMap } from "@/components/locations/warehouse-map";
import { LocationsTable } from "@/components/locations/locations-table";
import { CreateRackModal } from "@/components/locations/create-rack-modal";
import { AssignProductModal } from "@/components/locations/assign-product-modal";
import { Button } from "@/components/ui/button";
import type { LocationRow } from "@/lib/db/queries/locations";

interface LocationsClientProps {
    locations: LocationRow[];
    products: { id: string; code: string; name: string }[];
}

export function LocationsClient({ locations, products }: LocationsClientProps) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<LocationRow | null>(null);

    return (
        <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Tabs defaultValue="map" className="w-full sm:w-auto">
                    <TabsList className="w-full sm:w-auto grid w-full grid-cols-2">
                        <TabsTrigger value="map" className="flex items-center gap-2">
                            <Map className="h-4 w-4" /> Mapa Visual
                        </TabsTrigger>
                        <TabsTrigger value="list" className="flex items-center gap-2">
                            <List className="h-4 w-4" /> Vista Lista
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-4 border border-border/60 bg-card rounded-xl p-1 shadow-sm">
                        <TabsContent value="map" className="m-0 border-none p-0 outline-none">
                            {locations.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                    <Map className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                    <h3 className="font-semibold text-lg">El mapa está vacío</h3>
                                    <p className="text-sm text-muted-foreground mb-4">Aún no hay estanterías físicas registradas en el sistema.</p>
                                    <Button onClick={() => setCreateModalOpen(true)} size="sm">
                                        <Plus className="mr-2 h-4 w-4" /> Dibujar primer estantería
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-4 md:p-6 bg-background rounded-lg">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex gap-4 text-xs font-medium border rounded-md px-3 py-1.5 bg-muted/30">
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-muted border" /> Vacío</div>
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300" /> Parcial</div>
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300" /> Lleno</div>
                                        </div>
                                        <Button onClick={() => setCreateModalOpen(true)} variant="outline" size="sm" className="hidden sm:flex">
                                            <Plus className="mr-2 h-3.5 w-3.5" /> Nueva Estantería
                                        </Button>
                                    </div>

                                    <WarehouseMap locations={locations} onSelectCell={setSelectedLocation} />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="list" className="m-0 border-none p-4 md:p-6 outline-none bg-background rounded-lg">
                            <LocationsTable locations={locations} onSelect={setSelectedLocation} onCreate={() => setCreateModalOpen(true)} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <CreateRackModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
            <AssignProductModal location={selectedLocation} onClose={() => setSelectedLocation(null)} products={products} />
        </div>
    );
}
