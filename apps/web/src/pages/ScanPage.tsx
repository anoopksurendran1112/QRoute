import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api/client.ts";

export function ScanPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (token) {
      resolveToken(token);
    }
  }, [token]);

  async function resolveToken(t: string) {
    setResolving(true);
    setError(null);
    try {
      const data = await api.postJson("/v1/scan/resolve", { token: t });
      navigate("/route", { state: { origin: data.location, token: t } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResolving(false);
    }
  }

  async function startScan() {
    setError(null);
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await scanner.stop();
          setScanning(false);
          // Try to extract token from QR payload or use as-is
          let t = decodedText.trim();
          // If it's a URL, try to get last segment
          if (t.includes("/")) {
            const parts = t.split("/");
            t = parts[parts.length - 1];
          }
          await resolveToken(t);
        },
        () => {},
      );
    } catch (e) {
      setError((e as Error).message);
      setScanning(false);
    }
  }

  function stopScan() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  return (
    <main className="min-h-screen bg-[#f8f9ff] px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm text-[#40484f]">
            ← Back
          </button>
          <h1 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Scan QR Code
          </h1>
          <div className="w-12" />
        </header>

        <div className="rounded-lg border border-[#d0e4ff] bg-white shadow-sm overflow-hidden">
          <div id="qr-reader" className="w-full" />
          {!scanning && !resolving && !token && (
            <div className="p-6 text-center">
              <button
                onClick={startScan}
                className="w-full rounded-lg bg-[#006699] px-4 py-3 text-sm font-medium text-white hover:bg-[#004b72]"
              >
                Start Scanning
              </button>
              <p className="mt-3 text-xs text-[#707880]">
                Point your camera at a QRoute QR code
              </p>
            </div>
          )}
          {(resolving || token) && (
            <div className="p-6 text-center">
              <p className="text-sm text-[#40484f]">Resolving location...</p>
            </div>
          )}
          {scanning && (
            <div className="p-4">
              <button
                onClick={stopScan}
                className="w-full rounded-lg border border-[#c0c7d0] px-4 py-2 text-sm text-[#40484f]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
