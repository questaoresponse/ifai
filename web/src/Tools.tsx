import { Link } from "react-router-dom";
import "./Tools.scss";

function Tools(){
    return <div id="tools" className="page">
        <h2 className="tools-title">Ferramentas de estudo</h2>
        <div id="tools-list">
            <Link to={"/flashcards"} className="tools-item">
                <i className="fa-regular fa-address-card"></i>
                FlashCards
            </Link>
        </div>
    </div>
}

export default Tools;