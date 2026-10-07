import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import Loader from "../components/Loader";

export default function RequireAuth() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return <Loader />;
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