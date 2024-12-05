import Chat from "./components/Chat";
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Typography,
} from "@mui/material";
import { darkTheme } from "./theme";
import "./App.css";
function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <main className="App">
        <Container maxWidth="md" className="app-container">
          <div className="app-header">
            <Typography
              variant="h4"
              gutterBottom
              sx={{ color: "primary.main" }}
            >
              hae
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              0.1
            </Typography>
          </div>
          <Chat />
        </Container>
      </main>
    </ThemeProvider>
  );
}

export default App;
