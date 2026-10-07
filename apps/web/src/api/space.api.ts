
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function fetchAllSpace() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/space/all`);
        console.log(res);
        return res;
        
    } catch (error) {
        console.log(error);
    }
}