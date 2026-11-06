import type { Doc } from "./types";

interface DocumentListProps {
  documents: Doc[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function isLocked(doc: Doc) {
  return doc.lockedBy !== null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DocumentList({
  documents,
  selectedIds,
  onSelectionChange,
}: DocumentListProps) {
  // added selectableIDs and allSelected to handle the "select all" checkbox state correctly
  const selectableIDs = documents
    .filter((doc) => !isLocked(doc))
    .map((doc) => doc.id);

  const allSelected =
    selectableIDs.length > 0 && selectedIds.length === selectableIDs.length;

  const toggleAll = () => {
    onSelectionChange(
      allSelected
        ? []
        : documents.filter((doc) => !isLocked(doc)).map((doc) => doc.id),
    );
  };

  const toggleOne = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <table className="documents">
      <thead>
        <tr>
          <th className="checkbox-cell">
            <input
              type="checkbox"
              disabled={selectableIDs.length === 0}
              checked={allSelected}
              onChange={toggleAll}
            />
          </th>
          <th>Title</th>
          <th>Last updated</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr
            key={doc.id}
            className={selectedIds.includes(doc.id) ? "selected" : undefined}
          >
            <td className="checkbox-cell">
              <input
                type="checkbox"
                disabled={isLocked(doc)}
                aria-label={`Select ${doc.title}`}
                checked={selectedIds.includes(doc.id)}
                onChange={() => toggleOne(doc.id)}
              />
            </td>
            <td>{doc.title}</td>
            <td className="muted">{formatDate(doc.updatedAt)}</td>
            <td>
              {isLocked(doc) ? (
                <span className="lock">Locked</span>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
