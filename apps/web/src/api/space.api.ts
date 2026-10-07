
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export interface SpaceItem {
    id: string;
    name: string;
    dimension?: string;
    thumbnail?: string | null;
}

export async function fetchAllSpace(): Promise<SpaceItem[]> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/space/all`);
        if (!res.ok) {
            throw new Error(`Failed to fetch spaces: ${res.statusText}`);
        }
        const data = await res.json();
        return data.spaces || [];
    } catch (error) {
        console.error("Error in fetchAllSpace:", error);
        return [];
    }
}