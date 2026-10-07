import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../lib/auth-client";

export default function RequireAuth() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}