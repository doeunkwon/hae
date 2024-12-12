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
import { Network } from "./types/api";
function App() {
  const [currentNetwork, setCurrentNetwork] = useState<Network | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);

  useEffect(() => {
    axios.get("http://localhost:8080/networks").then((res) => {
      if (res.data) {
        setNetworks(res.data);
      }
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
                value={currentNetwork?.nid}
                onChange={(e) =>
                  setCurrentNetwork(
                    networks.find((n) => n.nid === e.target.value) || null
                  )
                }
                label="Context"
              >
                {networks.map((network) => (
                  <MenuItem key={network.nid} value={network.nid}>
                    {network.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Chat currentNetwork={currentNetwork} />
        </Container>
      </main>
    </ThemeProvider>
  );
}

export default App;
