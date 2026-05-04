// Utilitário para converter base64 em Blob URL se necessário
export function getPdfObjectUrl(src) {
  if (!src) return '';
  // Se já é um blob/object URL
  if (src.startsWith('blob:') || src.startsWith('http') || src.startsWith('/')) return src;

  // Aceita qualquer base64 de PDF (application/pdf ou octet-stream ou sem prefixo)
  let base64 = '';
  const base64Prefix = src.match(/^data:([^;]+);base64,(.+)$/);
  if (base64Prefix) {
    base64 = base64Prefix[2];
  } else if (/^[A-Za-z0-9+/=]+$/.test(src)) {
    // Se for só o base64 puro
    base64 = src;
  } else {
    return src;
  }
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch {
    return src;
  }
}
