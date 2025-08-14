import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';

import './App.css';
import "./style.css";
import { GlobalProvider } from './Global';

import GlobalFunctions from './GlobalFunctions';
import Home from './Home';
import Amigos from './Amigos';
import Chats from "./chats/Chats";
import Comunidade from "./Comunidade";
import Login from "./Login";
import Perfil from "./Perfil";
import Registro from "./Registro";
import FlashCards from './FlashCards';
import Tools from './Tools';

import logo_src from "./assets/static/ifai2.png";
import Header from './Header';
import AddPost from './AddPost';
import Search from './Search';
import Settings from './Settings';
import InstallPWA from './InstallPWA';

const Renderize = ({ Element } : { Element: any }) => {
    return <>
        <Element></Element>
        <Header></Header>
        <GlobalFunctions></GlobalFunctions>
    </>
}


function App() {

    const [ show, setShow ] = useState(false);

    return (
        <GlobalProvider setShow={setShow}>
            { show ?
                <Router>
                <Routes>
                    <Route path="/" element={<Renderize Element={Home}/>} />
                    <Route path="/search" element={<Renderize Element={Search}/>} />
                    <Route path="/amigos" element={<Renderize Element={Amigos}/>} />
                    <Route path="/chats" element={<Renderize Element={Chats}/>} />
                    <Route path="/chat/:id/" element={<Renderize Element={Chats}/>} />
                    <Route path="/comunidade" element={<Renderize Element={Comunidade}/>} />
                    <Route path="/login" element={<Renderize Element={Login}/>} />
                    <Route path="/registro" element={<Renderize Element={Registro}/>} />
                    <Route path="/perfil" element={<Renderize Element={Perfil}/>} />
                    <Route path="/settings" element={<Renderize Element={Settings}/>} />
                    <Route path="/ferramentas" element={<Renderize Element={Tools}/>} />
                    <Route path="/flashcards" element={<Renderize Element={FlashCards}/>} />
                    <Route path="/add-posts" element={<Renderize Element={AddPost}/>} />
                </Routes>
                </Router>
            : <div id="loading">
                <div className="header_logo">
                    <img src={logo_src} width="150px"/>
                </div>
            </div>}
            <InstallPWA></InstallPWA>
        </GlobalProvider>
    )
    }

export default App;