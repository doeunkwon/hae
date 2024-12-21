import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  useTheme,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import { Network } from "../types/api";
import { useState } from "react";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";

interface NetworksTableProps {
  networks: Network[];
  onDelete: (nid: number) => void;
  onViewContents: (
    event: React.MouseEvent<HTMLButtonElement>,
    nid: number
  ) => void;
}

function NetworksTable({
  networks = [],
  onDelete,
  onViewContents,
}: NetworksTableProps) {
  const theme = useTheme();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [networkToDelete, setNetworkToDelete] = useState<Network | null>(null);

  const safeNetworks = networks || [];

  const handleDeleteClick = (network: Network) => {
    setNetworkToDelete(network);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (networkToDelete) {
      onDelete(networkToDelete.nid);
    }
    setDeleteDialogOpen(false);
    setNetworkToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setNetworkToDelete(null);
  };

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          maxWidth: 800,
          backgroundColor: theme.palette.background.default,
          "& .MuiTableCell-root": {
            borderBottom: "0px solid rgba(0, 0, 0, 0)",
          },
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  color: theme.palette.primary.main,
                }}
              >
                Name
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  color: theme.palette.primary.main,
                }}
              >
                Contents
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  color: theme.palette.primary.main,
                }}
              >
                Delete
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {safeNetworks.length > 0 ? (
              safeNetworks.map((network) => (
                <TableRow
                  key={network.nid}
                  sx={{
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                  }}
                >
                  <TableCell>{network.name}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => onViewContents(e, network.nid)}
                      onMouseDown={(e) => e.stopPropagation()}
                      sx={{
                        "&:hover": {
                          color: "primary.main",
                        },
                      }}
                    >
                      <LightbulbOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(network);
                      }}
                      sx={{
                        "&:hover": {
                          color: "#ff4444",
                        },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No networks available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

export default NetworksTable;
