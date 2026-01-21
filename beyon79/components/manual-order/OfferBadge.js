import { getOfferDetails } from '../../utils/manualOrderHelpers';

function OfferBadge({ item, offersJson, menuData, onExpand, isExpanded, isTall }) {
  const details = getOfferDetails(item, offersJson, menuData);
  return (
    <>
      <div className="absolute left-2 bottom-2 z-10">
        <button
          type="button"
          className="bg-yellow-50 text-yellow-500 border border-yellow-300 rounded-full px-2 py-0.5 text-lg font-bold shadow hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          style={{
            minWidth: 28,
            minHeight: 28,
            lineHeight: 1
          }}
          onClick={(e) => {
            e.stopPropagation();
            onExpand(item.name);
          }}
          title="Offer Applied"
          aria-label="Offer Applied"
        >
          ☆
        </button>
      </div>
      {isExpanded && (
        <div
          style={{
            animation: 'fadeInScale 0.18s'
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-50 flex items-center justify-center transition-all duration-200 ease-in-out"
        >
          <div
            style={{
              animation: 'fadeInScale 0.18s',
              minHeight: 120
            }}
            className="w-full h-full bg-gray-200/80 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg flex flex-col items-center justify-center px-4 py-3 text-gray-800 text-sm relative transition-all duration-200 ease-in-out"
          >
            <div className="bg-gray-100 text-gray-900 rounded px-3 py-2 mb-6 text-center text-sm font-medium shadow-sm border border-gray-300 max-w-xs mx-auto whitespace-pre-line">
              {details}
            </div>
            <button
              style={{
                lineHeight: 1
              }}
              onClick={(e) => {
                e.stopPropagation();
                onExpand(null);
              }}
              aria-label="Close"
              className="absolute right-3 bottom-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-full w-7 h-7 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default OfferBadge;
