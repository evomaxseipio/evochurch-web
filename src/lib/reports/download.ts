/** Descarga en el navegador desde base64 (respuesta de server action). */
export function downloadBase64File(
  base64: string,
  filename: string,
  mimeType: string,
): void {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function base64ToBlobUrl(base64: string, mimeType: string): string {
  return URL.createObjectURL(base64ToBlob(base64, mimeType));
}

export function revokeBlobUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}

export function exportKey(
  reportId: string,
  format: string,
): string {
  return `${reportId}:${format}`;
}
