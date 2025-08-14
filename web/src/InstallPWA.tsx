import { useLayoutEffect, useState } from "react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useLayoutEffect(() => {
    const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e); // Guarda o evento para usar depois
        setShowInstall(true); // Mostra botão na tela
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt(); // Abre o popup nativo de instalação
    const choice = await deferredPrompt.userChoice;

    console.log("Resultado da instalação:", choice.outcome);
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  return showInstall ?
    <div style={{ 
            position:"absolute",
            display: "flex",
            top: "0px",
            width: "100%",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.1)",
        }}>
        <div style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "fit-content",
            height: "fit-content",
            backgroundColor: "white",
            borderRadius: "10px",
            padding: "20px",
        }}>
                        <button
            onClick={()=>setShowInstall(false)}
            style={{
                position: "relative",
                fontSize: '20px',
                width: '30px',
                height: '30px',
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: "auto",
                backgroundColor: '#15803d', // Adjusted to a darker green
                color: '#fff',
                fontWeight: '600',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out',
                marginBottom:"10px"
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#166534'; // Darker on hover
                e.currentTarget.style.transform = 'scale(1.02)'; // Slight scale on hover
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#15803d';
                e.currentTarget.style.transform = 'scale(1)';
            }}
            onFocus={(e) => { // Added focus styles for accessibility
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(21, 128, 61, 0.5)'; // Ring on focus
            }}
            onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
            }}
            >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
            <h1 style={{width: "fit-content"}}>Instale nosso App</h1>
            <p style={{width: "fit-content"}}>Tenha a melhor experiência no seu dispositivo.</p>
            <button
            style={{
                position: "relative",
                backgroundColor: '#15803d', // Adjusted to a darker green
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                marginLeft: "auto",
                marginRight: "auto",
                marginTop: "20px",
            }}
            onClick={handleInstallClick}
             onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#166534'; // Darker on hover
                e.currentTarget.style.transform = 'scale(1.02)'; // Slight scale on hover
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#15803d';
                e.currentTarget.style.transform = 'scale(1)';
            }}
            onFocus={(e) => { // Added focus styles for accessibility
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(21, 128, 61, 0.5)'; // Ring on focus
            }}
            onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
            }}
            >
            Instalar App
            </button>
        </div>
    </div>
  : <></>;
}
