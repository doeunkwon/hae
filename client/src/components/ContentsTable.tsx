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
import { Content } from "../types/api";
import { useState } from "react";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";

interface ContentsTableProps {
  contents: Content[];
  onDelete: (nid: number, cid: number) => void;
  networkId: number | null;
}

function ContentsTable({
  contents = [],
  onDelete,
  networkId,
}: ContentsTableProps) {
  const theme = useTheme();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);

  const safeContents = contents || [];

  const handleDeleteClick = (content: Content) => {
    setContentToDelete(content);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (contentToDelete) {
      onDelete(networkId || 0, contentToDelete.cid);
    }
    setDeleteDialogOpen(false);
    setContentToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setContentToDelete(null);
  };

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          maxWidth: 400,
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
                sx={{ fontWeight: "bold", color: theme.palette.primary.main }}
              >
                Content
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: theme.palette.primary.main }}
              >
                Delete
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {safeContents.length > 0 ? (
              safeContents.map((content) => (
                <TableRow
                  key={content.cid}
                  sx={{
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                  }}
                >
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
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(content);
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
                <TableCell colSpan={2} align="center">
                  No contents available
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

export default ContentsTable;
