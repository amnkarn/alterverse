import { useEffect, useState } from "react"
import LivingNebula from "../components/LivingNebula";
import { fetchAllSpace } from "../api/space.api";


export default function SpaceListPage() {
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSpaces = async () => {
            try {
                const res = await fetchAllSpace();
                console.log("Fetched data:", res);
                setSpaces(res);
            } catch (error) {
                console.error("Failed to fetch spaces:", error);
            } finally {
                setLoading(false);
            }
        };

        getSpaces();
    }, [])


    return (
        <LivingNebula
            particleCount={1400}
            trailLength={0.16}
            canvasGlow={25}
        >
            <div>
                <h1>Arena Page</h1>
                <p>Select your avatar and display name to join the arena.</p>

                <div>
                    <h3>Available Spaces:</h3>
                    {loading ? (
                        <p>Loading spaces...</p>
                    ) : (
                        <ul className="text-white">
                            {spaces.map((space) => (
                                <li key={space.id || space._id}>{space.name}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </LivingNebula>
    )
}