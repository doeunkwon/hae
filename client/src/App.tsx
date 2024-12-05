import React from "react";
import Chat from "./components/Chat";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { darkTheme } from "./theme";

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <Chat />
      </div>
    </ThemeProvider>
  );
}

export default App;
