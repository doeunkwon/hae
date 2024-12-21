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
import { useState } from "react";
import DeleteConfirmationDialog from "../dialogs/DeleteConfirmationDialog";

interface Column<T> {
  header: string;
  key: keyof T | "actions";
  render?: (item: T) => React.ReactNode;
}

interface GenericTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onDelete?: (item: T) => void;
  onAction?: (event: React.MouseEvent<HTMLButtonElement>, item: T) => void;
  actionIcon?: React.ReactNode;
  emptyMessage?: string;
  maxWidth?: number;
}

function GenericTable<T extends { [key: string]: any }>({
  data = [],
  columns,
  onDelete,
  onAction,
  actionIcon,
  emptyMessage = "No data available",
  maxWidth = 800,
}: GenericTableProps<T>) {
  const theme = useTheme();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const handleDeleteClick = (item: T) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete && onDelete) {
      onDelete(itemToDelete);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          maxWidth,
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
              {columns.map((column, index) => (
                <TableCell
                  key={index}
                  sx={{
                    fontWeight: "bold",
                    color: theme.palette.primary.main,
                  }}
                >
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length > 0 ? (
              data.map((item, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  sx={{
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                  }}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={colIndex}
                      sx={{
                        maxWidth: column.key === "content" ? 400 : "none",
                        whiteSpace:
                          column.key === "content" ? "normal" : "nowrap",
                        wordBreak:
                          column.key === "content" ? "break-word" : "normal",
                      }}
                    >
                      {column.render ? (
                        column.render(item)
                      ) : column.key === "actions" ? (
                        <>
                          {onAction && actionIcon && (
                            <IconButton
                              size="small"
                              onClick={(e) => onAction(e, item)}
                              onMouseDown={(e) => e.stopPropagation()}
                              sx={{
                                "&:hover": {
                                  color: "primary.main",
                                },
                                marginRight: 1,
                              }}
                            >
                              {actionIcon}
                            </IconButton>
                          )}
                          {onDelete && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(item);
                              }}
                              sx={{
                                "&:hover": {
                                  color: "#ff4444",
                                },
                              }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          )}
                        </>
                      ) : (
                        item[column.key]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {emptyMessage}
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

export default GenericTable;
