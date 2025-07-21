import { Link } from "react-router-dom";
import { useGlobal } from "./Global";
import "./Settings.scss";

function Settings(){
    const { logout } = useGlobal();
    return <div id="settings" className="page">
        <div className="setting-item">
            <Link to="/login" onClick={(e)=>{e.preventDefault();logout();}} id="logoutBtn">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>&nbsp;
                {/* <span className="btn-text" style={{ display: "none" }}>Sair</span> */}
            </Link>
            <div id="sair">Sair</div>

        </div>
    </div>
}

export default Settings;