// AuthContext.js
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = window.localStorage.getItem("Auth"); 
    if (token) {
      setUser({ isAuthenticated: true });
    } else {
      setUser({ isAuthenticated: false });
    }
  }, []);


  return (
    <AuthContext.Provider value={{ user}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
