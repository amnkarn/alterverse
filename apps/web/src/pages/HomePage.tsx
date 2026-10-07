import { useSession } from "../lib/auth-client";


export default function HomePage() {
    const { data: session, isPending, error } = useSession();

    if(isPending) {
        return <div>Loading...</div>
    }

    if(error || !session) {
        return <div>You are not loged in</div>
    }

    return (
        <div>
            HomePage page for all users
            welcome {session.user.name}
        </div>
    )
}