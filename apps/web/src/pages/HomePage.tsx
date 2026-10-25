import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8f9ff] px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#006699] shadow-md">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            QRoute
          </h1>
          <p className="mt-2 text-base text-[#40484f]">Campus Indoor Navigation</p>
          <p className="mt-1 text-sm text-[#707880]">Find your way around campus</p>
        </div>

        <div className="space-y-3">
          <Link
            to="/scan"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#006699] px-4 py-3.5 text-center text-base font-medium text-white transition-colors hover:bg-[#004b72] shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Scan QR Code
          </Link>
          <Link
            to="/search"
            className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-[#c0c7d0] bg-white px-4 py-3.5 text-center text-base font-medium text-[#061d30] transition-colors hover:bg-[#f5f7fa] hover:border-[#006699]/50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Destination
          </Link>
        </div>

        <div className="mt-8 rounded-lg bg-white border border-[#d0e4ff] p-4">
          <p className="text-xs text-[#40484f] text-center leading-relaxed">
            <strong className="text-[#006699]">How it works:</strong><br />
            Scan a QR code at any location on campus, or search for your destination to get turn-by-turn directions.
          </p>
        </div>
      </div>
    </main>
  );
}

export default HomePage;
