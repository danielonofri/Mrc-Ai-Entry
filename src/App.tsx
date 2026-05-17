import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';

/**
 * Función unificada para desencriptar el token AES-256-CBC de Utiles.cs
 * Contrato de claves cortas: u -> Id, g -> IdGrupo, m -> Email, e -> FechaExpiracion (ISO UTC)
 */
function desencriptarTokenMrc(encryptedText: string): string {
  try {
    const key = CryptoJS.enc.Utf8.parse('53281201542848549632565484587458');
    const iv = CryptoJS.enc.Utf8.parse('5428485496325654');

    const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return jsonString || "";
  } catch (error) {
    console.error("Error al desencriptar el token QR:", error);
    return "";
  }
}

export default function App() {
  const [step, setStep] = useState<'config' | 'menu' | 'capture'>('config');
  const [config, setConfig] = useState({ id: '', license: '', country: 'AR' });
  const [imagenFactura, setImagenFactura] = useState<File | null>(null);
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [enviando, setEnviando] = useState(false);
  
  // Estado adaptado a las columnas oficiales de MRCCLOUD.DBO.MRCUSUARIO
  const [operario, setOperario] = useState<{
    u: number;      // Id
    g: number;      // IdGrupo
    m: string;      // Email
    e: string;      // FechaExpiracion
  } | null>(null);

  useEffect(() => {
    // 1. Capturar parámetros de la URL enviados desde Blazor
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      const jsonRaw = desencriptarTokenMrc(token);

      if (jsonRaw) {
        try {
          const userData = JSON.parse(jsonRaw);
          console.log("¡Datos del operario recuperados de MRCCLOUD!", userData);
          
          // Validar FechaExpiracion contra el reloj del celular
          const ahora = new Date();
          const expiracion = new Date(userData.e);

          if (ahora > expiracion) {
            alert("El token del código QR ha expirado. Por favor, genere uno nuevo.");
            return;
          }

          // Guardamos las llaves cortas mapeadas en el estado reactivo
          setOperario(userData);
          setStep('menu');
          return; 
        } catch (e) {
          console.error("Error al parsear el JSON del token", e);
        }
      } else {
        alert("Token inválido, expirado o corrupto.");
      }
    }
    
    // 2. Si no hay token en la URL, buscamos si ya estaba configurado localmente
    const saved = localStorage.getItem('mrc_config');
    if (saved) {
      setConfig(JSON.parse(saved));
      setStep('menu');
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('mrc_config', JSON.stringify(config));
    setStep('menu');
  };
const handleEnviarApi = async () => {
  if (!imagenFactura) {
    alert("Por favor, capture primero la fotografía de la factura.");
    return;
  }

  setEnviando(true);

  try {
    // URL validada y en producción según el perfil de Postman
    const endpoint = "https://192.168.88.225/MRC307/mrc307comprasinventarios/api/ai/process-purchase";

    const formData = new FormData();
    
    // Mapeo exacto verificado en el multipart de Node/Postman
    formData.append('file', imagenFactura);
    formData.append('idUsuario', operario ? operario.u.toString() : '54');
    formData.append('comprobante', numeroComprobante || 'FCA000200001548');

    // Agregamos opcional si está el operario escaneado
    if (operario) {
      formData.append('email', operario.m);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      mode: 'cors', // Asegura procesamiento de políticas Cross-Origin
      credentials: 'omit' // Evita que los middlewares de cookies de Blazor fuercen redirecciones a localhost
    });

    if (response.ok) {
      alert("¡Comprobante enviado con éxito!");
      setImagenFactura(null);
      setNumeroComprobante('');
      setStep('menu');
    } else {
      const errText = await response.text();
      alert(`Error en el servidor: ${errText || response.statusText}`);
    }
  } catch (error: any) {
    console.error("Error de red en el navegador:", error);
    alert("Bloqueo de seguridad del navegador. "+error.message);
  } finally {
    setEnviando(false);
  }
};
  // Función para disparar la foto capturada hacia el endpoint dinámico
  // const handleEnviarApi = async () => {
  //   if (!imagenFactura) {
  //     alert("Por favor, capture primero la fotografía de la factura.");
  //     return;
  //   }

  //   setEnviando(true);

  //   try {
  //     // Leemos la variable de entorno del archivo .env específico de esta instalación
  //     const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://192.168.88.225/MRC307/mrc307comprasinventarios";
  //     const endpoint = `${baseUrl.replace(/\/$/, '')}/api/ai/process-purchase`;

  //     // Empaquetamos la imagen y los datos de validación cruzada en un FormData
  //     const formData = new FormData();
  //     formData.append('file', imagenFactura);
  //     formData.append('comprobante', numeroComprobante);

  //     if (operario) {
  //       formData.append('idUsuario', operario.u.toString());
  //       formData.append('idGrupo', operario.g.toString());
  //       formData.append('email', operario.m);
  //     } else {
  //       formData.append('cuitRut', config.id);
  //       formData.append('licencia', config.license);
  //     }
  //     //console.log("Enviando datos a la API:", { endpoint, formDataEntries: Array.from(formData.entries()) });
  //     alert(`Enviando factura a la API en:\n${endpoint} con formData:\n${Array.from(formData.entries()).map(([k,v]) => `${k}: ${v instanceof File ? v.name : v}`).join('\n')}`);
  //     const response = await fetch(endpoint, {
  //       method: 'POST',
  //       body: formData
  //     });

  //     if (response.ok) {
  //       alert("¡Factura enviada y procesada con éxito por la IA!");
  //       setImagenFactura(null);
  //       setNumeroComprobante('');
  //       setStep('menu');
  //     } else {
  //       const errText = await response.text();
  //       alert(`Error en el servidor: ${errText || response.statusText}`);
  //     }
  //   } catch (error) {
  //     console.error("Error al conectar con la API de .NET:", error);
  //     alert("No se pudo conectar con el servidor de la API. Verifique el archivo .env o la red.");
  //   } finally {
  //     setEnviando(false);
  //   }
  // };

  // PANTALLA: CONFIGURACIÓN INICIAL (MANUAL)
  if (step === 'config') return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col justify-center">
      <h2 className="text-2xl font-bold mb-6 text-center">Configuración Mrc</h2>
      <select 
        className="p-4 border rounded-xl mb-4"
        value={config.country}
        onChange={(e) => setConfig({...config, country: e.target.value})}
      >
        <option value="AR">Argentina (CUIT)</option>
        <option value="CL">Chile (RUT)</option>
      </select>
      <input 
        className="p-4 border rounded-xl mb-4"
        value={config.id}
        placeholder={config.country === 'AR' ? "CUIT" : "RUT"}
        onChange={(e) => setConfig({...config, id: e.target.value})}
      />
      <input 
        className="p-4 border rounded-xl mb-6"
        value={config.license}
        placeholder="Licencia"
        onChange={(e) => setConfig({...config, license: e.target.value})}
      />
      <button onClick={handleSave} className="bg-blue-600 text-white p-5 rounded-2xl font-bold">GUARDAR Y CONTINUAR</button>
    </div>
  );

  // PANTALLA: MENÚ PRINCIPAL (3 BOTONES)
  if (step === 'menu') return (
    <div className="min-h-screen bg-white p-6 flex flex-col justify-center gap-6">
      <h1 className="text-3xl font-black text-center text-blue-900 mb-2">MRC AI ENTRY</h1>
      
      {/* Banner de feedback visual para el operario vinculado por QR */}
      {operario && (
        <div className="text-center text-xs text-green-600 font-bold bg-green-50 p-3 rounded-xl mb-2 border border-green-200">
          <div>👋 Operario: {operario.m}</div>
          <div className="text-[10px] text-gray-500 mt-1">ID: {operario.u} | Grupo: {operario.g}</div>
        </div>
      )}

      <button onClick={() => setStep('capture')} className="p-10 bg-green-600 text-white text-2xl font-bold rounded-3xl shadow-lg active:scale-95 transition-all">PURCHASES</button>
      <button className="p-10 bg-gray-400 text-white text-2xl font-bold rounded-3xl opacity-50 cursor-not-allowed">INVENTORY</button>
      <button className="p-10 bg-gray-400 text-white text-2xl font-bold rounded-3xl opacity-50 cursor-not-allowed">SUPPLIERS</button>
    </div>
  );

  // PANTALLA: CAPTURA (CÁMARA + TEXTBOX + FETCH)
  return (
    <div className="min-h-screen flex flex-col p-6 bg-gray-100">
      <button onClick={() => setStep('menu')} className="text-blue-600 font-bold mb-4 w-fit">← VOLVER</button>
      
      <div className={`flex-1 flex flex-col items-center justify-center border-4 border-dashed rounded-3xl mb-6 bg-white transition-all ${imagenFactura ? 'border-green-500' : 'border-gray-300'}`}>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          id="camera" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setImagenFactura(e.target.files[0]);
            }
          }}
        />
        <label htmlFor="camera" className="text-6xl bg-blue-50 p-8 rounded-full mb-4 cursor-pointer active:scale-95 transition-all">
          {imagenFactura ? '✅' : '📸'}
        </label>
        <p className="text-gray-500 font-medium">
          {imagenFactura ? '¡Fotografía capturada con éxito!' : 'Toca para fotografiar factura'}
        </p>
        {imagenFactura && <p className="text-xs text-gray-400 mt-1">{imagenFactura.name}</p>}
      </div>

      <input 
        className="p-5 border-2 border-blue-200 rounded-2xl mb-4 text-lg"
        placeholder={config.country === 'AR' ? "Tipo + Prefijo + Número" : "Tipo + Número"}
        value={numeroComprobante}
        onChange={(e) => setNumeroComprobante(e.target.value)}
      />

      <button 
        onClick={handleEnviarApi}
        disabled={enviando}
        className={`w-full p-6 rounded-2xl font-bold text-xl shadow-xl text-white transition-all ${enviando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-700 active:scale-95'}`}
      >
        {enviando ? 'PROCESANDO EN API...' : 'ENVIAR A API'}
      </button>
    </div>
  );
}