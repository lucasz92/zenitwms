// Supabase Database Types
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    name: string | null;
                    role: "admin" | "employee" | "viewer";
                    organization_id: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    name?: string | null;
                    role?: "admin" | "employee" | "viewer";
                    organization_id?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string | null;
                    role?: "admin" | "employee" | "viewer";
                    organization_id?: string | null;
                    avatar_url?: string | null;
                    updated_at?: string;
                };
            };
            products: {
                Row: {
                    id: string;
                    code: string;
                    name: string;
                    description: string | null;
                    price: number | null;
                    stock: number;
                    min_stock: number;
                    image_url: string | null;
                    organization_id: string;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    code: string;
                    name: string;
                    description?: string | null;
                    price?: number | null;
                    stock?: number;
                    min_stock?: number;
                    image_url?: string | null;
                    organization_id: string;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    code?: string;
                    name?: string;
                    description?: string | null;
                    price?: number | null;
                    stock?: number;
                    min_stock?: number;
                    image_url?: string | null;
                    updated_at?: string;
                };
            };
            product_variants: {
                Row: {
                    id: string;
                    product_id: string;
                    sku: string | null;
                    size: string | null;
                    color: string | null;
                    unit_type: "un" | "mt" | "mt2" | "kg" | "lt" | "caja";
                    stock: number;
                    price_modifier: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    product_id: string;
                    sku?: string | null;
                    size?: string | null;
                    color?: string | null;
                    unit_type?: "un" | "mt" | "mt2" | "kg" | "lt" | "caja";
                    stock?: number;
                    price_modifier?: number;
                    created_at?: string;
                };
                Update: {
                    sku?: string | null;
                    size?: string | null;
                    color?: string | null;
                    unit_type?: "un" | "mt" | "mt2" | "kg" | "lt" | "caja";
                    stock?: number;
                    price_modifier?: number;
                };
            };
            locations: {
                Row: {
                    id: string;
                    organization_id: string;
                    warehouse: string;
                    sector: string | null;
                    row: string | null;
                    column: string | null;
                    shelf: string | null;
                    position: string | null;
                    orientation: string | null;
                    product_id: string | null;
                    is_primary: boolean;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    warehouse: string;
                    sector?: string | null;
                    row?: string | null;
                    column?: string | null;
                    shelf?: string | null;
                    position?: string | null;
                    orientation?: string | null;
                    product_id?: string | null;
                    is_primary?: boolean;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    warehouse?: string;
                    sector?: string | null;
                    row?: string | null;
                    column?: string | null;
                    shelf?: string | null;
                    position?: string | null;
                    orientation?: string | null;
                    product_id?: string | null;
                    is_primary?: boolean;
                    notes?: string | null;
                    updated_at?: string;
                };
            };
            inventory_movements: {
                Row: {
                    id: string;
                    organization_id: string;
                    product_id: string;
                    user_id: string;
                    type: "entry" | "exit" | "transfer" | "adjustment";
                    quantity: number;
                    from_location_id: string | null;
                    to_location_id: string | null;
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    product_id: string;
                    user_id: string;
                    type: "entry" | "exit" | "transfer" | "adjustment";
                    quantity: number;
                    from_location_id?: string | null;
                    to_location_id?: string | null;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: never;
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            user_role: "admin" | "employee" | "viewer";
            unit_type: "un" | "mt" | "mt2" | "kg" | "lt" | "caja";
            movement_type: "entry" | "exit" | "transfer" | "adjustment";
        };
    };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Update"];
