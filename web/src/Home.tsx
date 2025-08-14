import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Home.scss";
import Feed from "./Feed";
import { useGlobal } from "./Global";
import logo_src from "./assets/static/ifai2.png";
// import { motion } from "framer-motion"

function Home(){
    const { mobile } = useGlobal();

    const navigate = useNavigate();

    useEffect(()=>{
        window.navigate = navigate;
    },[]);

    // const carouselRef = useRef<HTMLDivElement>(null);
    // const [width, setWidth] = useState(0);

    // useEffect(() => {
    //     if (carouselRef.current) {
    //         // Largura total menos a largura visível
    //         setWidth(
    //             carouselRef.current.scrollWidth - carouselRef.current.offsetWidth
    //         );
    //     }
    // }, []);


    // carregarUsuarioAtual().then(() => {
    //                         atualizarFriendSelect();
    //                         carregarAmigos();
    //                     });

    return <>
        <main id="home" className="page">
            {mobile ? <div id="home-header">
                 <div className="header_logo">
                    <Link to="/"><img src={logo_src} width="60px" alt="Logo" /></Link>
                </div>
                <Link to="/chats" className="defbtn" id="chatButton">
                    <i className="i-header fa-solid fa-comment-dots"></i>
                    <span id="chatNotification"></span>
                </Link>
            </div> : <></>}
            {/* <motion.div
                ref={carouselRef}
                className="carousel"
                >
                <motion.div
                    drag="x"
                    dragConstraints={{ right: 0, left: -width }}
                    dragElastic={0.2}
                    transition={{ type: "spring", bounce: 0.3 }}
                    className="inner-carousel"
                >
                    {Array.from({ length: 2 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="item"
                        whileTap={{ scale: 0.95 }}
                    >
                        {i + 1}
                    </motion.div>
                    ))}
                </motion.div>
                </motion.div> */}
            <Feed userPerfilUid={null}></Feed>
        </main>
    </>
}

export default Home;