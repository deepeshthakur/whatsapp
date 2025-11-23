import { Outlet, useLocation } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { useEffect } from "react";
import { checkAuth } from "./service/user.service";
import { useState } from "react";
import Loader from "./utils/Loader";
import { Navigate } from "react-router-dom";

export const ProtectedRoute = () => {
  const location = useLocation();
  const { isAuthenticated, clearUser, setUser } = useUserStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkAuth();
        if (result?.isAuthenticated) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch (error) {
        console.error(error);
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [setUser, clearUser]);

  if (isChecking) {
    return <Loader />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }

  // user is auth render the protected route
  return <Outlet />;
};

export const PublicRoute = () => {
  const  isAuthenticated  = useUserStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};
