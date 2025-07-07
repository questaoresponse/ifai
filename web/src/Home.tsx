import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {  getDatabase, ref as dbRef, onValue, remove, update, push } from "firebase/database"
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import "./Home.scss";
import no_image_src from "./assets/static/avatar.png";
import no_photo_comunity from "./assets/static/default_comunidade.png"
import Alert from "./Alert";
import Feed from "./Feed";

// Função de criação do dropdown de filtro
const criarDropdownFiltro = (
  filtroOrdenacao: string,
  setFiltroOrdenacao: (value: string) => void
) => {
  return (
    <select
      id="filtroOrdenacao"
      value={filtroOrdenacao}
      onChange={(e) => setFiltroOrdenacao(e.target.value)}
      style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
    >
      <option value="maisNovos">Mais Novos</option>
      <option value="maisAntigos">Mais Antigos</option>
      <option value="maisMembros">Mais Membros</option>
      <option value="menosMembros">Menos Membros</option>
    </select>
  );
};

function Home(){
    const navigate = useNavigate();

    const showPopup = useRef<any>(null);

    const [ showForm, setShowForm ] = useState(false);

    const refs = {
        createButton: useRef<HTMLButtonElement>(null),
        listaComunidades: useRef<HTMLDivElement>(null)
    }

    const mostrarFormularioCriarComunidade = () => {
    
        setShowForm(true);
    
        refs.createButton.current!.style.display = "none";
    }
    
    const cancelarCriacaoComunidade = () => {
        const container = document.getElementById("containerFormComunidade");
        if (container) {
            container.remove();
        }
        const botaoCriar = document.querySelector(
            'button[onclick="mostrarFormularioCriarComunidade()"]'
        ) as any;
        botaoCriar.style.display = "inline-block";
    }
    
    const criarComunidade = () => {
        const nome = (document.getElementById("nomeComunidade")! as any).value.trim();
        const descricao = (document.getElementById("descricaoComunidade") as any).value.trim();
        const fileInput = document.getElementById("imagemComunidade") as any;
        const file = fileInput!.files[0];
        const privacidade = (document.getElementById("tipoPrivacidade")! as any).value;
    
        if (!nome) {
            showPopup.current("A comunidade deve ter um nome.");
            return;
        }
    
        if (nome.length < 3 || nome.length > 50) {
            showPopup.current("O nome da comunidade deve ter entre 3 e 50 caracteres.");
            return;
        }
    
        if (descricao.length > 200) {
            showPopup.current("A descrição deve ter no máximo 200 caracteres.");
            return;
        }
    
        const usuarioAtual = getAuth().currentUser!;
        if (!usuarioAtual) {
            showPopup.current("Você não está autenticado.");
            return;
        }
    
        const novaChaveComunidade = push(dbRef(getDatabase(), "comunidades")).key;
    
        function salvarNoDatabase(urlImagemFinal: string) {
            const agora = Date.now();
    
            const novaComunidade = {
            nome: nome,
            descricao: descricao,
            imagem: urlImagemFinal,
            privacidade: privacidade,
            criador: usuarioAtual.uid,
            membros: {
                [usuarioAtual.uid]: true,
            },
            timestamp: agora,
            };
    
            const atualizacoes: {[key: string]: any} = {};
            atualizacoes[`comunidades/${novaChaveComunidade}`] = novaComunidade;
            atualizacoes[`usuarios/${usuarioAtual.uid}/comunidades/${novaChaveComunidade}`] = true;
            update(dbRef(getDatabase()), atualizacoes).then(() => {
                console.log("Comunidade criada com sucesso!");
                cancelarCriacaoComunidade();
                // carregarComunidades();
            })
            .catch((erro) => {
                console.error("Erro ao criar comunidade:", erro);
                showPopup.current("Erro ao criar comunidade: " + erro.message);
            });
        }
    
        if (file) {
            const extensao = file.name.split(".").pop();
            const nomeArquivo = `comunidades/${novaChaveComunidade}/imagem.${extensao}`;
    
            uploadBytes(storageRef(getStorage(), nomeArquivo), file).then((snapshot) => {
                return getDownloadURL(snapshot.ref);
            }).then((downloadURL) => {
                salvarNoDatabase(downloadURL);
            })
            .catch((erro) => {
                console.error("Erro ao fazer upload da imagem:", erro);
                showPopup.current(
                "Erro ao enviar imagem. A comunidade será criada com imagem padrão."
                );
    
                const urlPadrao = no_photo_comunity;
                salvarNoDatabase(urlPadrao);
            });
        } else {
            const urlPadrao = no_photo_comunity;
            salvarNoDatabase(urlPadrao);
        }
    }
    // function mostrarDetalhesComunidade(comunidadeId: string) {
    //     get(dbRef(getDatabase(), "comunidades/" + comunidadeId)).then((snapshot) => {
    //         const comunidade = snapshot.val();
    //         if (!comunidade) {
    //             showPopup.current("Comunidade não encontrada");
    //             return;
    //         }
    
    //         const usuarioAtual = getAuth().currentUser!;
    //         const ehMembro =
    //             comunidade.membros && comunidade.membros[usuarioAtual.uid];
    
    //         if (
    //             comunidade.privacidade === "privada" &&
    //             !ehMembro &&
    //             comunidade.criador !== usuarioAtual.uid
    //         ) {
    //             showPopup.current("Esta é uma comunidade privada.");
    //             return;
    //         }
    
    //         navigate("/comunidade?id=" + comunidadeId);
    //         })
    //         .catch((error) => {
    //         console.error("Erro ao carregar detalhes da comunidade:", error);
    //         });
    // }
    
    // function participarComunidade(comunidadeId: string) {
    //     const usuarioAtual = getAuth().currentUser;
    //     if (!usuarioAtual) {
    //         showPopup.current("Usuário não autenticado");
    //         return;
    //     }
    
    //     get(dbRef(getDatabase(),  "comunidades/" + comunidadeId)).then((snapshot) => {
    //         const comunidade = snapshot.val();
    
    //         if (!comunidade) {
    //             showPopup.current("Comunidade não encontrada");
    //             return;
    //         }
    
    //         if (comunidade.privacidade === "publica") {
    //             let atualizacoes: {[key: string]: any} = {};
    //             atualizacoes[
    //             `comunidades/${comunidadeId}/membros/${usuarioAtual.uid}`
    //             ] = true;
    //             atualizacoes[
    //             `usuarios/${usuarioAtual.uid}/comunidades/${comunidadeId}`
    //             ] = true;
    
    //             return update(dbRef(getDatabase()), atualizacoes);
    //         } else {
    //             return set(dbRef(getDatabase(), `solicitacoes/comunidades/${comunidadeId}/${usuarioAtual.uid}`), {
    //                 solicitante: usuarioAtual.uid,
    //                 status: "pendente",
    //                 timestamp: new Date().getTime(),
    //             });
    //         }
    //         })
    //         .then(() => {
    //             showPopup.current(".");
    //         })
    //         .catch((error) => {
    //         console.error("Erro ao participar da comunidade:", error);
    //         showPopup.current("Algo deu errado");
    //         });
    // }
    
    
    const contarMembros = (comunidade: any) => {
        return comunidade.membros ? Object.keys(comunidade.membros).length : 0;
    }
    
    // function atualizarContadorComunidades() {
    //     const contadorComunidades = document.getElementById(
    //         "contadorComunidades"
    //     );
    //     if (!contadorComunidades) {
    //         const contador = document.createElement("p");
    //         contador.id = "contadorComunidades";
    //         contador.style.marginBottom = "10px";
    //         document.querySelector("main")!.insertBefore(contador, document.getElementById("novacomunidade"));
    //     }
    
    //     onValue(dbRef(getDatabase(), "comunidades"), (snapshot) => {
    //         const totalComunidades = snapshot.size;
    //         document.getElementById("contadorComunidades")!.textContent = `Comunidades existentes no momento: ${totalComunidades}`;
    //     });
    // }
        
    // function criarDropdownFiltro() {
    //     const filtroContainer = document.createElement("div");
    //     filtroContainer.style.marginBottom = "10px";
    
    //     const labelFiltro = document.createElement("label");
    //     labelFiltro.textContent = "Filtrar por: ";
    //     labelFiltro.style.marginRight = "10px";
    
    //     const selectFiltro = document.createElement("select");
    //     selectFiltro.id = "filtroOrdenacao";
    
    //     const opcoes = [
    //         { valor: "maisNovos", texto: "Mais Recentes" },
    //         { valor: "maisAntigos", texto: "Mais Antigos" },
    //         { valor: "maisMembros", texto: "Mais Membros" },
    //         { valor: "menosMembros", texto: "Menos Membros" },
    //     ];
    
    //     opcoes.forEach((opcao) => {
    //         const option = document.createElement("option");
    //         option.value = opcao.valor;
    //         option.textContent = opcao.texto;
    //         selectFiltro.appendChild(option);
    //     });
    
    //     selectFiltro.addEventListener("change", carregarComunidades as any);
    
    //     filtroContainer.appendChild(labelFiltro);
    //     filtroContainer.appendChild(selectFiltro);
    
    //     return filtroContainer;
    // }
    
    // const carregarComunidades = (mostrarTodas = false) => {
    //     const listaComunidades = refs.listaComunidades.current!;
    //     listaComunidades.innerHTML = "";
    
    //     listaComunidades.style.maxHeight = "400px";
    //     listaComunidades.style.overflowY = "auto";
    //     listaComunidades.style.border = "1px solid #ccc";
    //     listaComunidades.style.padding = "10px";
    
    //     let campoPesquisa = document.getElementById("campoPesquisaComunidades") as any;
    //     if (!campoPesquisa) {
    //         campoPesquisa = document.createElement("input");
    //         campoPesquisa.id = "campoPesquisaComunidades";
    //         campoPesquisa.type = "text";
    //         campoPesquisa.placeholder = "Pesquisar comunidades...";
    //         campoPesquisa.style.width = "100%";
    //         campoPesquisa.style.padding = "10px";
    //         campoPesquisa.style.marginBottom = "10px";
    //         campoPesquisa.addEventListener("input", carregarComunidades);
    
    //         listaComunidades.parentNode!.insertBefore(
    //         campoPesquisa,
    //         listaComunidades
    //         );
    //     }
    
    //     let filtroContainer = document.getElementById("filtroContainer");
    //     if (!filtroContainer) {
    //         filtroContainer = criarDropdownFiltro();
    //         filtroContainer.id = "filtroContainer";
    //         listaComunidades.parentNode!.insertBefore(
    //         filtroContainer,
    //         listaComunidades
    //         );
    //     }
    
    //     onValue(dbRef(getDatabase(), "comunidades"), (snapshot) => {
    //         const comunidades: any[] = [];
    
    //         snapshot.forEach((childSnapshot) => {
    //         const comunidade = childSnapshot.val();
    //         comunidade.id = childSnapshot.key;
    //         comunidade.membroCount = contarMembros(comunidade);
    
    //         const termoPesquisa = (document.getElementById("campoPesquisaComunidades") as any)?.value.toLowerCase().trim() || "";
    //         if (
    //             termoPesquisa === "" ||
    //             comunidade.nome.toLowerCase().includes(termoPesquisa) ||
    //             (comunidade.descricao &&
    //             comunidade.descricao.toLowerCase().includes(termoPesquisa))
    //         ) {
    //             comunidades.push(comunidade);
    //         }
    //         });
    
    //         const filtroOrdenacao =
    //         (document.getElementById("filtroOrdenacao") as any)?.value || "maisNovos";
    //         switch (filtroOrdenacao) {
    //         case "maisNovos":
    //             comunidades.sort(
    //             (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    //             );
    //             break;
    //         case "maisAntigos":
    //             comunidades.sort(
    //             (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    //             );
    //             break;
    //         case "maisMembros":
    //             comunidades.sort((a, b) => b.membroCount - a.membroCount);
    //             break;
    //         case "menosMembros":
    //             comunidades.sort((a, b) => a.membroCount - b.membroCount);
    //             break;
    //         }
    
    //         const comunidadesExibir = mostrarTodas
    //         ? comunidades
    //         : comunidades.slice(0, 10);
    
    //         let btnMostrarTodas = document.getElementById("btnMostrarTodas");
    //         if (!btnMostrarTodas) {
    //             btnMostrarTodas = document.createElement("button");
    //             btnMostrarTodas.id = "btnMostrarTodas";
    //             btnMostrarTodas.style.marginTop = "10px";
    //             btnMostrarTodas.style.width = "100%";
    //             listaComunidades.parentNode!.appendChild(btnMostrarTodas);
    //         }
    
    //         btnMostrarTodas.textContent = mostrarTodas
    //         ? "Mostrar menos"
    //         : "Mostrar todas as comunidades";
    //         btnMostrarTodas.onclick = () => carregarComunidades(!mostrarTodas);
    
    //         if (comunidadesExibir.length === 0) {
    //         const msgVazia = document.createElement("p");
    //         msgVazia.textContent = "Nenhuma comunidade encontrada.";
    //         listaComunidades.appendChild(msgVazia);
    //         return;
    //         }
    
    //         comunidadesExibir.forEach((comunidade) => {
    //         const div = document.createElement("div");
    //         div.style.border = "1px solid rgb(204, 204, 204)";
    //         div.style.padding = "10px";
    //         div.style.marginBottom = "10px";
    //         div.style.borderRadius = "5px";
    //         div.style.display = "flex";
    //         div.style.alignItems = "center";
    //         div.style.cursor = "pointer";
    //         div.style.flexDirection = "column";
    
    //         const banner = document.createElement("img");
    //         banner.src = comunidade.banner || no_image_src;
    //         banner.alt = comunidade.nome;
    //         banner.style.width = "20vh";
    //         banner.style.height = "auto";
    //         banner.style.marginBottom = "10px";
    //         banner.classList.add("banner");
    //         const bannerd = document.createElement("div");
    //         bannerd.className="bannerd";
    //         bannerd.appendChild(banner);
    //         div.appendChild(bannerd);
    
    //         const img = document.createElement("img");
    //         img.src = comunidade.imagem
    //             ? comunidade.imagem
    //             : "static/default_comunidade.png";
    //         img.alt = comunidade.nome;
    //         img.style.width = "50px";
    //         img.style.height = "50px";
    //         img.style.borderRadius = "50%";
    //         img.style.marginRight = "10px";
    
    //         const nome = document.createElement("div");
    //         nome.innerText = comunidade.nome;
    //         nome.style.fontWeight = "bold";
    //         nome.style.marginBottom = "5px";
    
    //         const membros = document.createElement("div");
    //         membros.innerText = `Membros: ${comunidade.membroCount}`;
    //         membros.style.color = "#666";
    //         membros.style.fontSize = "0.8em";
    
    //         div.appendChild(img);
    //         div.appendChild(nome);
    //         div.appendChild(membros);
    
    //         const usuarioAtual = getAuth().currentUser!;
    //         if (comunidade.criador && comunidade.criador === usuarioAtual.uid) {
    //             const btnExcluir = document.createElement("button");
    //             btnExcluir.innerText = "Excluir";
    //             btnExcluir.style.marginTop = "10px";
    //             btnExcluir.onclick = function (e) {
    //             e.stopPropagation();
    //             if (
    //                 confirm("Tem certeza que deseja excluir esta comunidade?")
    //             ) {
    //                 remove(dbRef(getDatabase(), "comunidades/" + comunidade.id)).then(() => {
    //                     carregarComunidades();
    //                     atualizarContadorComunidades();
    //                 })
    //                 .catch((error) => {
    //                     console.error("Erro ao excluir comunidade:", error);
    //                 });
    //             }
    //             };
    //             div.appendChild(btnExcluir);
    //         }
    
    //         div.onclick = function () {
    //             navigate("/comunidade?id=" + comunidade.id);
    //         };
    
    //         listaComunidades.appendChild(div);
    //         });
    //     });
    // }

    useEffect(()=>{
        window.navigate = navigate;
    },[]);

  const [comunidades, setComunidades] = useState<any[]>([]);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [filtroOrdenacao, setFiltroOrdenacao] = useState("maisNovos");

  useEffect(() => {
    const db = getDatabase();
    const comunidadesRef = dbRef(db, "comunidades");

    const unsubscribe = onValue(comunidadesRef, (snapshot) => {
      const lista: any[] = [];

      snapshot.forEach((childSnapshot) => {
        const comunidade = childSnapshot.val();
        comunidade.id = childSnapshot.key;
        comunidade.membroCount = contarMembros(comunidade);

        const termo = termoPesquisa.toLowerCase().trim();
        if (
          termo === "" ||
          comunidade.nome.toLowerCase().includes(termo) ||
          (comunidade.descricao &&
            comunidade.descricao.toLowerCase().includes(termo))
        ) {
          lista.push(comunidade);
        }
      });

      switch (filtroOrdenacao) {
        case "maisNovos":
          lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          break;
        case "maisAntigos":
          lista.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          break;
        case "maisMembros":
          lista.sort((a, b) => b.membroCount - a.membroCount);
          break;
        case "menosMembros":
          lista.sort((a, b) => a.membroCount - b.membroCount);
          break;
      }

      setComunidades(lista);
    });

    return () => unsubscribe();
  }, [termoPesquisa, filtroOrdenacao]);

  const handleExcluir = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta comunidade?")) {
      const db = getDatabase();
      remove(dbRef(db, "comunidades/" + id))
        .then(() => {
          console.log("Comunidade excluída");
        })
        .catch((error) => {
          console.error("Erro ao excluir comunidade:", error);
        });
    }
  };

  const usuarioAtual = getAuth().currentUser;

  const comunidadesExibir = mostrarTodas ? comunidades : comunidades.slice(0, 10);

    // carregarUsuarioAtual().then(() => {
    //                         atualizarFriendSelect();
    //                         carregarAmigos();
    //                     });

    return <>
        <main id="home" className="page">
            <div id="novacomunidade">
                { showForm ? <div id="containerFormComunidade">
                    <div id="formCriarComunidade" style={{ border: "1px solid #ccc", padding: "20px", marginTop: "10px", borderRadius: "5px" }}>
                        <h3>Criar Nova Comunidade</h3>
                        <form id="comunidadeForm">
                            <div style={{ marginBottom: "15px" }}>
                                <label>Nome da comunidade:</label>
                                <input type="text" id="nomeComunidade" required style={{ width: "100%", padding: "8px", marginTop: "5px" }}/>
                            </div>
                    
                            <div style={{ marginBottom: "15px" }}>
                                <label>Descrição:</label>
                                <textarea id="descricaoComunidade" rows={3} style={{ width: "100%", padding: "8px", marginTop: "5px" }}></textarea>
                            </div>
                    
                            <div style={{ marginBottom: "15px" }}>
                            <label>Imagem da comunidade (opcional):</label>
                            <input type="file" id="imagemComunidade" accept="image/*" style={{ width: "100%", padding: "8px", marginTop: "5px" }}/>
                            </div>
                    
                            <div style={{ marginBottom: "15px" }}>
                            <label>Tipo de privacidade:</label>
                            <select id="tipoPrivacidade" style={{ width: "100%", padding: "8px", marginTop: "5px" }}>
                                <option value="publica">Pública</option>
                                <option value="privada">Privada</option>
                            </select>
                            </div>
                    
                            <div style={{ display: "flex", justifyContent: "spaceBetween" }}>
                            <button type="button" onClick={cancelarCriacaoComunidade} style={{ padding: "8px 15px" }}>Cancelar</button>
                            <button type="button" onClick={criarComunidade} style={{ padding: "8px 15px", backgroundColor: "#4CAF50", color: "white", border: "none" }}>Criar</button>
                            </div>
                        </form>
                    </div>
                </div> : <></>}
            </div>
            <section id="comunidades">
                <div>
                    <div>
                        <input
                            type="text"
                            placeholder="Pesquisar comunidades..."
                            value={termoPesquisa}
                            onChange={(e) => setTermoPesquisa(e.target.value)}
                            style={{ width: "calc(100% - 42px", padding: "10px", marginBottom: "10px" }}
                        />
                        <button id="btn-show-form-comunity" ref={refs.createButton} onClick={mostrarFormularioCriarComunidade}>
                            <i className="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    {criarDropdownFiltro(filtroOrdenacao, setFiltroOrdenacao)}

                    <div id="comunity-list" ref={refs.listaComunidades}>
                        {comunidadesExibir.length === 0 ? (
                        <p>Nenhuma comunidade encontrada.</p>
                        ) : (
                        comunidadesExibir.map((comunidade) => (
                            <Link to={"/comunidade?id=" + comunidade.id} key={comunidade.id} className="comunity-item">
                            <img
                                src={comunidade.banner || no_image_src}
                                alt={comunidade.nome}
                                className="banner"
                            />

                            <img className="photo" src={comunidade.imagem || no_photo_comunity} alt={comunidade.nome}/>

                            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                                {comunidade.nome}
                            </div>

                            <div style={{ color: "#666", fontSize: "0.8em" }}>
                                Membros: {comunidade.membroCount}
                            </div>

                            {usuarioAtual && comunidade.criador === usuarioAtual.uid && (
                                <button
                                style={{ marginTop: "10px" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleExcluir(comunidade.id);
                                }}
                                >
                                Excluir
                                </button>
                            )}
                            </Link>
                        ))
                        )}
                    </div>

                    {comunidades.length > 10 && (
                        <button
                        style={{ marginTop: "10px", width: "100%" }}
                        onClick={() => setMostrarTodas(!mostrarTodas)}
                        >
                        {mostrarTodas ? "Mostrar menos" : "Mostrar todas as comunidades"}
                        </button>
                    )}
                    </div>
                {/* <div ref={refs.listaComunidades} id="listaComunidades" style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}></div> */}
            </section>
            <Feed userPerfilUid={null}></Feed>
        </main>
        <Alert showPopup={showPopup}></Alert>
    </>
}

export default Home;