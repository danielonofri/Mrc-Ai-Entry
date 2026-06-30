import { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

const APP_VERSION = "v1.0.1";

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
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const cropperRef = useRef<any>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [operario, setOperario] = useState<{
    u: number;      
    g: number;      
    m: string;      
    e: string;      
  } | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      const jsonRaw = desencriptarTokenMrc(token);
      if (jsonRaw) {
        try {
          const userData = JSON.parse(jsonRaw);
          const ahora = new Date();
          const expiracion = new Date(userData.e);

          if (ahora > expiracion) {
            alert("El token del código QR ha expirado. Por favor, genere uno nuevo.");
            return;
          }

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.type === 'application/pdf') {
        setDocumentoFile(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper && typeof cropper.getCroppedCanvas === 'function') {
      // Método corregido: getCroppedCanvas
      cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048 }).toBlob((blob: Blob | null) => {
        if (blob) {
          const croppedFile = new File([blob], "captured_invoice.jpg", { type: "image/jpeg" });
          setDocumentoFile(croppedFile);
          setImageSrc(null);
        }
      }, 'image/jpeg', 0.85);
    } else {
      console.error("Instancia de Cropper no disponible o método inválido.");
    }
  };

  const handleEnviarApi = async () => {
    if (!documentoFile) {
      alert("Por favor, capture una foto o seleccione un archivo primero.");
      return;
    }

    setEnviando(true);

    try {
      const endpoint = "https://www.mrc307.com/MRC307/mrc307comprasinventarios/api/ai/process-purchase";
      const formData = new FormData();
      
      formData.append('file', documentoFile);
      formData.append('idUsuario', operario ? operario.u.toString() : '54');
      formData.append('comprobante', ""); 

      if (operario) {
        formData.append('email', operario.m);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.ok) {
        alert("¡Documento enviado con éxito!");
        setDocumentoFile(null);
        setStep('menu');
      } else {
        const errText = await response.text();
        alert(`Error en el servidor: ${errText || response.statusText}`);
      }
    } catch (error: any) {
      console.error("Error de red en el navegador:", error);
      alert("Bloqueo de seguridad del navegador. " + error.message);
    } finally {
      setEnviando(false);
    }
  };

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
      <button onClick={handleSave} className="bg-blue-600 text-white p-5 rounded-2xl font-bold mb-4">GUARDAR Y CONTINUAR</button>
      
      <div className="text-[10px] text-gray-400 text-center tracking-widest uppercase">
        {APP_VERSION}
      </div>
    </div>
  );

  if (step === 'menu') return (
    <div className="min-h-screen bg-white p-6 flex flex-col justify-center gap-6">
      <h1 className="text-3xl font-black text-center text-blue-900 mb-2">MRC AI ENTRY</h1>
      
      {operario && (
        <div className="text-center text-xs text-green-600 font-bold bg-green-50 p-3 rounded-xl mb-2 border border-green-200">
          <div>👋 Operario: {operario.m}</div>
          <div className="text-[10px] text-gray-500 mt-1">ID: {operario.u} | Grupo: {operario.g}</div>
        </div>
      )}

      <button onClick={() => setStep('capture')} className="p-10 bg-green-600 text-white text-2xl font-bold rounded-3xl shadow-lg active:scale-95 transition-all">PURCHASES</button>
      <button className="p-10 bg-gray-400 text-white text-2xl font-bold rounded-3xl opacity-50 cursor-not-allowed">INVENTORY</button>
      <button className="p-10 bg-gray-400 text-white text-2xl font-bold rounded-3xl opacity-50 cursor-not-allowed">SUPPLIERS</button>
      
      <div className="text-[10px] text-gray-400 text-center tracking-widest uppercase mt-4">
        {APP_VERSION}
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col p-4 bg-gray-100 overflow-hidden">
      
      {imageSrc && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col p-4">
          <h3 className="text-white text-center font-bold mb-4 flex-none">Encuadre el Documento</h3>
          
          <div className="w-full relative bg-gray-900 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 150px)' }}>
            <Cropper
              src={imageSrc}
              style={{ height: "100%", width: "100%" }}
              initialAspectRatio={NaN}
              guides={true}
              ref={cropperRef}
              viewMode={1}
              background={false}
              responsive={true}
              autoCropArea={0.9}
              checkOrientation={false}
            />
          </div>

          <div className="flex gap-4 mt-4 flex-none">
            <button 
              onClick={() => setImageSrc(null)} 
              className="flex-1 p-4 bg-gray-700 text-white font-bold rounded-xl"
            >
              CANCELAR
            </button>
            <button 
              onClick={handleCropComplete} 
              className="flex-1 p-4 bg-green-600 text-white font-bold rounded-xl"
            >
              CORTAR FOTO
            </button>
          </div>
        </div>
      )}

      <div className="flex-none mb-2">
        <button onClick={() => setStep('menu')} className="text-blue-600 font-bold w-fit py-2">
          ← VOLVER
        </button>
      </div>
      
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={cameraInputRef}
        className="hidden" 
        onChange={handleFileChange}
      />
      
      <input 
        type="file" 
        accept="image/*,application/pdf" 
        ref={galleryInputRef}
        className="hidden" 
        onChange={handleFileChange}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-4 mb-4">
        <div className={`flex-1 min-h-[150px] flex flex-col items-center justify-center border-4 border-dashed rounded-3xl bg-white transition-all ${documentoFile ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
          <span className="text-5xl mb-2">{documentoFile ? '📄' : '📋'}</span>
          <p className="text-gray-600 font-bold px-4 text-center text-sm">
            {documentoFile ? 'Documento cargado correctamente' : 'Ningún archivo seleccionado'}
          </p>
          {documentoFile && (
            <p className="text-xs text-blue-700 font-semibold mt-2 max-w-[85%] truncate bg-blue-100 px-3 py-1 rounded-lg">
              {documentoFile.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 flex-none">
          <button 
            onClick={() => cameraInputRef.current?.click()}
            className="p-4 bg-blue-600 text-white font-bold rounded-2xl flex flex-col items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span className="text-2xl">📸</span>
            <span className="text-xs tracking-wide">TOMAR FOTO</span>
          </button>

          <button 
            onClick={() => galleryInputRef.current?.click()}
            className="p-4 bg-indigo-600 text-white font-bold rounded-2xl flex flex-col items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span className="text-2xl">📁</span>
            <span className="text-xs tracking-wide">GALERÍA / PDF</span>
          </button>
        </div>
      </div>

      <div className="flex-none pb-2">
        <button 
          onClick={handleEnviarApi}
          disabled={enviando}
          className={`w-full p-5 rounded-2xl font-bold text-lg shadow-xl text-white transition-all ${enviando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-700 active:scale-95'}`}
        >
          {enviando ? 'PROCESANDO EN API...' : 'ENVIAR DOCUMENTO'}
        </button>
      </div>
    </div>
  );
}