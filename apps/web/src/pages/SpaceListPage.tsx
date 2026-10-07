import LivingNebula from "../components/LivingNebula";


export default function SpaceListPage() {
    return (
        <LivingNebula
        particleCount={1400}
        trailLength={0.16}
        canvasGlow={25}
        >
            <div>
                <h1>Choose a space</h1>
                <p>Select a virtual space to enter</p>
            </div>
        </LivingNebula>
    )
}