import { ThemeProvider, CssBaseline } from "@mui/material";
import { darkTheme } from "./theme";
import "./App.css";
import { useState } from "react";
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
      {!user ? (
        <Authentication onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <Home user={user} />
      )}
    </ThemeProvider>
  );
}

export default App;
