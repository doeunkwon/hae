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
          <Typography
            component="h1"
            variant="h4"
            gutterBottom
            sx={{ color: "primary.main" }}
          >
            hae beta
          </Typography>
          <Chat />
        </Container>
      </main>
    </ThemeProvider>
  );
}

export default App;
