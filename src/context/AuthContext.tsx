import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type UserRole = 'admin' | 'operator';

const USERS: Record<string, { password: string; role: UserRole; displayName: string }> = {
  admin:  { password: 'admin123', role: 'admin',    displayName: 'Amministratore' },
  pharma: { password: 'ivone',    role: 'operator', displayName: 'Dr. Marco Rossi' },
};

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  displayName: string | null;
  role: UserRole | null;
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  const login = useCallback((user: string, pass: string) => {
    const entry = USERS[user];
    if (entry && entry.password === pass) {
      setIsAuthenticated(true);
      setUsername(user);
      setRole(entry.role);
      sessionStorage.setItem("auth", "1");
      sessionStorage.setItem("auth_user", user);
      sessionStorage.setItem("auth_role", entry.role);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUsername(null);
    setRole(null);
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("auth_role");
  }, []);

  const displayName = username ? (USERS[username]?.displayName ?? username) : null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, displayName, role, isAdmin: role === 'admin', login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
