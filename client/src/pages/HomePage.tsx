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
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Network, Content } from "../types/api";
import NetworksTable from "../components/tables/NetworksTable";
import ContentsTable from "../components/tables/ContentsTable";
import ChatPage from "./ChatPage";
import api from "../utils/api";
import "../styles/Home.css";

interface Response {
  message: string;
}

function HomePage() {
  const [currentNetwork, setCurrentNetwork] = useState<Network | null>(null);
  const [networks, setNetworks] = useState<Network[]>(() => []);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedNetworkContents, setSelectedNetworkContents] = useState<
    Content[]
  >([]);
  const [contentAnchorEl, setContentAnchorEl] =
    useState<HTMLButtonElement | null>(null);
  const [viewedNetworkId, setViewedNetworkId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNetworks = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<Network[]>("/api/v1/networks/");
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

  const handleDeleteNetwork = async (nid: string) => {
    try {
      const response = await api.delete<Response>(`/api/v1/networks/${nid}`);
      setNetworks((prevNetworks) =>
        prevNetworks ? prevNetworks.filter((n) => n.nid !== nid) : []
      );
      if (currentNetwork?.nid === nid) {
        setCurrentNetwork(null);
      }
      console.log(response.data.message);
    } catch (error) {
      console.error("Failed to delete network:", error);
    }
  };

  const handleUpdateNetworkName = async (nid: string, newName: string) => {
    try {
      const response = await api.put<Response>(`/api/v1/networks/${nid}/name`, {
        name: newName,
      });
      setNetworks((prevNetworks) =>
        prevNetworks.map((network) =>
          network.nid === nid ? { ...network, name: newName } : network
        )
      );
      if (currentNetwork?.nid === nid) {
        setCurrentNetwork((prev) => (prev ? { ...prev, name: newName } : null));
      }
      console.log(response.data.message);
    } catch (error) {
      console.error("Failed to update network name:", error);
    }
  };

  const handleViewContents = async (
    event: React.MouseEvent<HTMLButtonElement>,
    nid: string
  ) => {
    event.stopPropagation();
    const buttonElement = event.currentTarget;
    try {
      const response = await api.get<Content[]>(
        `/api/v1/networks/${nid}/contents`
      );
      setSelectedNetworkContents(response.data || []);
      setContentAnchorEl(buttonElement);
      setViewedNetworkId(nid);
    } catch (error) {
      console.error("Failed to fetch network contents:", error);
      setSelectedNetworkContents([]);
    }
  };

  const handleContentPopoverClose = () => {
    setContentAnchorEl(null);
    setViewedNetworkId(null);
  };

  const handleDeleteContent = async (nid: string, cid: string) => {
    try {
      const networkId = viewedNetworkId;
      if (!networkId) {
        console.error("No network ID available");
        return;
      }
      const response = await api.delete<{ message: string }>(
        `/api/v1/networks/${networkId}/contents/${cid}`
      );
      setSelectedNetworkContents(
        selectedNetworkContents.filter((content) => content.cid !== cid)
      );
      console.log(response.data.message);
    } catch (error) {
      console.error("Failed to delete content:", error);
    }
  };

  const handleUpdateContent = async (
    nid: string,
    cid: string,
    newContent: string
  ) => {
    try {
      const response = await api.put<Content>(
        `/api/v1/networks/${nid}/contents/${cid}`,
        {
          content: newContent,
        }
      );
      setSelectedNetworkContents((prevContents) =>
        prevContents.map((content) =>
          content.cid === cid ? response.data : content
        )
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update content:", error);
      throw error;
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
    <main className="home">
      <Container maxWidth="md" className="home-container">
        <Stack direction="column" spacing={2} width="100%">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Typography variant="h4" sx={{ color: "primary.main" }}>
              Hae
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Tooltip title="Networks">
                <IconButton onClick={handleClick} color="primary" size="large">
                  <PeopleAltOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Logout">
                <IconButton onClick={handleLogout} color="primary" size="large">
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Stack direction={"row"} spacing={2} alignItems={"center"}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Who</InputLabel>
              <Select
                value={
                  isLoading || !networks.length ? "" : currentNetwork?.nid ?? ""
                }
                onChange={(e) =>
                  setCurrentNetwork(
                    networks?.find((n) => n.nid === e.target.value) || null
                  )
                }
                label="Who"
                disabled={isLoading}
              >
                <MenuItem key="" value="">
                  New Person
                </MenuItem>
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
              onUpdateName={handleUpdateNetworkName}
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
          {selectedNetworkContents.length > 0 ? (
            <ContentsTable
              contents={selectedNetworkContents}
              onDelete={handleDeleteContent}
              onUpdateContent={handleUpdateContent}
              networkId={viewedNetworkId}
            />
          ) : (
            <Box p={2}>No contents available for this network</Box>
          )}
        </Popover>

        <Box width="100%" flex="1 1 auto" overflow="hidden">
          <ChatPage
            currentNetwork={currentNetwork}
            onNetworkUpdate={fetchNetworks}
          />
        </Box>
      </Container>
    </main>
  );
}

export default HomePage;
