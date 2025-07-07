import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, remove, onValue, push, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getStorage, ref as storageRef } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";

window.initializeFirebase(firebase=>{

window.mostrarFormularioCriarComunidade = () => {
    const formHTML = `
    <div id="formCriarComunidade" style="border: 1px solid #ccc; padding: 20px; margin-top: 10px; border-radius: 5px;">
      <h3>Criar Nova Comunidade</h3>
      <form id="comunidadeForm">
        <div style="margin-bottom: 15px;">
          <label for="nomeComunidade">Nome da comunidade:</label>
          <input type="text" id="nomeComunidade" required style="width: 100%; padding: 8px; margin-top: 5px;">
        </div>

        <div style="margin-bottom: 15px;">
          <label for="descricaoComunidade">Descrição:</label>
          <textarea id="descricaoComunidade" rows="3" style="width: 100%; padding: 8px; margin-top: 5px;"></textarea>
        </div>

        <div style="margin-bottom: 15px;">
          <label for="imagemComunidade">Imagem da comunidade (opcional):</label>
          <input type="file" id="imagemComunidade" accept="image/*" style="width: 100%; padding: 8px; margin-top: 5px;">
        </div>

        <div style="margin-bottom: 15px;">
          <label for="tipoPrivacidade">Tipo de privacidade:</label>
          <select id="tipoPrivacidade" style="width: 100%; padding: 8px; margin-top: 5px;">
            <option value="publica">Pública</option>
            <option value="privada">Privada</option>
          </select>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <button type="button" onclick="cancelarCriacaoComunidade()" style="padding: 8px 15px;">Cancelar</button>
          <button type="button" onclick="criarComunidade()" style="padding: 8px 15px; background-color: #4CAF50; color: white; border: none;">Criar</button>
        </div>
      </form>
    </div>
    `;

    const botaoCriar = document.querySelector(
        'button[onclick="mostrarFormularioCriarComunidade()"]'
    );
    const divForm = document.createElement("div");
    divForm.id = "containerFormComunidade";
    divForm.innerHTML = formHTML;
    botaoCriar.parentNode.insertBefore(divForm, botaoCriar.nextSibling);

    botaoCriar.style.display = "none";
}

window. cancelarCriacaoComunidade = () => {
    const container = document.getElementById("containerFormComunidade");
    if (container) {
        container.remove();
    }
    const botaoCriar = document.querySelector(
        'button[onclick="mostrarFormularioCriarComunidade()"]'
    );
    botaoCriar.style.display = "inline-block";
}

window.criarComunidade = () => {
    const nome = document.getElementById("nomeComunidade").value.trim();
    const descricao = document
        .getElementById("descricaoComunidade")
        .value.trim();
    const fileInput = document.getElementById("imagemComunidade");
    const file = fileInput.files[0];
    const privacidade = document.getElementById("tipoPrivacidade").value;

    if (!nome) {
        alert("A comunidade deve ter um nome.");
        return;
    }

    if (nome.length < 3 || nome.length > 50) {
        alert("O nome da comunidade deve ter entre 3 e 50 caracteres.");
        return;
    }

    if (descricao.length > 200) {
        alert("A descrição deve ter no máximo 200 caracteres.");
        return;
    }

    const usuarioAtual = getAuth().currentUser;
    if (!usuarioAtual) {
        alert("Você não está autenticado.");
        return;
    }

    const novaChaveComunidade = push(dbRef(getDatabase(), "comunidades")).key;

    function salvarNoDatabase(urlImagemFinal) {
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

        const atualizacoes = {};
        atualizacoes[`comunidades/${novaChaveComunidade}`] = novaComunidade;
        atualizacoes[
        `usuarios/${usuarioAtual.uid}/comunidades/${novaChaveComunidade}`
        ] = true;
        update(dbRef(getDatabase()), atualizacoes).then(() => {
            console.log("Comunidade criada com sucesso!");
            cancelarCriacaoComunidade();
            carregarComunidades();
        })
        .catch((erro) => {
            console.error("Erro ao criar comunidade:", erro);
            alert("Erro ao criar comunidade: " + erro.message);
        });
    }

    if (file) {
        const extensao = file.name.split(".").pop();
        const nomeArquivo = `comunidades/${novaChaveComunidade}/imagem.${extensao}`;
        storageRef = storageRef(getStorage(), nomeArquivo);

        storageRef
        .put(file)
        .then((snapshot) => {
            return snapshot.ref.getDownloadURL();
        })
        .then((downloadURL) => {
            salvarNoDatabase(downloadURL);
        })
        .catch((erro) => {
            console.error("Erro ao fazer upload da imagem:", erro);
            alert(
            "Erro ao enviar imagem. A comunidade será criada com imagem padrão."
            );

            const urlPadrao = "static/default_comunidade.png";
            salvarNoDatabase(urlPadrao);
        });
    } else {
        const urlPadrao = "static/default_comunidade.png";
        salvarNoDatabase(urlPadrao);
    }
}
function mostrarDetalhesComunidade(comunidadeId) {
    get(dbRef(getDatabase(), "comunidades/" + comunidadeId)).then((snapshot) => {
        const comunidade = snapshot.val();
        if (!comunidade) {
            alert("Comunidade não encontrada");
            return;
        }

        const usuarioAtual = getAuth().currentUser;
        const ehMembro =
            comunidade.membros && comunidade.membros[usuarioAtual.uid];

        if (
            comunidade.privacidade === "privada" &&
            !ehMembro &&
            comunidade.criador !== usuarioAtual.uid
        ) {
            alert("Esta é uma comunidade privada.");
            return;
        }

        window.location.href = "comunidade.html?id=" + comunidadeId;
        })
        .catch((error) => {
        console.error("Erro ao carregar detalhes da comunidade:", error);
        });
    }

function participarComunidade(comunidadeId) {
    const usuarioAtual = getAuth().currentUser;
    if (!usuarioAtual) {
        alert("Usuário não autenticado");
        return;
    }

    get(dbRef(getDatabase(),  "comunidades/" + comunidadeId)).then((snapshot) => {
        const comunidade = snapshot.val();

        if (!comunidade) {
            alert("Comunidade não encontrada");
            return;
        }

        if (comunidade.privacidade === "publica") {
            let atualizacoes = {};
            atualizacoes[
            `comunidades/${comunidadeId}/membros/${usuarioAtual.uid}`
            ] = true;
            atualizacoes[
            `usuarios/${usuarioAtual.uid}/comunidades/${comunidadeId}`
            ] = true;

            return update(storageRef(getStorage()), (atualizacoes));
        } else {
            return set(storageRef(getStorage(),`solicitacoes/comunidades/${comunidadeId}/${usuarioAtual.uid}`), {
                solicitante: usuarioAtual.uid,
                status: "pendente",
                timestamp: firebase.database.ServerValue.TIMESTAMP,
            });
        }
        })
        .then(() => {
            alert(".");
        })
        .catch((error) => {
        console.error("Erro ao participar da comunidade:", error);
        alert("Algo deu errado");
        });
    }

getAuth().onAuthStateChanged(function (user) {
    if (user) {
        window.carregarUsuarioAtual().then(() => {
            window.atualizarFriendSelect();
            carregarComunidades();
        });
    } else {
        window.location.href = "login.html";
    }
});

    function contarMembros(comunidade) {
    return comunidade.membros ? Object.keys(comunidade.membros).length : 0;
    }

    function atualizarContadorComunidades() {
    const contadorComunidades = document.getElementById(
        "contadorComunidades"
    );
    if (!contadorComunidades) {
        const contador = document.createElement("p");
        contador.id = "contadorComunidades";
        contador.style.marginBottom = "10px";
        document
        .querySelector("main")
        .insertBefore(contador, document.getElementById("novacomunidade"));
    }

    onValue(dbRef(getDatabase(), "comunidades"), (snapshot) => {
        const totalComunidades = snapshot.size;
        document.getElementById(
            "contadorComunidades"
        ).textContent = `Comunidades existentes no momento: ${totalComunidades}`;
        });
    }

    function criarDropdownFiltro() {
    const filtroContainer = document.createElement("div");
    filtroContainer.style.marginBottom = "10px";

    const labelFiltro = document.createElement("label");
    labelFiltro.textContent = "Filtrar por: ";
    labelFiltro.style.marginRight = "10px";

    const selectFiltro = document.createElement("select");
    selectFiltro.id = "filtroOrdenacao";

    const opcoes = [
        { valor: "maisNovos", texto: "Mais Recentes" },
        { valor: "maisAntigos", texto: "Mais Antigos" },
        { valor: "maisMembros", texto: "Mais Membros" },
        { valor: "menosMembros", texto: "Menos Membros" },
    ];

    opcoes.forEach((opcao) => {
        const option = document.createElement("option");
        option.value = opcao.valor;
        option.textContent = opcao.texto;
        selectFiltro.appendChild(option);
    });

    selectFiltro.addEventListener("change", carregarComunidades);

    filtroContainer.appendChild(labelFiltro);
    filtroContainer.appendChild(selectFiltro);

    return filtroContainer;
    }

    function carregarComunidades(mostrarTodas = false) {
    const listaComunidades = document.getElementById("listaComunidades");
    listaComunidades.innerHTML = "";

    listaComunidades.style.maxHeight = "400px";
    listaComunidades.style.overflowY = "auto";
    listaComunidades.style.border = "1px solid #ccc";
    listaComunidades.style.padding = "10px";

    let campoPesquisa = document.getElementById("campoPesquisaComunidades");
    if (!campoPesquisa) {
        campoPesquisa = document.createElement("input");
        campoPesquisa.id = "campoPesquisaComunidades";
        campoPesquisa.type = "text";
        campoPesquisa.placeholder = "Pesquisar comunidades...";
        campoPesquisa.style.width = "100%";
        campoPesquisa.style.padding = "10px";
        campoPesquisa.style.marginBottom = "10px";
        campoPesquisa.addEventListener("input", carregarComunidades);

        listaComunidades.parentNode.insertBefore(
        campoPesquisa,
        listaComunidades
        );
    }

    let filtroContainer = document.getElementById("filtroContainer");
    if (!filtroContainer) {
        filtroContainer = criarDropdownFiltro();
        filtroContainer.id = "filtroContainer";
        listaComunidades.parentNode.insertBefore(
        filtroContainer,
        listaComunidades
        );
    }

    onValue(dbRef(getDatabase(), "comunidades"), (snapshot) => {
        const comunidades = [];

        snapshot.forEach((childSnapshot) => {
        const comunidade = childSnapshot.val();
        comunidade.id = childSnapshot.key;
        comunidade.membroCount = contarMembros(comunidade);

        const termoPesquisa =
            document
            .getElementById("campoPesquisaComunidades")
            ?.value.toLowerCase()
            .trim() || "";
        if (
            termoPesquisa === "" ||
            comunidade.nome.toLowerCase().includes(termoPesquisa) ||
            (comunidade.descricao &&
            comunidade.descricao.toLowerCase().includes(termoPesquisa))
        ) {
            comunidades.push(comunidade);
        }
        });

        const filtroOrdenacao =
        document.getElementById("filtroOrdenacao")?.value || "maisNovos";
        switch (filtroOrdenacao) {
        case "maisNovos":
            comunidades.sort(
            (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
            );
            break;
        case "maisAntigos":
            comunidades.sort(
            (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
            );
            break;
        case "maisMembros":
            comunidades.sort((a, b) => b.membroCount - a.membroCount);
            break;
        case "menosMembros":
            comunidades.sort((a, b) => a.membroCount - b.membroCount);
            break;
        }

        const comunidadesExibir = mostrarTodas
        ? comunidades
        : comunidades.slice(0, 10);

        let btnMostrarTodas = document.getElementById("btnMostrarTodas");
        if (!btnMostrarTodas) {
        btnMostrarTodas = document.createElement("button");
        btnMostrarTodas.id = "btnMostrarTodas";
        btnMostrarTodas.style.marginTop = "10px";
        btnMostrarTodas.style.width = "100%";
        listaComunidades.parentNode.appendChild(btnMostrarTodas);
        }

        btnMostrarTodas.textContent = mostrarTodas
        ? "Mostrar menos"
        : "Mostrar todas as comunidades";
        btnMostrarTodas.onclick = () => carregarComunidades(!mostrarTodas);

        if (comunidadesExibir.length === 0) {
        const msgVazia = document.createElement("p");
        msgVazia.textContent = "Nenhuma comunidade encontrada.";
        listaComunidades.appendChild(msgVazia);
        return;
        }

        comunidadesExibir.forEach((comunidade) => {
        const div = document.createElement("div");
        div.style.border = "1px solid rgb(204, 204, 204)";
        div.style.padding = "10px";
        div.style.marginBottom = "10px";
        div.style.borderRadius = "5px";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.cursor = "pointer";
        div.style.flexDirection = "column";

        if (comunidade.banner) {
            const banner = document.createElement("img");
            banner.src = comunidade.banner;
            banner.alt = comunidade.nome;
            banner.style.width = "20vh";
            banner.style.height = "auto";
            banner.style.marginBottom = "10px";
            banner.classList.add("banner");
            div.appendChild(banner);
        }

        const img = document.createElement("img");
        img.src = comunidade.imagem
            ? comunidade.imagem
            : "static/default_comunidade.png";
        img.alt = comunidade.nome;
        img.style.width = "50px";
        img.style.height = "50px";
        img.style.borderRadius = "50%";
        img.style.marginRight = "10px";

        const nome = document.createElement("div");
        nome.innerText = comunidade.nome;
        nome.style.fontWeight = "bold";
        nome.style.marginBottom = "5px";

        const membros = document.createElement("div");
        membros.innerText = `Membros: ${comunidade.membroCount}`;
        membros.style.color = "#666";
        membros.style.fontSize = "0.8em";

        div.appendChild(img);
        div.appendChild(nome);
        div.appendChild(membros);

        const usuarioAtual = getAuth().currentUser;
        if (comunidade.criador && comunidade.criador === usuarioAtual.uid) {
            const btnExcluir = document.createElement("button");
            btnExcluir.innerText = "Excluir";
            btnExcluir.style.marginTop = "10px";
            btnExcluir.onclick = function (e) {
            e.stopPropagation();
            if (
                confirm("Tem certeza que deseja excluir esta comunidade?")
            ) {
                remove(dbRef(getDatabase(), "comunidades/" + comunidade.id)).then(() => {
                    carregarComunidades();
                    atualizarContadorComunidades();
                })
                .catch((error) => {
                    console.error("Erro ao excluir comunidade:", error);
                });
            }
            };
            div.appendChild(btnExcluir);
        }

        div.onclick = function () {
            window.location.href = "comunidade.html?id=" + comunidade.id;
        };

        listaComunidades.appendChild(div);
        });
    });
    }

    getAuth().onAuthStateChanged(function (user) {
    if (user) {
        window.carregarUsuarioAtual().then(() => {
            window.atualizarFriendSelect();

            atualizarContadorComunidades();
        });
    } else {
        window.location.href = "login.html";
    }
    });

});