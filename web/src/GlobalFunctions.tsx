import { useLayoutEffect } from "react";
import { useGlobal } from "./Global";
import { useLocation, useNavigate } from "react-router-dom";

function GlobalFunctions(){
    const { usuarioLogado } = useGlobal();
    const navigate = useNavigate();
    const location = useLocation();

    useLayoutEffect(()=>{
        if ( usuarioLogado === undefined && location.pathname != "/login" && location.pathname != "/registro" ){
            navigate("/login");
        } else if (usuarioLogado && (location.pathname == "/login" || location.pathname == "/registro")){
            navigate("/");
        }
    },[usuarioLogado, location]);
    return <></>
}

export default GlobalFunctions;