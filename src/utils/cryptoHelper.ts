import CryptoJS from 'crypto-js';

/**
 * Desencripta el token AES-256-CBC generado por el backend Blazor
 * @param encryptedText Token que viene por URL (ya con el URL Decode aplicado)
 */
export function desencriptarTokenMrc(encryptedText: string): string {
  try {
    // 1. Definimos la Key y el IV exactamente como están en Utiles.cs (en formato UTF-8)
    const key = CryptoJS.enc.Utf8.parse('53281201542848549632565484587458');
    const iv = CryptoJS.enc.Utf8.parse('5428485496325654');

    // 2. Ejecutamos la desencriptación forzando modo CBC y el padding PKCS7 (estándar en .NET)
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // 3. Convertimos los bytes resultantes a un string legible
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!jsonString) {
      throw new Error("El resultado de la desencriptación está vacío. Clave o formato inválido.");
    }

    return jsonString;
  } catch (error) {
    console.error("Error al desencriptar el token QR:", error);
    return "";
  }
}