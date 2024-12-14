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
  IconButton,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import SentimentSatisfiedAltOutlinedIcon from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { darkTheme } from "./theme";
import "./App.css";
import { useState, useEffect } from "react";
import axios from "axios";
import { Network } from "./types/api";

function App() {
  const [currentNetwork, setCurrentNetwork] = useState<Network | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  // Add states for popover
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/networks`).then((res) => {
      if (res.data) {
        setNetworks(res.data);
      }
    });
  }, []);

  // Handle popover open/close
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const handleDeleteNetwork = async (nid: number) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/networks/${nid}`);
      // Remove from local state
      setNetworks(networks.filter((n) => n.nid !== nid));
      // If the deleted network was selected, clear the selection
      if (currentNetwork?.nid === nid) {
        setCurrentNetwork(null);
      }
    } catch (error) {
      console.error("Failed to delete network:", error);
    }
  };

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
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton onClick={handleClick} color="primary" size="small">
                <SentimentSatisfiedAltOutlinedIcon />
              </IconButton>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Network</InputLabel>
                <Select
                  value={currentNetwork?.nid || ""}
                  onChange={(e) =>
                    setCurrentNetwork(
                      networks.find((n) => n.nid === e.target.value) || null
                    )
                  }
                  label="Network"
                >
                  <MenuItem value="">None</MenuItem>
                  {networks.map((network) => (
                    <MenuItem key={network.nid} value={network.nid}>
                      {network.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
          >
            <TableContainer component={Paper} sx={{ maxWidth: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {networks.map((network) => (
                    <TableRow key={network.nid}>
                      <TableCell>{network.name}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNetwork(network.nid);
                          }}
                          sx={{
                            color: "error.main",
                            "&:hover": {
                              backgroundColor: "error.main",
                              color: "white",
                            },
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Popover>

          <Chat currentNetwork={currentNetwork} />
        </Container>
      </main>
    </ThemeProvider>
  );
}

export default App;
