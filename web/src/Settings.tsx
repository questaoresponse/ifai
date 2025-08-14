import { Link } from "react-router-dom";
import { useGlobal } from "./Global";
import "./Settings.scss";

function Settings(){
    const { logout } = useGlobal();
    const cleanCache = () => {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: "clean_cache",
            });
        }
    }

    return <div id="settings" className="page">
        <div className="setting-item">
            <Link to="/login" onClick={(e)=>{e.preventDefault();logout();}} id="logoutBtn" className="setting-title">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>&nbsp;
                <div id="sair">Sair</div>
                {/* <span className="btn-text" style={{ display: "none" }}>Sair</span> */}
            </Link>
        </div>
        <div className="setting-item" onClick={cleanCache}>
            <div className="setting-title">Limpar cache</div>
            <div className="setting-description">Limpar cache pode resolver bugs.</div>
        </div>
    </div>
}

export default Settings;