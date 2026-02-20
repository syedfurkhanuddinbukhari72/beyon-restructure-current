import React from 'react';

function OffersPanel({ bundleRules, offersBusy, onCreateOffer }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Offers Management</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <button
            onClick={onCreateOffer}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            Create New Offer
          </button>
        </div>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Current active offers will be displayed here. This feature is under development.
          </div>
        </div>
      </div>
    </div>
  );
}

export default OffersPanel;
