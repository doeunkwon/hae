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

function ContentsTable({
  contents = [],
  onDelete,
  networkId,
}: ContentsTableProps) {
  const theme = useTheme();

  const safeContents = contents || [];

  return (
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
            <TableCell>Content</TableCell>
            <TableCell>Delete</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {safeContents.length > 0 ? (
            safeContents.map((content) => (
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
  );
}

export default ContentsTable;
