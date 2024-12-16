import { ThemeProvider, CssBaseline } from "@mui/material";
import { darkTheme } from "./theme";
import "./App.css";
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Authentication from "./components/Authentication";
import Home from "./components/Home";

interface User {
  email: string;
  displayName: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (email: string, password: string) => {
    console.log("Login:", { email, password });
    setUser({ email, displayName: email.split("@")[0] });
  };

  const handleRegister = (
    email: string,
    password: string,
    displayName: string
  ) => {
    console.log("Register:", { email, password, displayName });
    setUser({ email, displayName });
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              !user ? (
                <Authentication
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                />
              ) : (
                <Navigate to="/home" replace />
              )
            }
          />
          <Route
            path="/home"
            element={
              user ? <Home user={user} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/"
            element={<Navigate to={user ? "/home" : "/login"} replace />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
