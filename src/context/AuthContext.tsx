import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const login = useCallback((user: string, pass: string) => {
    if (user === "pharma" && pass === "ivone") {
      setIsAuthenticated(true);
      setUsername(user);
      sessionStorage.setItem("auth", "1");
      sessionStorage.setItem("auth_user", user);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUsername(null);
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("auth_user");
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
