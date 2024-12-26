import { Content } from "../../types/api";
import GenericTable from "./GenericTable";
import { IconButton, TextField } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useState } from "react";

interface ContentsTableProps {
  contents: Content[];
  onDelete: (nid: string, cid: string) => void;
  onUpdateContent: (
    nid: string,
    cid: string,
    newContent: string
  ) => Promise<Content>;
  networkId: string | null;
}

function ContentsTable({
  contents = [],
  onDelete,
  onUpdateContent,
  networkId,
}: ContentsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleUpdate = async (item: Content) => {
    if (editingContent.trim() !== "" && editingContent !== item.content) {
      try {
        const updatedContent = await onUpdateContent(
          networkId || "",
          item.cid,
          editingContent
        );
        if (updatedContent) {
          setEditingContent(updatedContent.content);
        }
        setEditingId(null);
      } catch (error) {
        console.error("Failed to update content:", error);
        // Revert to original content on error
        setEditingContent(item.content);
      }
    }
    setEditingId(null);
  };

  const columns = [
    {
      header: "Content",
      key: "content" as keyof Content,
      render: (item: Content) =>
        editingId === item.cid ? (
          <TextField
            size="small"
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleUpdate(item);
              } else if (e.key === "Escape") {
                setEditingId(null);
              }
            }}
            onBlur={() => handleUpdate(item)}
            autoFocus
            fullWidth
            multiline
          />
        ) : (
          item.content
        ),
    },
    {
      header: "Edit",
      key: "actions" as const,
      render: (item: Content) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(item.cid);
            setEditingContent(item.content);
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
    {
      header: "When",
      key: "created_at" as keyof Content,
      render: (item: Content) => formatDate(item.created_at),
    },
    { header: "Delete", key: "actions" as const },
  ];

  const handleDelete = (content: Content) => {
    onDelete(networkId || "", content.cid);
  };

  return (
    <GenericTable
      data={contents}
      columns={columns}
      onDelete={handleDelete}
      emptyMessage="No contents available"
      maxWidth={600}
    />
  );
}

export default ContentsTable;
