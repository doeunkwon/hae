import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Link,
  Alert,
} from "@mui/material";
import { useState } from "react";

interface AuthenticationProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
}

const Authentication = ({ onLogin, onRegister }: AuthenticationProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLogin(!isLogin);
    setError("");
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "Password must contain at least one special character";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isLogin) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (!displayName) {
        setError("Please enter a display name");
        return;
      }
    }

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, displayName);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 4,
          maxWidth: 400,
          width: "100%",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ color: "primary.main", textAlign: "center", mb: 4 }}
        >
          Hae
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {!isLogin && (
              <TextField
                label="Display Name"
                variant="outlined"
                fullWidth
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            )}

            <TextField
              label="Email"
              type="email"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              FormHelperTextProps={{
                sx: { mt: 2 },
              }}
              helperText={
                !isLogin
                  ? "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
                  : ""
              }
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              sx={{ mt: 2 }}
            >
              {isLogin ? "Login" : "Register"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Link
                component="button"
                variant="body2"
                onClick={toggleMode}
                sx={{ cursor: "pointer" }}
                type="button"
              >
                {isLogin
                  ? "Don't have an account? Register"
                  : "Already have an account? Login"}
              </Link>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default Authentication;
