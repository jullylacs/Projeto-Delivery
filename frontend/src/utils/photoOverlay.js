const MAX_DIMENSION = 1280;
const TARGET_BASE64_BYTES = 500 * 1024;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao processar imagem"));
    image.src = src;
  });

function formatCoords(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return "GPS indisponível";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// Captura uma foto (File) e sobrepõe uma faixa com logo NVX, data/hora e coordenadas GPS.
// Retorna { dataUrl, capturedAt, lat, lng } pronto para enviar ao backend.
export async function capturarFotoComOverlay(file, { lat, lng } = {}) {
  const initialDataUrl = await fileToDataUrl(file);
  const image = await loadImageElement(initialDataUrl);

  const maxSide = Math.max(image.width, image.height);
  const scale = maxSide > MAX_DIMENSION ? MAX_DIMENSION / maxSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao preparar a imagem");

  ctx.drawImage(image, 0, 0, width, height);

  const capturedAt = new Date();
  const faixaAltura = Math.max(48, Math.round(height * 0.1));
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, height - faixaAltura, width, faixaAltura);

  const fontSize = Math.max(12, Math.round(faixaAltura * 0.28));
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";

  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.fillText("NVX NETWORKS", 10, height - faixaAltura + fontSize * 0.9);

  ctx.font = `${fontSize * 0.85}px Helvetica, Arial, sans-serif`;
  ctx.fillText(capturedAt.toLocaleString("pt-BR"), 10, height - faixaAltura + fontSize * 2.1);
  ctx.fillText(formatCoords(lat, lng), 10, height - faixaAltura + fontSize * 3.2);

  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > TARGET_BASE64_BYTES && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return {
    dataUrl,
    capturedAt: capturedAt.toISOString(),
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
  };
}

// Obtém a posição GPS atual do dispositivo (Promise-based).
export function obterLocalizacaoAtual() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
