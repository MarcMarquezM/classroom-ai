import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";

function ProtectedRoute({ children }) {
  const { user} = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user]);

  if (user) {
    return children;
  }

  return null;
}

export default ProtectedRoute;
