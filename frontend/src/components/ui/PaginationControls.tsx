interface PaginationControlsProps {
  // Pagination state
  currentPage: number;
  perPage: number;
  total: number;
  sortOrder: 'newest' | 'oldest' | 'alphabetical';
  
  // Callbacks
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onSortOrderChange: (sort: 'newest' | 'oldest' | 'alphabetical') => void;
  
  // Optional customization
  entityName?: string;
  perPageOptions?: number[];
  showSortOrder?: boolean;
  className?: string;
}

export default function PaginationControls({
  currentPage,
  perPage,
  total,
  sortOrder,
  onPageChange,
  onPerPageChange,
  onSortOrderChange,
  entityName = "items",
  perPageOptions = [5, 10, 20, 50, 100],
  showSortOrder = true,
  className = ""
}: PaginationControlsProps) {
  const totalPages = Math.ceil(total / perPage);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, total);

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${className}`}>
      {/* Left side: Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Per page selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="perPage" className="text-sm text-gray-700 whitespace-nowrap">
            {entityName} per page:
          </label>
          <select
            id="perPage"
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm min-w-16"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Sort order selector */}
        {showSortOrder && (
          <div className="flex items-center gap-2">
            <label htmlFor="sortOrder" className="text-sm text-gray-700 whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value as 'newest' | 'oldest' | 'alphabetical')}
              className="border border-gray-300 rounded px-2 py-1 text-sm min-w-32"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-4">
        {/* Item count */}
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {total > 0 ? `Showing ${startItem}-${endItem} of ${total}` : 'No items'}
        </span>

        {/* Page navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}