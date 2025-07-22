import React, { createContext, useContext, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { getAuth, type User } from "firebase/auth";
import { getToken, initializeFirebase, messaging, setUser } from './Functions';
import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore';
import auth from './Auth';

const server = import.meta.env.DEV ? window.location.hostname == "localhost" ? "http://localhost:5174" : "https://6v9s4f5f-5174.brs.devtunnels.ms" : "https://ifai-phwn.onrender.com";

if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    server
  });
}

type GlobalContextInterface = {
    db: RefObject<Firestore | null>,
    server: string,
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
    const navigate = useRef<(pathname: string) => any>(null);
    const db = useRef<Firestore>(null);

    const setNavigate: any = (fn: any) => {
        navigate.current = fn;
    }
    const refs = {
        respa: useRef<HTMLHeadingElement>(null)
    }

    const logout = () => {

        getAuth().signOut().then(() => {
            auth.post(server + "/logout", { user_uid: usuarioLogado!.uid });
            setUser(undefined);
            setUsuarioLogado(undefined);
        });
    }

    const verifyMobile = () => {
        setMobile(window.innerWidth < 769);
    }

    useEffect(()=>{
        initializeFirebase((dbValue: any)=>{
            db.current = dbValue;

            getAuth().onAuthStateChanged((user)=>{
                if (user){
                    getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", user.uid))).then(results => {
                        const currentUser = results.docs[0].data();
                        setUser(currentUser);
                        setUsuarioLogado(user);
                    });

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
                } else {
                    setUsuarioLogado(undefined);
                }
                setShow(true);
            });

                // Escuta mensagens enquanto a aba está ativa
            // onMessage(messaging!, (payload) => {
            //     console.log('Mensagem recebida no foreground:', payload);
            //     new Notification(payload.notification!.title!, {
            //         body: payload.notification!.body,
            //         icon: '/icon.png'
            //     });
            // });
        });
  
        verifyMobile();
        window.addEventListener("resize", verifyMobile);

        return () => {
            window.removeEventListener("resize", verifyMobile);
        }
    }, []);

    const values = {
        db,
        server,
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
