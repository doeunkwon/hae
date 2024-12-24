import { Network } from "../../types/api";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import GenericTable from "./GenericTable";
import { IconButton, TextField } from "@mui/material";
import { useState } from "react";

interface NetworksTableProps {
  networks: Network[];
  onDelete: (nid: number) => void;
  onViewContents: (
    event: React.MouseEvent<HTMLButtonElement>,
    nid: number
  ) => void;
  onUpdateName: (nid: number, newName: string) => void;
}

function NetworksTable({
  networks = [],
  onDelete,
  onViewContents,
  onUpdateName,
}: NetworksTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const columns = [
    {
      header: "Name",
      key: "name" as keyof Network,
      render: (item: Network) =>
        editingId === item.nid ? (
          <TextField
            size="small"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (editingName.trim() !== "" && editingName !== item.name) {
                  onUpdateName(item.nid, editingName);
                }
                setEditingId(null);
              } else if (e.key === "Escape") {
                setEditingId(null);
              }
            }}
            onBlur={() => {
              if (editingName.trim() !== "" && editingName !== item.name) {
                onUpdateName(item.nid, editingName);
              }
              setEditingId(null);
            }}
            autoFocus
          />
        ) : (
          item.name
        ),
    },
    {
      header: "Edit",
      key: "actions" as const,
      render: (item: Network) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(item.nid);
            setEditingName(item.name);
          }}
          sx={{
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      ),
    },
    { header: "Content", key: "actions" as const },
    { header: "Delete", key: "actions" as const },
  ];

  const handleDelete = (network: Network) => {
    onDelete(network.nid);
  };

  const handleViewContents = (
    event: React.MouseEvent<HTMLButtonElement>,
    network: Network
  ) => {
    onViewContents(event, network.nid);
  };

  return (
    <GenericTable
      data={networks}
      columns={columns}
      onDelete={handleDelete}
      onAction={handleViewContents}
      actionIcon={<LightbulbOutlinedIcon fontSize="small" />}
      emptyMessage="No networks available"
      maxWidth={800}
    />
  );
}

export default NetworksTable;
