import React, { createContext, useContext, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { getToken, initializeFirebase, messaging, setUser } from './Functions';
import { type Firestore } from 'firebase/firestore';
import auth from './Auth';
import { SocketClient } from './SocketClient';

const server = import.meta.env.DEV ? window.location.hostname == "localhost" ? "http://localhost:5174" : "https://6v9s4f5f-5174.brs.devtunnels.ms" : "https://ifai-phwn.onrender.com";
const worker_server = import.meta.env.DEV ? "http://localhost:8787" : "https://ifai.eneagonlosamigos.workers.dev";
const socket_server = import.meta.env.DEV ? "ws://localhost:8787/ws" : "wss://ifai.eneagonlosamigos.workers.dev/ws";


if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    server
  });
}

interface User {
    name: string,
    uid: string
}

type GlobalContextInterface = {
    db: RefObject<Firestore | null>,
    socket: SocketClient,
    server: string,
    worker_server: string,
    mobile: boolean,
    usuarioLogado: User | undefined | null
    setUsuarioLogado: Dispatch<SetStateAction<User | undefined | null>>,
    logout: () => void,
    setNavigate: (fn: any) => void,
    refs: {
        respa: RefObject<HTMLHeadingElement | null>
    }
};

const GlobalContext = createContext<GlobalContextInterface | undefined>(undefined);

export const GlobalProvider: React.FC<{ setShow: any, children: React.ReactNode }> = ({ setShow, children }) => {

    const [ mobile, setMobile ] = useState<boolean>(true);
    const [ usuarioLogado, setUsuarioLogado ] = useState<User | undefined | null>(null);
    const [ socketClient, setSocketClient ] = useState<SocketClient | null>();
    
    const navigate = useRef<(pathname: string) => any>(null);
    const db = useRef<Firestore>(null);

    const setNavigate: any = (fn: any) => {
        navigate.current = fn;
    }
    const refs = {
        respa: useRef<HTMLHeadingElement>(null)
    }

    const logout = () => {
        auth.get(worker_server + "/logout").then(result=>{
            if (result.data.result){
                setUser(undefined);
                setUsuarioLogado(undefined);
                socketClient!.socket.close();
            }
        });
        // getAuth().signOut().then(() => {
        //     auth.post(server + "/logout", { user_uid: usuarioLogado!.uid });
        //     setUser(undefined);
        //     setUsuarioLogado(undefined);
        // });
    }

    const verifyMobile = () => {
        setMobile(window.innerWidth < 769);
    }

    const initialize = async () => {
        const user = usuarioLogado ? usuarioLogado : (await auth.get(worker_server + "/is_loged")).data.user;
            
        if (user){
            const socketClient = new SocketClient(socket_server);
            setSocketClient(socketClient);
            socketClient.socket.onopen = () => {
                initializeFirebase((dbValue: any)=>{
                    db.current = dbValue;

                    Notification.requestPermission().then((permission) => {
                        if (permission === 'granted') {
                            getToken(messaging!, {
                                vapidKey: 'BMnpFNI__s7Nfy5f9iau1GzD-VG2KsAG_Dz-du_lglQi642tZhK4oHbpH85tAVEWjR-3Q2gtLBCiPvxKfBDN-L8'
                            })
                            .then((currentToken) => {
                                if (currentToken) {
                                    auth.post(server + "/token", { user_uid: user.uid, token: currentToken });
                                } else {
                                    console.log('Nenhum token disponível.');
                                }
                            })
                            .catch((err) => {
                                console.log('Erro ao obter token:', err);
                            });
                        }
                    });

                
                });

                setUser(user);
                setUsuarioLogado(user);
            }
        } else {
            setUsuarioLogado(undefined);
        }
        
        setShow(true);
    }

    useEffect(()=>{
        initialize();
    },[usuarioLogado]);

    useEffect(()=>{
        // getAuth().onAuthStateChanged((user)=>{
        //     if (user){
        //         getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", user.uid))).then(results => {
        //             const currentUser = results.docs[0].data();
        //             setUser(currentUser);
        //             setUsuarioLogado(user);
        //         });

        //         Notification.requestPermission().then((permission) => {
        //             if (permission === 'granted') {
        //                 getToken(messaging!, {
        //                     vapidKey: 'BMnpFNI__s7Nfy5f9iau1GzD-VG2KsAG_Dz-du_lglQi642tZhK4oHbpH85tAVEWjR-3Q2gtLBCiPvxKfBDN-L8'
        //                 })
        //                 .then((currentToken) => {
        //                     if (currentToken) {
        //                         auth.post(server + "/token", { user_uid: user.uid, token: currentToken });
        //                     } else {
        //                         console.log('Nenhum token disponível.');
        //                     }
        //                 })
        //                 .catch((err) => {
        //                     console.log('Erro ao obter token:', err);
        //                 });
        //             }
        //         });
        //     } else {
        //         setUsuarioLogado(undefined);
        //     }
        //     setShow(true);
        // });

        //     Escuta mensagens enquanto a aba está ativa
        // onMessage(messaging!, (payload) => {
        //     console.log('Mensagem recebida no foreground:', payload);
        //     new Notification(payload.notification!.title!, {
        //         body: payload.notification!.body,
        //         icon: '/icon.png'
        //     });
        // });
  
        verifyMobile();
        window.addEventListener("resize", verifyMobile);

        return () => {
            window.removeEventListener("resize", verifyMobile);
        }
    }, []);

    const values = {
        db,
        socket: socketClient!,
        server,
        worker_server,
        mobile,
        usuarioLogado,
        setUsuarioLogado,
        logout,
        setNavigate,
        refs
    }
    return (
        <GlobalContext.Provider value={values}>{children}</GlobalContext.Provider>
    );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
