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
import RecentActorsOutlinedIcon from "@mui/icons-material/RecentActorsOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { darkTheme } from "./theme";
import "./App.css";
import { useState, useEffect } from "react";
import axios from "axios";
import { Network, Content } from "./types/api";

function App() {
  const [currentNetwork, setCurrentNetwork] = useState<Network | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  // Add states for popover
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedNetworkContents, setSelectedNetworkContents] = useState<
    Content[]
  >([]);
  const [contentAnchorEl, setContentAnchorEl] =
    useState<HTMLButtonElement | null>(null);
  const [viewedNetworkId, setViewedNetworkId] = useState<number | null>(null);

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

  const handleViewContents = async (
    event: React.MouseEvent<HTMLButtonElement>,
    nid: number
  ) => {
    event.stopPropagation();
    const buttonElement = event.currentTarget;
    try {
      console.log("Fetching contents for network:", nid);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/networks/${nid}/contents`
      );
      console.log("Response data:", response.data);
      setSelectedNetworkContents(response.data);
      setContentAnchorEl(buttonElement);
      setViewedNetworkId(nid);
      console.log("Content anchor element set:", buttonElement);
    } catch (error) {
      console.error("Failed to fetch network contents:", error);
    }
  };

  const handleContentPopoverClose = () => {
    setContentAnchorEl(null);
    setViewedNetworkId(null);
  };

  const handleDeleteContent = async (nid: number, cid: number) => {
    try {
      const networkId = viewedNetworkId;
      if (!networkId) {
        console.error("No network ID available");
        return;
      }
      console.log("Deleting content:", { nid: networkId, cid });
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/networks/${networkId}/contents/${cid}`
      );
      setSelectedNetworkContents(
        selectedNetworkContents.filter((content) => content.cid !== cid)
      );
    } catch (error) {
      console.error("Failed to delete content:", error);
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
                <RecentActorsOutlinedIcon />
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
                          onClick={(e) => handleViewContents(e, network.nid)}
                          sx={{ mr: 1 }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
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

          <Popover
            open={Boolean(contentAnchorEl)}
            anchorEl={contentAnchorEl}
            onClose={handleContentPopoverClose}
            anchorOrigin={{
              vertical: "center",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "center",
              horizontal: "left",
            }}
            sx={{ marginLeft: 2 }}
          >
            <TableContainer
              component={Paper}
              sx={{ maxWidth: 600, maxHeight: 400 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Content</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedNetworkContents.map((content) => (
                    <TableRow key={content.cid}>
                      <TableCell
                        sx={{
                          maxWidth: 400,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                      >
                        {content.content}
                      </TableCell>
                      <TableCell>
                        {new Date(content.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContent(
                              viewedNetworkId || 0,
                              content.cid
                            );
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
