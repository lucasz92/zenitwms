export type UnitType = "un" | "mt" | "mt2" | "kg" | "lt" | "caja";
export type StockStatus = "ok" | "low" | "critical" | "out";

export interface Product {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    price?: number | null;
    stock: number;
    min_stock: number;
    unit_type: UnitType;
    image_url?: string | null;
    location?: string | null; // primary location display string
    created_at: string;
    updated_at: string;
}

export interface ProductFormData {
    code: string;
    name: string;
    description: string;
    price: string;
    stock: string;
    min_stock: string;
    unit_type: UnitType;
}

export function getStockStatus(stock: number, min_stock: number): StockStatus {
    if (stock === 0) return "out";
    if (stock <= min_stock * 0.5) return "critical";
    if (stock <= min_stock) return "low";
    return "ok";
}

export const UNIT_LABELS: Record<UnitType, string> = {
    un: "Unidad",
    mt: "Metro",
    mt2: "Metro²",
    kg: "Kilogramo",
    lt: "Litro",
    caja: "Caja",
};

// ── Mock data (remove once Supabase is connected) ──────────────
export const MOCK_PRODUCTS: Product[] = [
    {
        id: "1",
        code: "10-01",
        name: "Caño PVC 110mm",
        description: "Caño PVC sanitario 110mm x 3m",
        price: 4500,
        stock: 48,
        min_stock: 20,
        unit_type: "un",
        location: "D1 / A-01 / C1",
        created_at: "2025-01-10T10:00:00Z",
        updated_at: "2025-02-20T15:30:00Z",
    },
    {
        id: "2",
        code: "10-02",
        name: "Codo PVC 90° 110mm",
        description: "Codo PVC sanitario 90 grados 110mm",
        price: 850,
        stock: 8,
        min_stock: 15,
        unit_type: "un",
        location: "D1 / A-01 / C2",
        created_at: "2025-01-10T10:00:00Z",
        updated_at: "2025-02-22T09:00:00Z",
    },
    {
        id: "3",
        code: "20-01",
        name: "Cable NYY 2x1.5mm",
        description: "Cable eléctrico doble 1.5mm²",
        price: null,
        stock: 0,
        min_stock: 50,
        unit_type: "mt",
        location: null,
        created_at: "2025-02-01T08:00:00Z",
        updated_at: "2025-02-25T11:00:00Z",
    },
    {
        id: "4",
        code: "30-01",
        name: "Cemento Portland 50kg",
        description: "Bolsa de cemento portland 50kg",
        price: 12000,
        stock: 120,
        min_stock: 30,
        unit_type: "un",
        location: "D2 / B-03 / C1",
        created_at: "2025-01-15T10:00:00Z",
        updated_at: "2025-02-28T08:00:00Z",
    },
    {
        id: "5",
        code: "30-02",
        name: "Arena fina",
        description: "Arena fina para revoques",
        price: null,
        stock: 3,
        min_stock: 10,
        unit_type: "kg",
        location: "D2 / B-04",
        created_at: "2025-01-20T10:00:00Z",
        updated_at: "2025-02-27T16:00:00Z",
    },
    {
        id: "6",
        code: "40-01",
        name: "Pintura látex 20L",
        description: "Pintura látex interior/exterior blanca 20 litros",
        price: 35000,
        stock: 22,
        min_stock: 10,
        unit_type: "lt",
        location: "D1 / C-02 / C3",
        created_at: "2025-02-05T10:00:00Z",
        updated_at: "2025-02-28T07:30:00Z",
    },
];
