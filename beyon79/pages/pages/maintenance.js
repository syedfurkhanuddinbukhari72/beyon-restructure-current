import Head from 'next/head';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Head>
        <title>Under Maintenance - Beyon79</title>
        <meta name="description" content="We're currently updating our services. Please check back soon!" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Under Maintenance</h1>
          <p className="text-gray-600 mb-6">
            We&apos;re currently updating our services to bring you an even better experience.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What we&apos;re doing:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Adding new features</li>
              <li>• Improving performance</li>
              <li>• Enhancing security</li>
            </ul>
          </div>

          <div className="text-sm text-gray-500">
            <p>Expected downtime: 15-30 minutes</p>
            <p className="mt-2">We&apos;ll be back online shortly. Thank you for your patience!</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            Check Status
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            For urgent orders, please contact us directly
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2024 Beyon79. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
