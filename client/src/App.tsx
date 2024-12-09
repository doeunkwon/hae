import Chat from "./components/Chat";
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Typography,
  Stack,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import { darkTheme } from "./theme";
import "./App.css";
import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [currentName, setCurrentName] = useState<string>("");
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    axios.get("http://localhost:8080/names").then((res) => {
      setNames(res.data);
    });
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <main className="App">
        <Container maxWidth="md" className="app-container">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
            mb={2}
          >
            <div className="app-header">
              <Typography
                variant="h4"
                gutterBottom
                sx={{ color: "primary.main" }}
              >
                Hae
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                0.1
              </Typography>
            </div>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Context</InputLabel>
              <Select
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value as string)}
                label="Context"
              >
                {names.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Chat currentName={currentName} />
        </Container>
      </main>
    </ThemeProvider>
  );
}

export default App;
