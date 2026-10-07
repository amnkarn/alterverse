import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import Loader from "../components/Loader";

export default function RequireAdmin() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <Loader />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role !== "Admin") {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}