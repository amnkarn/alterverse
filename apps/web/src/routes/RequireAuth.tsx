import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../lib/auth-client";

export default function RequireAdmin() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}