import { Content } from "../../types/api";
import GenericTable from "./GenericTable";

interface ContentsTableProps {
  contents: Content[];
  onDelete: (nid: string, cid: string) => void;
  networkId: string | null;
}

function ContentsTable({
  contents = [],
  onDelete,
  networkId,
}: ContentsTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const columns = [
    { header: "Content", key: "content" as keyof Content },
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
