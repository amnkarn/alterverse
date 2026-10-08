
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export interface AvtarItem {
    id: string;
    imageUrl: string;
    name: string;
}

export async function fetchAllAvatar(): Promise<AvtarItem[]> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/avatars`);
        if (!res.ok) {
            throw new Error(`Failed to fetch spaces: ${res.statusText}`);
        }
        const data = await res.json();
        return data.avatars || [];
    } catch (error) {
        console.error("Error in fetchAllSpace:", error);
        return [];
    }
}