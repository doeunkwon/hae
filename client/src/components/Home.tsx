import {
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
  Tooltip,
} from "@mui/material";
import TocOutlinedIcon from "@mui/icons-material/TocOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { useState, useEffect } from "react";
import { signOut, getAuth } from "firebase/auth";
import { auth } from "../firebase";
import { Network, Content } from "../types/api";
import NetworksTable from "./NetworksTable";
import ContentsTable from "./ContentsTable";
import Chat from "./Chat";
import api from "../utils/api";

interface HomeProps {
  user: {
    email: string;
    displayName: string;
    uid: string;
  };
}

function Home({ user }: HomeProps) {
  const [currentNetwork, setCurrentNetwork] = useState<Network | null>(null);
  const [networks, setNetworks] = useState<Network[]>(() => []);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedNetworkContents, setSelectedNetworkContents] = useState<
    Content[]
  >([]);
  const [contentAnchorEl, setContentAnchorEl] =
    useState<HTMLButtonElement | null>(null);
  const [viewedNetworkId, setViewedNetworkId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNetworks = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/networks");
      setNetworks(response.data);
    } catch (error) {
      console.error("Error fetching networks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteNetwork = async (nid: number) => {
    try {
      await api.delete(`/networks/${nid}`);
      setNetworks((prevNetworks) =>
        prevNetworks ? prevNetworks.filter((n) => n.nid !== nid) : []
      );
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
      const response = await api.get(`/networks/${nid}/contents`);
      setSelectedNetworkContents(response.data);
      setContentAnchorEl(buttonElement);
      setViewedNetworkId(nid);
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
      await api.delete(`/networks/${networkId}/contents/${cid}`);
      setSelectedNetworkContents(
        selectedNetworkContents.filter((content) => content.cid !== cid)
      );
    } catch (error) {
      console.error("Failed to delete content:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
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
            <Tooltip title="Networks">
              <IconButton onClick={handleClick} color="primary" size="large">
                <TocOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout">
              <IconButton onClick={handleLogout} color="primary" size="large">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Network</InputLabel>
              <Select
                value={currentNetwork?.nid || ""}
                onChange={(e) =>
                  setCurrentNetwork(
                    networks?.find((n) => n.nid === e.target.value) || null
                  )
                }
                label="Network"
                disabled={isLoading}
              >
                <MenuItem value="">Empty</MenuItem>
                {isLoading ? (
                  <MenuItem disabled>Loading...</MenuItem>
                ) : networks && networks.length > 0 ? (
                  networks.map((network) => (
                    <MenuItem key={network.nid} value={network.nid}>
                      {network.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No networks available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        <Popover
          open={Boolean(anchorEl)}
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
          {isLoading ? (
            <Box p={2}>Loading networks...</Box>
          ) : networks && networks.length > 0 ? (
            <NetworksTable
              networks={networks}
              onDelete={handleDeleteNetwork}
              onViewContents={handleViewContents}
            />
          ) : (
            <Box p={2}>No networks available</Box>
          )}
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
  );
}

export default Home;
