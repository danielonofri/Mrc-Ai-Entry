import { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';

const APP_VERSION = "v1.0.9";

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
  const [step, setStep] = useState<'config' | 'menu' | 'capture' | 'supplier'>('config');
  const [config, setConfig] = useState({ id: '', license: '', country: 'AR', showDebugInfo: false, theme: 'dark' });
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Estados para el formulario de Proveedores
  const [supplierForm, setSupplierForm] = useState({
    claveTributaria: '',
    nombre: '',
    domicilio: '',
    ciudad: '',
    estado: '',
    email: '',
    telefono: '',
    locales: ''
  });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);


  const [operario, setOperario] = useState<{
    u: number;
    g: number;
    m: string;
    e: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mrc_config');
    let loadedConfig = config;
    if (saved) {
      loadedConfig = { ...config, ...JSON.parse(saved), showDebugInfo: false };
      setConfig(loadedConfig);
    }

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

    if (saved) {
      setStep('menu');
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('mrc_config', JSON.stringify({ ...config, showDebugInfo: false }));
    setStep('menu');
  };

  const toggleTheme = () => {
    const updatedConfig = { ...config, theme: config.theme === 'dark' ? 'light' : 'dark' };
    setConfig(updatedConfig);
    localStorage.setItem('mrc_config', JSON.stringify(updatedConfig));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocumentoFile(file);
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

  const handleEnviarProveedor = async () => {
    setEnviando(true);

    try {
      const endpoint = "https://www.mrc307.com/MRC307/mrc307comprasinventarios/api/ai/vendor-upsert";
      const formData = new FormData();

      // Adjuntar archivo si existe
      if (documentoFile) {
        formData.append('file', documentoFile);
      }

      // Convertir lista de locales separados por comas a formato que acepte el backend (o enviar como string/array según prefiera)
      const listaLocalesArray = supplierForm.locales
        ? supplierForm.locales.split(',').map(l => l.trim()).filter(Boolean)
        : [];

      formData.append('claveTributaria', supplierForm.claveTributaria);
      formData.append('nombre', supplierForm.nombre);
      formData.append('domicilio', supplierForm.domicilio);
      formData.append('ciudad', supplierForm.ciudad);
      formData.append('estado', supplierForm.estado);
      formData.append('email', supplierForm.email);
      formData.append('telefono', supplierForm.telefono);
      formData.append('locales', JSON.stringify(listaLocalesArray));
      formData.append('idUsuario', operario ? operario.u.toString() : '54');
      formData.append('operarioEmail', operario ? operario.m : '');

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.ok) {
        alert("¡Proveedor registrado/actualizado con éxito!");
        setDocumentoFile(null);
        setSupplierForm({
          claveTributaria: '',
          nombre: '',
          domicilio: '',
          ciudad: '',
          estado: '',
          email: '',
          telefono: '',
          locales: ''
        });
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

  const isDark = config.theme === 'dark';

  if (step === 'config') return (
    <div className={`min-h-screen p-6 flex flex-col justify-center transition-colors ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <h2 className={`text-2xl font-bold mb-6 text-center ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Configuración Mrc</h2>

      <select
        className={`p-4 border rounded-xl mb-4 ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
        value={config.country}
        onChange={(e) => setConfig({ ...config, country: e.target.value })}
      >
        <option value="AR">Argentina (CUIT)</option>
        <option value="CL">Chile (RUT)</option>
      </select>

      <input
        className={`p-4 border rounded-xl mb-4 ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
        value={config.id}
        placeholder={config.country === 'AR' ? "CUIT" : "RUT"}
        onChange={(e) => setConfig({ ...config, id: e.target.value })}
      />

      <input
        className={`p-4 border rounded-xl mb-6 ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
        value={config.license}
        placeholder="Licencia"
        onChange={(e) => setConfig({ ...config, license: e.target.value })}
      />

      <button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-2xl font-bold mb-4 shadow-lg shadow-blue-600/30 active:scale-95 transition-all">
        GUARDAR Y CONTINUAR
      </button>

      <div className={`text-[10px] text-center tracking-widest uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {APP_VERSION}
      </div>
    </div>
  );

  if (step === 'menu') return (
    <div className={`min-h-screen p-6 flex flex-col justify-center gap-6 transition-colors ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="flex justify-end">
        <button
          onClick={toggleTheme}
          className={`p-3 border rounded-xl font-bold text-xs active:scale-95 transition-all ${isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-300 bg-white text-gray-700 shadow-xs'}`}
        >
          {isDark ? '☀️ MODO CLARO' : '🌙 MODO OSCURO'}
        </button>
      </div>

      <h1 className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-700 mb-2">Asistente IA</h1>

      {operario && (
        <div className={`text-center text-xs font-bold p-3 rounded-xl mb-2 shadow-xs border ${isDark ? 'bg-gray-800 border-green-900/50 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <div>👋 Operario: {operario.m}</div>
          <div className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            ID: {operario.u} | Grupo: {operario.g}
          </div>
        </div>
      )}

      <button onClick={() => { setDocumentoFile(null); setStep('capture'); }} className="p-10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-2xl font-bold rounded-3xl shadow-xl shadow-emerald-600/30 active:scale-95 hover:shadow-2xl transition-all">
        COMPRAS
      </button>

      <button className={`p-10 text-2xl font-bold rounded-3xl cursor-not-allowed opacity-70 border ${isDark ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-gray-200 text-gray-400 border-gray-300'}`}>
        INVENTARIO
      </button>

      <button
        onClick={() => { setDocumentoFile(null); setStep('supplier'); }}
        className="p-10 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-2xl font-bold rounded-3xl shadow-xl shadow-blue-600/30 active:scale-95 hover:shadow-2xl transition-all border border-blue-500/20"
      >
        PROVEEDORES
      </button>

      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            localStorage.removeItem('mrc_config');
            setStep('config');
          }}
          className={`p-3 text-xs font-bold rounded-xl border ${isDark ? 'bg-gray-800 text-red-400 border-red-900/50' : 'bg-red-50 text-red-700 border-red-200'} active:scale-95 transition-all`}
        >
          ⚙️ RECONFIGURAR
        </button>
      </div>

      <div className={`text-[10px] text-center tracking-widest uppercase mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        {APP_VERSION}
      </div>
    </div>
  );

  // Pantalla de Proveedores con Captura de Foto/Archivo y Carga Manual de Datos
  if (step === 'supplier') return (
    <div className={`min-h-screen flex flex-col p-4 transition-colors ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex justify-between items-center mb-3 flex-none">
        <button onClick={() => setStep('menu')} className={`font-bold py-2 active:scale-95 transition-all ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
          ← VOLVER
        </button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Gestión de Proveedores</h2>
        <button
          onClick={toggleTheme}
          className={`p-2 border rounded-xl font-bold text-xs active:scale-95 transition-all ${isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-300 bg-white text-gray-700'}`}
        >
          {isDark ? '☀️' : '🌙'}
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

      <div className="flex-1 flex flex-col gap-3 pb-4 overflow-y-auto">
        {/* Sección de captura de archivo opcional */}
        <div className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl transition-all ${documentoFile ? (isDark ? 'border-green-600 bg-green-900/20' : 'border-green-500 bg-green-50') : (isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white')}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{documentoFile ? '📄' : '📋'}</span>
            <span className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {documentoFile ? documentoFile.name : 'Adjuntar factura o constancia (Opcional)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95"
            >
              <span>📸</span> FOTO
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95"
            >
              <span>📁</span> ARCHIVO / PDF
            </button>
          </div>
        </div>

        {/* Campos de datos a mano */}
        <input
          className={`p-3 border rounded-xl text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
          value={supplierForm.claveTributaria}
          placeholder="Clave tributaria (CUIT / RUT / RUC)"
          onChange={(e) => setSupplierForm({ ...supplierForm, claveTributaria: e.target.value })}
        />

        <input
          className={`p-3 border rounded-xl text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
          value={supplierForm.nombre}
          placeholder="Nombre"
          onChange={(e) => setSupplierForm({ ...supplierForm, nombre: e.target.value })}
        />

        <input
          className={`p-3 border rounded-xl text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
          value={supplierForm.domicilio}
          placeholder="Domicilio"
          onChange={(e) => setSupplierForm({ ...supplierForm, domicilio: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            className={`p-3 border rounded-xl text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
            value={supplierForm.ciudad}
            placeholder="Ciudad"
            onChange={(e) => setSupplierForm({ ...supplierForm, ciudad: e.target.value })}
          />

          <input
            className={`p-3 border rounded-xl text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
            value={supplierForm.estado}
            placeholder="Estado"
            onChange={(e) => setSupplierForm({ ...supplierForm, estado: e.target.value })}
          />
        </div>

        <input
          type="email"
          className={`p-3 border rounded-xl text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
          value={supplierForm.email}
          placeholder="Email"
          onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
        />

        <input
          type="tel"
          className={`p-3 border rounded-xl text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
          value={supplierForm.telefono}
          placeholder="Teléfono"
          onChange={(e) => setSupplierForm({ ...supplierForm, telefono: e.target.value })}
        />

        <textarea
          className={`p-3 border rounded-xl text-sm h-20 resize-none ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
          value={supplierForm.locales}
          placeholder="Lista de locales separados por comas (ej: Local 1, Local 2)"
          onChange={(e) => setSupplierForm({ ...supplierForm, locales: e.target.value })}
        />

        <button
          onClick={handleEnviarProveedor}
          disabled={enviando}
          className={`w-full p-4 rounded-2xl font-bold text-base shadow-xl text-white transition-all mt-1 ${enviando ? (isDark ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : 'bg-gradient-to-r from-blue-600 to-indigo-700 active:scale-95 shadow-blue-600/40'}`}
        >
          {enviando ? 'PROCESANDO PROVEEDOR...' : 'REGISTRAR PROVEEDOR'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`h-dvh flex flex-col p-4 overflow-hidden transition-colors ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>

      <div className="flex justify-between items-center mb-2 flex-none">
        <button onClick={() => setStep('menu')} className={`font-bold py-2 active:scale-95 transition-all ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
          ← VOLVER
        </button>

        <button
          onClick={toggleTheme}
          className={`p-3 border rounded-xl font-bold text-xs active:scale-95 transition-all ${isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-300 bg-white text-gray-700 shadow-xs'}`}
        >
          {isDark ? '☀️ CLARO' : '🌙 OSCURO'}
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
        <div className={`flex-1 min-h-[150px] flex flex-col items-center justify-center border-4 border-dashed rounded-3xl transition-all shadow-inner ${documentoFile ? (isDark ? 'border-green-600 bg-green-900/20' : 'border-green-500 bg-green-50') : (isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white')}`}>
          <span className="text-5xl mb-2">{documentoFile ? '📄' : '📋'}</span>
          <p className={`font-bold px-4 text-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {documentoFile ? 'Documento cargado correctamente' : 'Ningún archivo seleccionado'}
          </p>
          {documentoFile && (
            <p className={`text-xs font-semibold mt-2 max-w-[85%] truncate px-3 py-1 rounded-lg border ${isDark ? 'text-blue-300 bg-blue-900/50 border-blue-800' : 'text-blue-700 bg-blue-100 border-blue-200'}`}>
              {documentoFile.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 flex-none">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="p-4 bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all border border-blue-400/20"
          >
            <span className="text-2xl">📸</span>
            <span className="text-xs tracking-wide">TOMAR FOTO</span>
          </button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all border border-indigo-400/20"
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
          className={`w-full p-5 rounded-2xl font-bold text-lg shadow-xl text-white transition-all ${enviando ? (isDark ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : 'bg-gradient-to-r from-green-500 to-emerald-700 active:scale-95 shadow-green-600/40'}`}
        >
          {enviando ? 'PROCESANDO EN API...' : 'ENVIAR DOCUMENTO'}
        </button>
      </div>
    </div>
  );
}