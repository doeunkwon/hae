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
  Box,
} from "@mui/material";
import TocOutlinedIcon from "@mui/icons-material/TocOutlined";
import { darkTheme } from "./theme";
import "./App.css";
import { useState, useEffect } from "react";
import axios from "axios";
import { Network, Content } from "./types/api";
import NetworksTable from "./components/NetworksTable";
import ContentsTable from "./components/ContentsTable";

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

  const fetchNetworks = async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/networks`);
    if (res.data) {
      setNetworks(res.data);
    }
  };

  useEffect(() => {
    fetchNetworks();
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
              <IconButton onClick={handleClick} color="primary" size="large">
                <TocOutlinedIcon />
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
                  <MenuItem value="">Empty</MenuItem>
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
              vertical: "center",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "center",
              horizontal: "center",
            }}
            sx={{
              "& .MuiPopover-paper": {
                boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
                borderRadius: "8px",
              },
            }}
          >
            <NetworksTable
              networks={networks}
              onDelete={handleDeleteNetwork}
              onViewContents={handleViewContents}
            />
          </Popover>

          <Popover
            open={Boolean(contentAnchorEl)}
            anchorEl={contentAnchorEl}
            onClose={handleContentPopoverClose}
            anchorOrigin={{
              vertical: "center",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "center",
              horizontal: "center",
            }}
            sx={{
              "& .MuiPopover-paper": {
                boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
                borderRadius: "8px",
              },
            }}
          >
            <ContentsTable
              contents={selectedNetworkContents}
              onDelete={handleDeleteContent}
              networkId={viewedNetworkId}
            />
          </Popover>

          <Box width="100%" flex="1 1 auto" overflow="hidden">
            <Chat
              currentNetwork={currentNetwork}
              onNetworkUpdate={fetchNetworks}
            />
          </Box>
        </Container>
      </main>
    </ThemeProvider>
  );
}

export default App;
