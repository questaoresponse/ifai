import { useRef } from "react";
import { getDatabase, push, ref as dbRef} from "firebase/database";
function AddFeed(){
    const refs = {
        text: useRef<HTMLInputElement>(null),
        file: useRef<HTMLInputElement>(null)
    }

    const addFeed = () => {
        const text = refs.text.current!.value;
        const file = refs.text.current!.value;
        push(dbRef(getDatabase(), "/feeds"), {type:"0", image: file, text });
    }

    return <div id="addFeed">
        <input ref={refs.text} id="text"></input>
        <input ref={refs.file} id="file" type="file"></input>
        <div onClick={addFeed}>adicionar</div>
    </div>
}

export default AddFeed;