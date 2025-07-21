import { Link } from "react-router-dom";
import "./Tools.scss";

function Tools(){
    return <div id="tools" className="page">
        <div id="tools-list">
            <Link to={"/flashcards"} className="tools-item">FlashCards</Link>
            <Link to={"/add-posts"} className="tools-item">Adicionar Posts</Link>
        </div>
    </div>
}

export default Tools;