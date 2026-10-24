import crypto from "node:crypto";
import { config } from "../../config.ts";

// Domain-separate the QR payload from JWT signing when QR_SECRET is unset.
const QR_SECRET = `qroute-qr-v1:${config.qrSecret}`;

export function generateQRToken(nodeId: string): string {
  const payload = `SJCETNAV:v1:${nodeId}`;
  const hmac = crypto.createHmac("sha256", QR_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex").substring(0, 8);
  return `${payload}.${signature}`;
}

export function verifyQRToken(token: string): { valid: boolean; nodeId?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { valid: false };
    const payload = parts[0];
    const signature = parts[1];
    if (!payload || !signature) return { valid: false };
    
    const expected = crypto.createHmac("sha256", QR_SECRET);
    expected.update(payload);
    const expectedSig = expected.digest("hex").substring(0, 8);
    
    if (signature !== expectedSig) return { valid: false };
    
    const match = payload.match(/^SJCETNAV:v1:(.+)$/);
    if (!match) return { valid: false };
    
    return { valid: true, nodeId: match[1] };
  } catch {
    return { valid: false };
  }
}
