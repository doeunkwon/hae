import { ThemeProvider, CssBaseline } from "@mui/material";
import { darkTheme } from "./theme";
import "./App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";
import Authentication from "./components/Authentication";
import Home from "./components/Home";

interface User {
  email: string;
  displayName: string;
  uid: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          email: firebaseUser.email!,
          displayName:
            firebaseUser.displayName || firebaseUser.email!.split("@")[0],
          uid: firebaseUser.uid,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const handleRegister = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName });
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  if (loading) {
    return null; // Or a loading spinner
  }

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
