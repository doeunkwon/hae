import { Network } from "../../types/api";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import GenericTable from "./GenericTable";

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
  const columns = [
    { header: "Name", key: "name" as keyof Network },
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
