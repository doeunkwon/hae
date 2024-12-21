import { Content } from "../../types/api";
import GenericTable from "./GenericTable";

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
  const columns = [
    { header: "Content", key: "content" as keyof Content },
    { header: "Delete", key: "actions" as const },
  ];

  const handleDelete = (content: Content) => {
    onDelete(networkId || 0, content.cid);
  };

  return (
    <GenericTable
      data={contents}
      columns={columns}
      onDelete={handleDelete}
      emptyMessage="No contents available"
      maxWidth={400}
    />
  );
}

export default ContentsTable;
