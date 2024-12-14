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

interface ContentsTableProps {
  contents: Content[];
  onDelete: (nid: number, cid: number) => void;
  networkId: number | null;
}

function ContentsTable({ contents, onDelete, networkId }: ContentsTableProps) {
  const theme = useTheme();
  return (
    <TableContainer
      component={Paper}
      sx={{
        maxWidth: 600,
        maxHeight: 400,
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
              Content
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                color: theme.palette.primary.main,
              }}
            >
              Created
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
          {contents.map((content) => (
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
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                {new Date(content.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(networkId || 0, content.cid);
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
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ContentsTable;
