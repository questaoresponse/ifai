import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, push, remove, update, query, orderByChild, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js"

window.initializeFirebase(firebase=>{

let communityCreator = null;
let adminMembers = {};
let isSelfAdmin = false;
let allMembers = [];

let comunidadeId = null;

let excluirOpcao = null;

let modoSelecao = false;

function carregarComunidade() {
    get(getDatabase(), dbRef('comunidades/' + comunidadeId)).then(snapshot => {
    if (snapshot.exists()) {
        const comunidade = snapshot.val();

        document.getElementById('comunidadeTitulo').innerText = comunidade.nome || 'Comunidade';
        document.getElementById('comunidadeDescricao').innerText = comunidade.descricao || 'Sem descrição';

        if (comunidade.tags) {
        document.getElementById('comunidadeTags').style.display = 'block';
        document.getElementById('comunidadeTags').querySelector('span').innerText = comunidade.tags;
        } else {
        document.getElementById('comunidadeTags').style.display = 'none';
        }

        if (comunidade.imagem) {
        document.getElementById('comunidadeImagem').src = comunidade.imagem;
        } else {
        document.getElementById('comunidadeImagem').src = 'static/default_comunidade.png';
        }

        communityCreator = comunidade.criador;

        if (comunidade.admins) {
        adminMembers = comunidade.admins;
        }

        isSelfAdmin = (usuarioLogado.uid === communityCreator) || 
                    (adminMembers && adminMembers[usuarioLogado.uid]);

        carregarMembros(comunidade);
    } else {
        alert('Comunidade não encontrada.');
        window.location.href = 'index.html';
    }
    }).catch(error => {
    console.error('Erro ao carregar comunidade:', error);
    alert('Erro ao carregar dados da comunidade.');
    });
}

function carregarMembros(comunidade) {
    const membersListContainer = document.getElementById('membersList');
    membersListContainer.innerHTML = '';

    if (!comunidade.membros) {
    membersListContainer.innerHTML = '<div class="no-members">Nenhum membro encontrado</div>';
    document.getElementById('membersCount').textContent = '(0)';
    return;
    }

    const memberIds = Object.keys(comunidade.membros);

    document.getElementById('membersCount').textContent = `(${memberIds.length})`;

    const memberPromises = [];

    memberIds.forEach(memberId => {
    const promise = get(dbRef(getDatabase(), 'usuarios/' + memberId)).then(userSnapshot => {
        if (userSnapshot.exists()) {
            return {
            id: memberId,
            ...userSnapshot.val()
            };
        }
        return null;
        });

    memberPromises.push(promise);
    });

    Promise.all(memberPromises)
    .then(members => {

        allMembers = members.filter(member => member !== null);

        allMembers.sort((a, b) => {
        if (a.id === communityCreator) return -1;
        if (b.id === communityCreator) return 1;
        if (adminMembers[a.id] && !adminMembers[b.id]) return -1;
        if (!adminMembers[a.id] && adminMembers[b.id]) return 1;
        return (a.nome || '').localeCompare(b.nome || '');
        });

        renderizarMembros(allMembers);
    })
    .catch(error => {
        console.error('Erro ao carregar membros:', error);
        membersListContainer.innerHTML = '<div class="error-message">Erro ao carregar membros</div>';
    });
}

function renderizarMembros(members) {
    const membersListContainer = document.getElementById('membersList');
    membersListContainer.innerHTML = '';

    members.forEach(member => {
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item';
    memberItem.dataset.memberId = member.id;

    const isCreator = member.id === communityCreator;
    const isAdmin = adminMembers[member.id];

    memberItem.innerHTML = `
        <img src="${member.fotoPerfil || 'static/avatar.png'}" alt="${member.nome}" class="member-avatar">
        <div class="member-info">
        <div class="member-name">
            ${member.nome || 'Usuário'}
            ${isCreator ? '<i class="fas fa-crown crown-icon" title="Líder da comunidade"></i>' : ''}
            ${isAdmin && !isCreator ? '<span class="admin-badge">Admin</span>' : ''}
        </div>
        </div>
    `;

    const canManageMember = isSelfAdmin && member.id !== usuarioLogado.uid;
    const isUserCreator = usuarioLogado.uid === communityCreator;

    if (canManageMember && (isUserCreator || member.id !== communityCreator)) {
        memberItem.addEventListener('click', (e) => {
        abrirMenuMembro(e, member);
        });
    }

    membersListContainer.appendChild(memberItem);
    });
}

function abrirMenuMembro(event, member) {
    event.preventDefault();

    const existingMenu = document.querySelector('.member-options');
    if (existingMenu) {
    existingMenu.remove();
    }

    const targetIsCreator = member.id === communityCreator;

    const isUserCreator = usuarioLogado.uid === communityCreator;
    if (targetIsCreator && !isUserCreator) {
    return; 
    }

    const menuOptions = document.createElement('div');
    menuOptions.className = 'member-options';

    const targetIsAdmin = adminMembers[member.id];
    const canModifyAdmin = isUserCreator; 

    menuOptions.innerHTML = `
    <div class="member-options-header">
        <img src="${member.fotoPerfil || 'static/avatar.png'}" alt="${member.nome}">
        ${member.nome || 'Usuário'}
    </div>
    ${canModifyAdmin ? `
        <div class="option-item toggle-admin">
        ${targetIsAdmin ? 'Remover administrador' : 'Definir como administrador'}
        </div>
    ` : ''}
    <div class="option-item mute-member">Silenciar membro</div>
    <div class="option-item danger kick-member">Expulsar da comunidade</div>
    <div class="option-item danger ban-member">Banir permanentemente</div>
    `;

    menuOptions.style.position = 'absolute';
    menuOptions.style.left = `${event.clientX}px`;
    menuOptions.style.top = `${event.clientY}px`;

    document.body.appendChild(menuOptions);

    const rect = menuOptions.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
    menuOptions.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
    menuOptions.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    menuOptions.style.display = 'block';

    if (canModifyAdmin) {
    menuOptions.querySelector('.toggle-admin').addEventListener('click', () => {
        toggleAdminStatus(member.id, targetIsAdmin);
        menuOptions.remove();
    });
    }

    menuOptions.querySelector('.mute-member').addEventListener('click', () => {
    muteMember(member.id);
    menuOptions.remove();
    });

    menuOptions.querySelector('.kick-member').addEventListener('click', () => {
    kickMember(member.id);
    menuOptions.remove();
    });

    menuOptions.querySelector('.ban-member').addEventListener('click', () => {
    banMember(member.id);
    menuOptions.remove();
    });

    document.addEventListener('click', function closeMenu(e) {
    if (!menuOptions.contains(e.target) && !e.target.closest('.member-item')) {
        menuOptions.remove();
        document.removeEventListener('click', closeMenu);
    }
    });
}

function toggleAdminStatus(memberId, isCurrentlyAdmin) {

    if (memberId === communityCreator) {

    return;
    }

    if (!isCurrentlyAdmin) {

    set(dbRef(getDatabase(), `comunidades/${comunidadeId}/admins/${memberId}`), true).then(() => {
        adminMembers[memberId] = true;
        renderizarMembros(allMembers);
        })
        .catch(error => {
        console.error('Erro ao definir administrador:', error);
        alert('Não foi possível definir o administrador.');
        });
    } else {

    remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/admins/${memberId}`)).then(() => {
        delete adminMembers[memberId];
        renderizarMembros(allMembers);
    })
    .catch(error => {
    console.error('Erro ao remover administrador:', error);
    alert('Não foi possível remover o administrador.');
    });
    }
}

function muteMember(memberId) {

    if (memberId === communityCreator) {
    alert('Não é possível silenciar o líder da comunidade.');
    return;
    }

    if (usuarioLogado.uid !== communityCreator && adminMembers[usuarioLogado.uid]) {

    if (adminMembers[memberId]) {
        alert('Você não tem permissão para fazer isso.');
        return;
    }
    }

    const muteTime = prompt('Por quanto tempo deseja silenciar este membro? (em horas)');

    if (muteTime === null) return; 

    const hoursToMute = parseInt(muteTime);
    if (isNaN(hoursToMute) || hoursToMute <= 0) {
    alert('Insira um número válido de horas.');
    return;
    }

    const now = new Date();
    const muteEndTime = new Date(now.getTime() + (hoursToMute * 60 * 60 * 1000));

    set(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${memberId}/muted`), {
        until: muteEndTime.getTime(),
        by: usuarioLogado.uid,
        reason: 'Silenciado por administrador',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    })
    .then(() => {
    alert(`Membro silenciado por ${hoursToMute} hora(s).`);
    })
    .catch(error => {
    console.error('Erro ao silenciar membro:', error);
    alert('Não foi possível silenciar o membro.');
    });
}

function kickMember(memberId) {

    if (memberId === communityCreator) {
    alert('Não é possível expulsar o líder da comunidade.');
    return;
    }

    if (usuarioLogado.uid !== communityCreator && adminMembers[usuarioLogado.uid]) {

    if (adminMembers[memberId]) {
        alert('Você não tem permissão para fazer isso.');
        return;
    }
    }

    if (!confirm(`Tem certeza que deseja expulsar este membro da comunidade?`)) {
    return;
    }

    remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${memberId}`)).then(() => {

        if (adminMembers[memberId]) {
        return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/admins/${memberId}`));
        }
        return Promise.resolve();
    })
    .then(() => { 
        allMembers = allMembers.filter(m => m.id !== memberId);
        document.getElementById('membersCount').textContent = `(${allMembers.length})`;
        renderizarMembros(allMembers);
    })
    .catch(error => {
        console.error('Erro ao expulsar membro:', error);
        alert('Não foi possível expulsar o membro.');
    });
}

function banMember(memberId) {

    if (memberId === communityCreator) {
    alert('Não é possível banir o líder da comunidade.');
    return;
    }

    if (usuarioLogado.uid !== communityCreator && adminMembers[usuarioLogado.uid]) {

    if (adminMembers[memberId]) {
        alert('Você não tem permissão para fazer isso.');
        return;
    }
    }

    if (!confirm(`Tem certeza que deseja banir permanentemente este membro da comunidade?`)) {
    return;
    }

    set(dbRef(getDatabase(), `comunidades/${comunidadeId}/banidos/${memberId}`), {
        by: usuarioLogado.uid,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        reason: 'Banido por administrador'
    }).then(() => {

    return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${memberId}`));
    })
    .then(() => {

    if (adminMembers[memberId]) {
        return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/admins/${memberId}`));
    }
    return Promise.resolve();
    })
    .then(() => {
    allMembers = allMembers.filter(m => m.id !== memberId);
    document.getElementById('membersCount').textContent = `(${allMembers.length})`;
    renderizarMembros(allMembers);
    })
    .catch(error => {
    console.error('Erro ao banir membro:', error);
    alert('Não foi possível banir o membro.');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('memberSearch');
    const searchButton = document.getElementById('searchButton');

    if (searchInput && searchButton) {

    function buscarMembros() {
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (searchTerm === '') {

        renderizarMembros(allMembers);
        return;
        }

        const filteredMembers = allMembers.filter(member => 
        (member.nome || '').toLowerCase().includes(searchTerm)
        );

        renderizarMembros(filteredMembers);
    }

    searchButton.addEventListener('click', buscarMembros);

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
        e.preventDefault();
        buscarMembros();
        }
    });

    searchInput.addEventListener('input', function() {
        if (this.value === '') {
        renderizarMembros(allMembers);
        }
    });
    }
});

function enviarMensagem() {
    if (!usuarioLogado || !comunidadeId) return;

    const messageInput = document.getElementById('messageInput');
    if (!messageInput) {
    console.error('Elemento messageInput não encontrado');
    return;
    }

    const message = messageInput.value.trim();
    if (message === '') {
    return;
    }

    get(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${usuarioLogado.uid}/muted`)).then(snapshot => {
        if (snapshot.exists()) {
        const mutedData = snapshot.val();
        const now = new Date().getTime();

        if (mutedData.until > now) {

            const timeRemaining = new Date(mutedData.until - now);
            const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
            const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

            alert(`Você está silenciado e não pode enviar mensagens. Tempo restante: ${hours}h ${minutes}m`);
            return;
        } else {

            remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${usuarioLogado.uid}/muted`));
        }
        }

        const novaMensagem = {
            remetente: usuarioLogado.uid,
            texto: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };


        push(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens`), novaMensagem).then(() => {
            messageInput.value = '';
            const chatContainer = document.getElementById('chat-messages');
            if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        })
        .catch(error => {
            console.error('Erro ao enviar mensagem:', error);
            alert('Não foi possível enviar a mensagem.');
        });
    });
}

let bannerUrl = '';

function abrirModalBanner() {
    if (!isSelfAdmin) return; 
    document.getElementById('bannerModal').style.display = 'flex';
}

function fecharModalBanner() {
    document.getElementById('bannerModal').style.display = 'none';
}

function salvarBanner() {
    const fileInput = document.getElementById('bannerFileInput');
    if (!fileInput.files || fileInput.files.length === 0) {
    alert('Selecione uma imagem para o banner.');
    return;
    }

    const file = fileInput.files[0];

    uploadBytes(storageRef(getStorage(), `comunidades/${comunidadeId}/banner/${file.name}`), file).then(snapshot => {
        return snapshot.ref.getDownloadURL();
    }).then(downloadURL => {
        return update(dbRef(getDatabase(), `comunidades/${comunidadeId}`), { banner: downloadURL });
    }).then(() => {
        fecharModalBanner();
        carregarBanner(); 
    }).catch(error => {
    console.error('Erro ao atualizar banner:', error);
    alert('Erro ao atualizar banner.');
    });
}

function carregarBanner() {
    get(dbRef(getDatabase(), `comunidades/${comunidadeId}/banner`)).then(snapshot => {
        const bannerUrl = snapshot.val() || 'https://via.placeholder.com/300x150';
        document.getElementById('communityBanner').style.backgroundImage = `url('${bannerUrl}')`;
    })
    .catch(error => {
        console.error('Erro ao carregar banner:', error);
    });
}

function atualizarBannerNoBanco(url) {
    update(dbRef(getDatabase(), `comunidades/${comunidadeId}`), { banner: url }).then(() => {
        fecharModalBanner();
        carregarBanner();
    })
    .catch((error) => {
        console.error('Erro ao atualizar banner:', error);
        alert('Erro ao atualizar banner.');
    });
}

function carregarBanner() {
    get(dbRef(getDatabase(), `comunidades/${comunidadeId}/banner`)).then((snapshot) => {
        if (snapshot.exists()) {
        bannerUrl = snapshot.val();
        document.getElementById('communityBanner').style.backgroundImage = `url('${bannerUrl}')`;
        } else {
        document.getElementById('communityBanner').style.backgroundImage = 'none';
        }
    })
    .catch((error) => {
        console.error('Erro ao carregar banner:', error);
    });
}

document.getElementById('communityBanner').addEventListener('click', abrirModalBanner);

carregarBanner();

    function verificarStatusMembro() {
        if (!usuarioLogado || !comunidadeId) return;
        
        get(dbRef(getDatabase(), `comunidades/${comunidadeId}`)).then(snapshot => {
            if (!snapshot.exists()) return;
        
            const comunidade = snapshot.val();
            const isCreator = comunidade.criador === usuarioLogado.uid;
        
            if (isCreator) {
                document.getElementById('botao-entrar-container').style.display = 'none';
        
                habilitarChatInput(true);
                return;
            }
        
            get(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${usuarioLogado.uid}`)).then(memberSnapshot => {
                if (memberSnapshot.exists()) {
        
                    document.getElementById('botao-entrar-container').style.display = 'none';
        
                    habilitarChatInput(true);
                } else {
        
                    document.getElementById('botao-entrar-container').style.display = 'block';
        
                    habilitarChatInput(false);
        
                    document.getElementById('botao-entrar').onclick = entrarNaComunidade;
                }
                });
            });
    }
    
    function entrarNaComunidade() {
    if (!usuarioLogado || !comunidadeId) return;
    
    set(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${usuarioLogado.uid}`), {
        entrou: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        document.getElementById('botao-entrar-container').style.display = 'none';
        habilitarChatInput(true);
    }).catch(error => {
        console.error('Erro ao entrar na comunidade:', error);
        alert('Não foi possível entrar na comunidade.');
    });
  }
    
    function habilitarChatInput(habilitar) {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.querySelector('#chat-input button');
    
    if (messageInput) {
        if (habilitar) {
        messageInput.removeAttribute('disabled');
        messageInput.placeholder = 'Digite sua mensagem...';
        } else {
        messageInput.setAttribute('disabled', 'disabled');
        messageInput.placeholder = 'Entre na comunidade para enviar mensagens...';
        }
    }
    
    if (sendButton) {
        if (habilitar) {
        sendButton.removeAttribute('disabled');
        sendButton.style.opacity = '1';
        } else {
        sendButton.setAttribute('disabled', 'disabled');
        sendButton.style.opacity = '0.5';
        }
    }
    }
    
    getAuth().onAuthStateChanged(function(user) {
    if (user) {
        usuarioLogado = user;
    
        comunidadeId = getQueryParam('id');
    
        if (comunidadeId) {
    
        verificarAcessoComunidade(comunidadeId, user.uid).then(podeAcessar => {
            if (podeAcessar) {
            carregarComunidade();
            carregarMensagens();
            verificarStatusMembro(); 
            } else {
            alert('Você não tem permissão para acessar esta comunidade.');
            window.location.href = 'index.html';
            }
        });
        } else {
        alert('ID da comunidade não encontrado.');
        window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'login.html';
    }
    });
    
    function getQueryParam(param) {
      const params = new URLSearchParams(window.location.search);
      return params.get(param);
    }
    comunidadeId = getQueryParam('id');
    
    getAuth().onAuthStateChanged(function(user) {
      if (user) {
    usuarioLogado = user;
    
    comunidadeId = getQueryParam('id');
    
    if (comunidadeId) {
    
      verificarAcessoComunidade(comunidadeId, user.uid).then(podeAcessar => {
        if (podeAcessar) {
          carregarComunidade();
          carregarMensagens();
        } else {
          alert('Você não tem permissão para acessar esta comunidade.');
          window.location.href = 'index.html';
        }
      });
    } else {
      alert('ID da comunidade não encontrado.');
      window.location.href = 'index.html';
    }
      } else {
    window.location.href = 'login.html';
      }
    });
    
    function verificarAcessoComunidade(comunidadeId, userId) {
      return get(dbRef(getDatabase(), 'comunidades/' + comunidadeId)).then(snapshot => {
      if (!snapshot.exists()) {
        return false;
      }
    
      const comunidade = snapshot.val();
    
      if (comunidade.privacidade === 'publica') {
        return true;
      }
    
      return (comunidade.criador === userId || 
             (comunidade.membros && comunidade.membros[userId]));
    })
    .catch(error => {
      console.error('Erro ao verificar acesso:', error);
      return false;
    });
    }
    
    function carregarComunidade() {
    get(dbRef(getDatabase(), 'comunidades/' + comunidadeId)).then(snapshot => {
    if (snapshot.exists()) {
      const comunidade = snapshot.val();
      document.getElementById('comunidadeTitulo').innerText = comunidade.nome || 'Comunidade';
      document.getElementById('comunidadeDescricao').innerText = comunidade.descricao || 'Sem descrição';
    
      if (comunidade.tags) {
        document.getElementById('comunidadeTags').style.display = 'block';
        document.getElementById('comunidadeTags').querySelector('span').innerText = comunidade.tags;
      } else {
        document.getElementById('comunidadeTags').style.display = 'none';
      }
    
      if (comunidade.imagem) {
        document.getElementById('comunidadeImagem').src = comunidade.imagem;
      } else {
        document.getElementById('comunidadeImagem').src = 'static/default_comunidade.png';
      }
    
      if (comunidade.membros) {
        const numMembros = Object.keys(comunidade.membros).length;
        const membroText = numMembros === 1 ? '1 membro' : `${numMembros} membros`;
        const membrosInfo = document.createElement('p');
        membrosInfo.textContent = membroText;
        document.querySelector('.comunidade-info').appendChild(membrosInfo);
      }
    } else {
      alert('Comunidade não encontrada.');
      window.location.href = 'index.html';
    }
      }).catch(error => {
    console.error('Erro ao carregar comunidade:', error);
    alert('Erro ao carregar dados da comunidade.');
      });
    }
    

    
    function iniciarGravacaoAudio() {
      if (!usuarioLogado || !comunidadeId) return;
    
      if (!navigator.mediaDevices || !window.MediaRecorder) {
    alert('Seu navegador não suporta gravação de áudio.');
    return;
      }
    
      if (isRecording) {
    pararGravacaoAudio();
    return;
      }
    
      navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
    
      const gravadorContainer = document.getElementById('gravador-container');
      if (gravadorContainer) {
        gravadorContainer.style.display = 'flex';
      } else {
        criarGravadorContainer();
      }
    
      audioSeconds = 0;
      atualizarTempoGravacao();
      audioTimer = setInterval(atualizarTempoGravacao, 1000);
    
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
    
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
    
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        enviarAudioMensagem(audioBlob);
      };
    
      mediaRecorder.start();
      isRecording = true;
    
      const gravacaoBtn = document.getElementById('audio-record-btn');
      if (gravacaoBtn) {
        gravacaoBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        gravacaoBtn.classList.add('recording');
        gravacaoBtn.title = 'Parar gravação';
      }
    })
    .catch(error => {
      console.error('Erro ao acessar o microfone:', error);
      alert('Não foi possível acessar o microfone.');
    });
    }
    
    function pararGravacaoAudio() {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    
      clearInterval(audioTimer);
    
      mediaRecorder.stop();
      isRecording = false;
    
      if (mediaRecorder.stream) {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    
      const gravadorContainer = document.getElementById('gravador-container');
      if (gravadorContainer) {
    gravadorContainer.style.display = 'none';
      }
    
      const gravacaoBtn = document.getElementById('audio-record-btn');
      if (gravacaoBtn) {
    gravacaoBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    gravacaoBtn.classList.remove('recording');
    gravacaoBtn.title = 'Gravar mensagem de voz';
      }
    }
    
    function cancelarGravacaoAudio() {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    
      clearInterval(audioTimer);
    
      mediaRecorder.stop();
      isRecording = false;
      audioChunks = []; 
    
      if (mediaRecorder.stream) {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    
      const gravadorContainer = document.getElementById('gravador-container');
      if (gravadorContainer) {
    gravadorContainer.style.display = 'none';
      }
    
      const gravacaoBtn = document.getElementById('audio-record-btn');
      if (gravacaoBtn) {
    gravacaoBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    gravacaoBtn.classList.remove('recording');
    gravacaoBtn.title = 'Gravar mensagem de voz';
      }
    }
    
    function atualizarTempoGravacao() {
      audioSeconds++;
      const minutos = Math.floor(audioSeconds / 60);
      const segundos = audioSeconds % 60;
    
      const tempoFormatado = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
      const tempoElement = document.getElementById('tempo-gravacao');
    
      if (tempoElement) {
    tempoElement.textContent = tempoFormatado;
      }
    
      if (audioSeconds >= 1000) {
    pararGravacaoAudio();
      }
    }
    
    function criarGravadorContainer() {
      const chatContainer = document.getElementById('chat-container') || document.body;
    
      const gravadorContainer = document.createElement('div');
      gravadorContainer.id = 'gravador-container';
      gravadorContainer.style.display = 'flex';
      gravadorContainer.style.alignItems = 'center';
      gravadorContainer.style.justifyContent = 'space-between';
      gravadorContainer.style.backgroundColor = '#f0f0f0';
      gravadorContainer.style.padding = '10px 15px';
      gravadorContainer.style.borderRadius = '10px';
      gravadorContainer.style.margin = '10px 0';
      gravadorContainer.style.gap = '10px';
      gravadorContainer.style.position = 'fixed';
      gravadorContainer.style.bottom = '70px';
      gravadorContainer.style.left = '50%';
      gravadorContainer.style.transform = 'translateX(-50%)';
      gravadorContainer.style.width = '80%';
      gravadorContainer.style.maxWidth = '400px';
      gravadorContainer.style.zIndex = '100';
    
      const recordingIcon = document.createElement('div');
      recordingIcon.innerHTML = '<i class="fa-solid fa-circle"></i>';
      recordingIcon.style.color = 'red';
      recordingIcon.style.fontSize = '14px';
      recordingIcon.style.animation = 'pulse 1.5s infinite ease-in-out';
    
      if (!document.getElementById('pulse-animation')) {
    const style = document.createElement('style');
    style.id = 'pulse-animation';
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
      }
    
      const tempoGravacao = document.createElement('div');
      tempoGravacao.id = 'tempo-gravacao';
      tempoGravacao.textContent = '00:00';
      tempoGravacao.style.fontFamily = 'monospace';
      tempoGravacao.style.fontSize = '16px';
      tempoGravacao.style.fontWeight = 'bold';
    
      const lembrete = document.createElement('div');
      lembrete.textContent = 'Áudios podem ter no máximo 3 minutos.';
      lembrete.style.fontSize = '12px';
      lembrete.style.color = '#666';
      lembrete.style.marginTop = '5px';
      lembrete.style.textAlign = 'center';
      lembrete.style.width = '100%';
    
      const botoesContainer = document.createElement('div');
      botoesContainer.style.display = 'flex';
      botoesContainer.style.gap = '15px';
    
      const enviarBtn = document.createElement('button');
      enviarBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
      enviarBtn.style.border = 'none';
      enviarBtn.style.backgroundColor = '#248232';
      enviarBtn.style.color = 'white';
      enviarBtn.style.borderRadius = '50%';
      enviarBtn.style.width = '35px';
      enviarBtn.style.height = '35px';
      enviarBtn.style.display = 'flex';
      enviarBtn.style.alignItems = 'center';
      enviarBtn.style.justifyContent = 'center';
      enviarBtn.style.cursor = 'pointer';
      enviarBtn.title = 'Enviar';
      enviarBtn.onclick = pararGravacaoAudio;
    
      const cancelarBtn = document.createElement('button');
      cancelarBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
      cancelarBtn.style.border = 'none';
      cancelarBtn.style.backgroundColor = '#e53935';
      cancelarBtn.style.color = 'white';
      cancelarBtn.style.borderRadius = '50%';
      cancelarBtn.style.width = '35px';
      cancelarBtn.style.height = '35px';
      cancelarBtn.style.display = 'flex';
      cancelarBtn.style.alignItems = 'center';
      cancelarBtn.style.justifyContent = 'center';
      cancelarBtn.style.cursor = 'pointer';
      cancelarBtn.title = 'Cancelar';
      cancelarBtn.onclick = cancelarGravacaoAudio;
    
      botoesContainer.appendChild(enviarBtn);
      botoesContainer.appendChild(cancelarBtn);
    
      gravadorContainer.appendChild(recordingIcon);
      gravadorContainer.appendChild(tempoGravacao);
      gravadorContainer.appendChild(lembrete);
      gravadorContainer.appendChild(botoesContainer);
    
      chatContainer.appendChild(gravadorContainer);
    }
    
    function enviarAudioMensagem(audioBlob) {
      if (!usuarioLogado || !comunidadeId || !audioBlob) return;
    
      const audioFileName = `audio_${usuarioLogado.uid}_${Date.now()}.wav`;
    
      const audioRef = storageRef(getStorage(),`chat_audios/${comunidadeId}/${audioFileName}`);
    
      const progressBar = document.createElement('div');
      progressBar.style.width = '0%';
      progressBar.style.height = '4px';
      progressBar.style.backgroundColor = '#4CAF50';
      progressBar.style.position = 'fixed';
      progressBar.style.top = '0';
      progressBar.style.left = '0';
      progressBar.style.zIndex = '1000';
      document.body.appendChild(progressBar);
    
      const uploadTask = uploadBytes(audioRef, audioBlob);
    
      uploadTask.on('state_changed', 
    
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.style.width = `${progress}%`;
    },
    
    (error) => {
      console.error('Erro ao fazer upload do áudio:', error);
      alert('Não foi possível enviar a mensagem de voz.');
      document.body.removeChild(progressBar);
    },
    
    () => {
    
      uploadTask.snapshot.ref.getDownloadURL()
        .then((audioUrl) => {
    
          const messageInput = document.getElementById('messageInput');
          const messageText = messageInput ? messageInput.value.trim() : '';
    
          const novaMensagem = {
            remetente: usuarioLogado.uid,
            texto: messageText, 
            audio: {
              url: audioUrl,
              duracao: audioSeconds 
            },
            timestamp: firebase.database.ServerValue.TIMESTAMP
          };
    
          return push(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens`), novaMensagem);
        })
        .then(() => {
    
          if (document.getElementById('messageInput')) {
            document.getElementById('messageInput').value = '';
          }
    
          document.body.removeChild(progressBar);
        })
        .catch((error) => {
          console.error('Erro ao salvar mensagem de áudio:', error);
          alert('Não foi possível enviar a mensagem de voz.');
    
          if (document.body.contains(progressBar)) {
            document.body.removeChild(progressBar);
          }
        });
    }
      );
    }
    
    function adicionarBotaoGravacaoAudio() {
      const inputContainer = document.getElementById('chat-input');
    
      if (!inputContainer) {
    console.error('Container de input não encontrado');
    return;
      }
    
      const audioButton = document.createElement('button');
      audioButton.id = 'audio-record-btn';
      audioButton.type = 'button';
      audioButton.className = 'attachment-btn';
      audioButton.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      audioButton.title = 'Gravar mensagem de voz';
      audioButton.style.background = 'none';
      audioButton.style.border = 'none';
      audioButton.style.color = '#248232';
      audioButton.style.fontSize = '20px';
      audioButton.style.cursor = 'pointer';
      audioButton.style.padding = '5px 10px';
      audioButton.style.transition = 'all 0.2s ease';
    
      const style = document.createElement('style');
      style.textContent = `
    #audio-record-btn.recording {
      color: #e53935 !important;
      animation: pulse 1.5s infinite ease-in-out;
    }
      `;
      document.head.appendChild(style);
    
      audioButton.addEventListener('click', iniciarGravacaoAudio);
    
      const sendButton = inputContainer.querySelector('button[type="submit"]') || 
                    inputContainer.querySelector('.send-btn');
    
      if (sendButton) {
    inputContainer.insertBefore(audioButton, sendButton);
      } else {
    inputContainer.appendChild(audioButton);
      }
    }
    
    function excluirAudio(messageId, audioUrl) {
      if (!usuarioLogado || !comunidadeId) return;
    
      if (confirm('Tem certeza que deseja excluir esta mensagem de áudio?')) {
    
    const storageRef = firebase.storage().refFromURL(audioUrl);
    storageRef.delete()
      .then(() => {
    
        return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens/${messageId}`));
      })
      .then(() => {
        console.log('Mensagem de áudio excluída com sucesso');
      })
      .catch(error => {
        console.error('Erro ao excluir mensagem de áudio:', error);
        alert('Não foi possível excluir a mensagem.');
      });
      }
    }
    
    document.addEventListener('DOMContentLoaded', function() {
    
      
    });
    
    function enviarMensagem() {
        if (!usuarioLogado || !comunidadeId) return;
        
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) {
            console.error('Elemento messageInput não encontrado');
            return;
        }
        
        const message = messageInput.value.trim();
        if (message === '') return;
    
        const novaMensagem = {
            remetente: usuarioLogado.uid,
            texto: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    
    
        push(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens`), novaMensagem)
    .then(() => {
      messageInput.value = '';
    
      const chatContainer = document.getElementById('chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    })
    .catch(error => {
      console.error('Erro ao enviar mensagem:', error);
      alert('Não foi possível enviar a mensagem.');
    });
    }
    
    function excluirMensagem(messageId) {
        if (!usuarioLogado || !comunidadeId) return;
        
        if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
            remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens/${messageId}`)).then(() => {
                console.log('Mensagem excluída com sucesso');
            })
            .catch(error => {
                console.error('Erro ao excluir mensagem:', error);
                alert('Não foi possível excluir a mensagem.');
            });
        }
    }
    
    function excluirImagem(messageId, imageUrl) {
        if (!usuarioLogado || !comunidadeId) return;
    
        if (confirm('Tem certeza que deseja excluir esta mensagem com imagem?')) {
    
        const storageRef = firebase.storage().refFromURL(imageUrl);
        storageRef.delete()
        .then(() => {
        
            return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens/${messageId}`));
        })
        .then(() => {
            console.log('Mensagem e imagem excluídas com sucesso');
        })
        .catch(error => {
            console.error('Erro ao excluir mensagem com imagem:', error);
            alert('Não foi possível excluir a mensagem.');
        });
        }
    }

    
    function excluirArquivo(messageId, fileUrl) {
      if (!usuarioLogado || !comunidadeId) return;
    
      if (confirm('Tem certeza que deseja excluir esta mensagem com arquivo?')) {
    
        const storageRef = firebase.storage().refFromURL(fileUrl);
        storageRef.delete()
        .then(() => {
        
            return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens/${messageId}`));
        })
        .then(() => {
            console.log('Mensagem e arquivo excluídos com sucesso');
        })
        .catch(error => {
            console.error('Erro ao excluir mensagem com arquivo:', error);
            alert('Não foi possível excluir a mensagem.');
        });
      }
    }
    
    function handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
    
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxFileSize = 5 * 1024 * 1024; 
    
      if (!allowedTypes.includes(file.type)) {
    alert('Apenas suportamos imagens JPEG, PNG, GIF e WebP.');
    return;
      }
    
      if (file.size > maxFileSize) {
    alert('A imagem não pode ser maior que 5MB.');
    return;
      }
    
      const messageInput = document.getElementById('messageInput');
      const messageText = messageInput ? messageInput.value.trim() : '';
    
      const imageRef = storageRef(getStorage(), `chat_images/${comunidadeId}/${usuarioLogado.uid}_${Date.now()}_${file.name}`);
    
    uploadBytes(imageRef, file)
    .then(snapshot => snapshot.ref.getDownloadURL())
    .then(imageUrl => {
    
      const novaMensagem = {
        remetente: usuarioLogado.uid,
        texto: messageText, 
        imagem: imageUrl,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
    
      return push(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens`), novaMensagem);
    })
    .then(() => {
    
      document.getElementById('imageUpload').value = '';
      if (messageInput) {
        messageInput.value = '';
      }
    })
    .catch(error => {
    
    });
    }
    
    function handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) {
    return;
      }
    
      const allowedFileTypes = [
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats.officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
      ];
    
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    
      const maxFileSize = 20 * 1024 * 1024; 
    
      if (imageTypes.includes(file.type)) {
    handleImageUpload(event);
    return;
      } else if (videoTypes.includes(file.type)) {
    handleVideoUpload(event);
    return;
      }
    
      if (file.size > maxFileSize) {
    alert('O tamanho do arquivo não pode ser maior que 20MB.');
    return;
      }
    
      const messageInput = document.getElementById('messageInput');
      const messageText = messageInput ? messageInput.value.trim() : '';
    
      const fileRef = storageRef(getStorage(), `chat_files/${comunidadeId}/${usuarioLogado.uid}_${Date.now()}_${file.name}`);
    
    uploadBytes(fileRef, file)
    .then(snapshot => snapshot.ref.getDownloadURL())
    .then(fileUrl => {
    
      const novaMensagem = {
        remetente: usuarioLogado.uid,
        texto: messageText, 
        arquivo: {
          url: fileUrl,
          nome: file.name,
          tipo: file.type,
          tamanho: file.size 
        },
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
    
      return push(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens`), novaMensagem);
    })
    .then(() => {
    
      document.getElementById('fileUpload').value = '';
      if (messageInput) {
        messageInput.value = '';
      }
    })
    .catch(error => {
      console.error('Erro no upload do arquivo:', error);
      alert('Não foi possível enviar o arquivo.');
    });
    }
    
    function handleVideoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
    
      const maxFileSize = 20 * 1024 * 1024; 
      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    
      if (!allowedTypes.includes(file.type)) {
    alert('Apenas suportamos vídeos MP4, WebM ou OGG.');
    return;
      }
    
      if (file.size > maxFileSize) {
    alert('O tamanho do vídeo não pode ser maior que 20MB.');
    return;
      }
    
      const messageInput = document.getElementById('messageInput');
      const messageText = messageInput ? messageInput.value.trim() : '';
    
      const videoRef = storageRef(getStorage(), `chat_videos/${comunidadeId}/${usuarioLogado.uid}_${Date.now()}_${file.name}`);
    
      const progressBar = document.createElement('div');
      progressBar.style.width = '0%';
      progressBar.style.height = '4px';
      progressBar.style.backgroundColor = '#4CAF50';
      progressBar.style.position = 'fixed';
      progressBar.style.top = '0';
      progressBar.style.left = '0';
      progressBar.style.zIndex = '1000';
      document.body.appendChild(progressBar);
    
      uploadBytes(videoRef, file)
    .then(snapshot => {
    
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.style.width = `${progress}%`;
    
      return snapshot.ref.getDownloadURL();
    })
    .then(videoUrl => {
    
      const novaMensagem = {
        remetente: usuarioLogado.uid,
        texto: messageText,
        video: videoUrl,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
    
      return push(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens`), novaMensagem);
    })
    .then(() => {
    
      document.getElementById('fileUpload').value = '';
      if (messageInput) {
        messageInput.value = '';
      }
    
      document.body.removeChild(progressBar);
    })
    .catch(error => {
      console.error('Erro no upload do vídeo:', error);
      alert('Não foi possível enviar o vídeo.');
    
      if (document.body.contains(progressBar)) {
        document.body.removeChild(progressBar);
      }
    });
    }
    function excluirVideo(messageId, videoUrl) {
      if (!usuarioLogado || !comunidadeId) return;
    
      if (confirm('Tem certeza que deseja excluir esta mensagem com vídeo?')) {
    const storageRef = firebase.storage().refFromURL(videoUrl);
    storageRef.delete()
      .then(() => {
        return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens/${messageId}`));
      })
      .then(() => {
        console.log('Mensagem e vídeo excluídos com sucesso');
      })
      .catch(error => {
        console.error('Erro ao excluir mensagem com vídeo:', error);
        alert('Não foi possível excluir a mensagem.');
      });
      }
    }
    
function carregarMensagens() {
    const chatMessagesContainer = document.getElementById('chat-messages');
    if (!chatMessagesContainer) {
        console.error('Elemento chat-messages não encontrado');
        return;
    }
    
    let barraOpcoes = document.getElementById('barra-opcoes-selecao');
    if (!barraOpcoes) {
        barraOpcoes = document.createElement('div');
        barraOpcoes.id = 'barra-opcoes-selecao';
        barraOpcoes.style.position = 'fixed';
        barraOpcoes.style.bottom = '0';
        barraOpcoes.style.left = '0';
        barraOpcoes.style.right = '0';
        barraOpcoes.style.backgroundColor = '#333';
        barraOpcoes.style.color = 'white';
        barraOpcoes.style.padding = '10px';
        barraOpcoes.style.display = 'none';
        barraOpcoes.style.justifyContent = 'space-between';
        barraOpcoes.style.alignItems = 'center';
        barraOpcoes.style.zIndex = '1000';
        
        const contadorSelecionadas = document.createElement('span');
        contadorSelecionadas.id = 'contador-selecionadas';
        contadorSelecionadas.textContent = '0 selecionadas';
        
        const btnExcluir = document.createElement('button');
        btnExcluir.textContent = 'Excluir';
        btnExcluir.style.backgroundColor = 'red';
        btnExcluir.style.color = 'white';
        btnExcluir.style.border = 'none';
        btnExcluir.style.padding = '5px 10px';
        btnExcluir.style.borderRadius = '5px';
        btnExcluir.style.cursor = 'pointer';
        btnExcluir.onclick = excluirMensagensSelecionadas;
        
        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.style.backgroundColor = 'gray';
        btnCancelar.style.color = 'white';
        btnCancelar.style.border = 'none';
        btnCancelar.style.padding = '5px 10px';
        btnCancelar.style.borderRadius = '5px';
        btnCancelar.style.cursor = 'pointer';
        btnCancelar.onclick = cancelarSelecao;
        
        barraOpcoes.appendChild(contadorSelecionadas);
        barraOpcoes.appendChild(btnExcluir);
        barraOpcoes.appendChild(btnCancelar);
        
        document.body.appendChild(barraOpcoes);
    }
    
    const chatRef = dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens`);
    
      
    const chatQuery = query(chatRef, orderByChild("timestamp"));

    onValue(chatQuery, (snapshot) => {
        chatMessagesContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.color = '#666';
            emptyMessage.textContent = 'Nenhuma mensagem enviada ainda. Seja o primeiro a enviar!';
            chatMessagesContainer.appendChild(emptyMessage);
            return;
        }
        
        let lastTimestamp = 0;
        const messages = [];
        
        snapshot.forEach(childSnapshot => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        messages.forEach(mensagem => {
            const messageId = mensagem.id;
            const mensagemContainer = document.createElement('div');
            mensagemContainer.style.display = 'flex';
            mensagemContainer.style.alignItems = 'flex-start';
            mensagemContainer.style.margin = '10px 0';
            mensagemContainer.setAttribute('data-message-id', messageId);
            
            const img = document.createElement('img');
            img.style.width = '40px';
            img.style.height = '40px';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            img.style.marginRight = '10px';
            
            const div = document.createElement('div');
            div.classList.add('message-bubble');
            div.style.padding = '8px';
            div.style.borderRadius = '15px';
            div.style.maxWidth = '70%';
            div.style.position = 'relative';
            div.style.wordBreak = 'break-word';
            
            const timestamp = mensagem.timestamp;
            const date = new Date(timestamp);
            
            if (mensagem.remetente === usuarioLogado.uid) {
            
                const messageWrapper = document.createElement('div');
                messageWrapper.style.position = 'relative';
                messageWrapper.style.display = 'flex';
                messageWrapper.style.justifyContent = 'flex-end';
                messageWrapper.style.width = '100%';
                messageWrapper.classList.add('mensagem-usuario');
                messageWrapper.setAttribute('data-message-id', messageId);
            
                div.style.backgroundColor = '#248232';
                div.style.color = 'white';
            
                const timeString = formatTime(date);
            
                if (mensagem.imagem) {
                    const imagemContainer = document.createElement('div');
                    imagemContainer.style.maxWidth = '250px';
                    imagemContainer.style.margin = '5px 0';
                
                    const imagemElement = document.createElement('img');
                    imagemElement.src = mensagem.imagem;
                    imagemElement.style.maxWidth = '100%';
                    imagemElement.style.borderRadius = '10px';
                    imagemElement.style.cursor = 'pointer';
                
                    imagemElement.onclick = () => {
                        const modalImagem = document.createElement('div');
                        modalImagem.style.position = 'fixed';
                        modalImagem.style.top = '0';
                        modalImagem.style.left = '0';
                        modalImagem.style.width = '100%';
                        modalImagem.style.height = '100%';
                        modalImagem.style.backgroundColor = 'rgba(0,0,0,0.8)';
                        modalImagem.style.display = 'flex';
                        modalImagem.style.justifyContent = 'center';
                        modalImagem.style.alignItems = 'center';
                        modalImagem.style.zIndex = '1000';
                
                        const imagemModal = document.createElement('img');
                        imagemModal.src = mensagem.imagem;
                        imagemModal.style.maxWidth = '90%';
                        imagemModal.style.maxHeight = '90%';
                        imagemModal.style.objectFit = 'contain';
                
                        modalImagem.onclick = () => document.body.removeChild(modalImagem);
                        modalImagem.appendChild(imagemModal);
                        document.body.appendChild(modalImagem);
                    };
                
                    imagemContainer.appendChild(imagemElement);
                    div.appendChild(imagemContainer);
                }
            
                if (mensagem.video) {
                const videoContainer = document.createElement('div');
                videoContainer.style.maxWidth = '250px';
                videoContainer.style.margin = '5px 0';
                videoContainer.style.position = 'relative';
            
                const videoElement = document.createElement('video');
                videoElement.src = mensagem.video;
                videoElement.style.maxWidth = '100%';
                videoElement.style.borderRadius = '10px';
                videoElement.controls = true;
                videoElement.preload = 'metadata';
            
                videoElement.onerror = (e) => {
                    console.error('Erro ao carregar vídeo:', e);
                    console.error('URL do vídeo:', mensagem.video);
                    videoContainer.innerHTML = `
                    <div style="color:red; text-align:center;">
                        Erro ao carregar vídeo
                        <br>
                        <small>${mensagem.video}</small>
                    </div>
                    `;
                };
            
                videoContainer.appendChild(videoElement);
                div.appendChild(videoContainer);
                }
            
                if (mensagem.audio && mensagem.audio.url) {
                    const audioContainer = document.createElement('div');
                    audioContainer.style.display = 'flex';
                    audioContainer.style.alignItems = 'center';
                    audioContainer.style.backgroundColor = '#1b5c2438';
                    audioContainer.style.borderRadius = '10px';
                    audioContainer.style.padding = '8px';
                    audioContainer.style.marginTop = '5px';
                
                    const audioPlayer = document.createElement('div');
                    audioPlayer.style.display = 'flex';
                    audioPlayer.style.alignItems = 'center';
                    audioPlayer.style.width = '40vh';
                    audioPlayer.style.backgroundColor = '#fff';
                    audioPlayer.style.borderRadius = '10px';
                    audioPlayer.style.padding = '5px';
                
                    const progressBarContainer = document.createElement('div');
                    progressBarContainer.style.flexGrow = '1';
                    progressBarContainer.style.height = '4px';
                    progressBarContainer.style.backgroundColor = '#e0e0e0';
                    progressBarContainer.style.borderRadius = '2px';
                    progressBarContainer.style.marginRight = '10px';
                    progressBarContainer.style.cursor = 'pointer';
                
                    const progressBar = document.createElement('div');
                    progressBar.style.height = '100%';
                    progressBar.style.width = '0%';
                    progressBar.style.backgroundColor = '#248232';
                    progressBarContainer.appendChild(progressBar);
                
                    const playButton = document.createElement('button');
                    playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
                    playButton.style.backgroundColor = 'transparent';
                    playButton.style.border = 'none';
                    playButton.style.fontSize = '20px';
                    playButton.style.color = 'green';
                    playButton.style.cursor = 'pointer';
                
                    const volumeControl = document.createElement('input');
                    volumeControl.type = 'range';
                    volumeControl.value = 100;
                    volumeControl.min = 0;
                    volumeControl.max = 100;
                    volumeControl.style.width = '60px';
                    volumeControl.style.marginLeft = '10px';
                
                    const audioElement = new Audio(mensagem.audio.url);
                    audioElement.preload = 'auto';
                
                    audioElement.ontimeupdate = () => {
                        const progress = (audioElement.currentTime / audioElement.duration) * 100;
                        progressBar.style.width = `${progress}%`;
                    };
                
                    audioElement.onended = () => {
                        playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
                    };
                
                    progressBarContainer.addEventListener('click', (e) => {
                        const rect = progressBarContainer.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const newTime = (clickX / rect.width) * audioElement.duration;
                        audioElement.currentTime = newTime;
                    });
                
                    playButton.onclick = () => {
                        if (audioElement.paused) {
                        audioElement.play();
                        playButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
                        } else {
                        audioElement.pause();
                        playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
                        }
                    };
                
                    volumeControl.oninput = (e) => {
                        audioElement.volume = e.target.value / 100;
                    };
                
                    audioPlayer.appendChild(playButton);
                    audioPlayer.appendChild(progressBarContainer);
                    audioPlayer.appendChild(volumeControl);
                    audioContainer.appendChild(audioPlayer);
                
                    const duracao = mensagem.audio.duracao || 0;
                    const minutos = Math.floor(duracao / 60);
                    const segundos = duracao % 60;
                    const duracaoFormatada = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
                
                    const infoContainer = document.createElement('div');
                    infoContainer.style.marginLeft = '10px';
                    infoContainer.style.fontSize = '12px';
                    infoContainer.style.color = 'white';
                    infoContainer.textContent = `${duracaoFormatada}`;
                
                    audioContainer.appendChild(infoContainer);
                    div.appendChild(audioContainer);
                }
            
                if (mensagem.arquivo) {
                    const arquivoContainer = document.createElement('div');
                    arquivoContainer.style.display = 'flex';
                    arquivoContainer.style.alignItems = 'center';
                    arquivoContainer.style.backgroundColor = '#1b5c2438';
                    arquivoContainer.style.borderRadius = '10px';
                    arquivoContainer.style.padding = '8px';
                    arquivoContainer.style.marginTop = '5px';
                    arquivoContainer.style.cursor = 'pointer';
                
                    const iconeArquivo = document.createElement('div');
                    iconeArquivo.style.marginRight = '10px';
                    iconeArquivo.style.fontSize = '24px';
                
                    switch(mensagem.arquivo.tipo) {
                        case 'application/pdf':
                        iconeArquivo.innerHTML = '<i class="fa-solid fa-file-pdf"></i>';
                        break;
                        case 'application/msword':
                        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                        iconeArquivo.innerHTML = '<i class="fa-solid fa-file-word"></i>';
                        break;
                        case 'application/vnd.ms-excel':
                        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                        iconeArquivo.innerHTML = '<i class="fa-solid fa-chart-simple"></i>';
                        break;
                        case 'text/plain':
                        iconeArquivo.innerHTML = '<i class="fa-solid fa-file-lines"></i>';
                        break;
                        case 'application/zip':
                        iconeArquivo.innerHTML = '<i class="fa-solid fa-file-zipper"></i>';
                        break;
                        case 'application/x-rar-compressed':
                        iconeArquivo.innerHTML = '<i class="fa-solid fa-file-zipper"></i>';
                        break;
                        default:
                        iconeArquivo.innerHTML = '<i class="fa-solid fa-file"></i>';
                    }
                
                    const detalhesArquivo = document.createElement('div');
                    detalhesArquivo.innerHTML = `
                        <strong>${mensagem.arquivo.nome}</strong>
                        <div style="font-size: 12px; color: white;">
                        ${formatFileSize(mensagem.arquivo.tamanho || 0)}
                        </div>
                    `;
                
                    const downloadBotao = document.createElement('a');
                    downloadBotao.href = mensagem.arquivo.url;
                    downloadBotao.target = '_blank';
                    downloadBotao.download = mensagem.arquivo.nome;
                    downloadBotao.style.marginLeft = 'auto';
                    downloadBotao.style.color = 'white';
                    downloadBotao.style.textDecoration = 'none';
                    downloadBotao.innerHTML = '<i class="fa-solid fa-download"></i>&nbsp; Baixar';
                
                    arquivoContainer.appendChild(iconeArquivo);
                    arquivoContainer.appendChild(detalhesArquivo);
                    arquivoContainer.appendChild(downloadBotao);
                    div.appendChild(arquivoContainer);
                }
            
                if (mensagem.texto) {
                    const textoElement = document.createElement('div');
                    textoElement.textContent = mensagem.texto;
                    div.appendChild(textoElement);
                }
            
                const timeElement = document.createElement('div');
                timeElement.textContent = timeString;
                timeElement.style.textAlign = 'right';
                timeElement.style.fontSize = 'small';
                div.appendChild(timeElement);
            
                const optionsButton = document.createElement('div');
                optionsButton.innerHTML = '⋮';
                optionsButton.style.cursor = 'pointer';
                optionsButton.style.fontSize = '20px';
                optionsButton.style.padding = '5px 8px';
                optionsButton.style.marginLeft = '5px';
                optionsButton.style.alignSelf = 'flex-start';
                optionsButton.style.color = '#333';
                optionsButton.style.borderRadius = '50%';
                optionsButton.style.transition = 'background-color 0.2s';
                optionsButton.style.position = 'relative';
                optionsButton.title = 'Opções da mensagem';
            
                optionsButton.onmouseover = () => {
                    optionsButton.style.backgroundColor = '#f0f0f0';
                };
                optionsButton.onmouseout = () => {
                    optionsButton.style.backgroundColor = 'transparent';
                };
            
                const menuId = `menu-${messageId}`;
                const menuOpcoes = document.createElement('div');
                menuOpcoes.id = menuId;
                menuOpcoes.className = 'menu-opcoes';
                menuOpcoes.style.position = 'absolute';
                menuOpcoes.style.right = '0';
                menuOpcoes.style.top = '25px';
                menuOpcoes.style.backgroundColor = 'white';
                menuOpcoes.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                menuOpcoes.style.padding = '5px 0';
                menuOpcoes.style.borderRadius = '5px';
                menuOpcoes.style.zIndex = '1000';
                menuOpcoes.style.display = 'none';
                menuOpcoes.style.minWidth = '120px';
            
                excluirOpcao = document.createElement('div');
                excluirOpcao.textContent = 'Excluir mensagem';
                excluirOpcao.style.padding = '8px 15px';
                excluirOpcao.style.cursor = 'pointer';
                excluirOpcao.style.color = '#E53935';
                excluirOpcao.style.fontSize = '14px';
                excluirOpcao.style.transition = 'background-color 0.2s';
            
                excluirOpcao.onmouseover = () => {
                    excluirOpcao.style.backgroundColor = '#f5f5f5';
                };
                excluirOpcao.onmouseout = () => {
                    excluirOpcao.style.backgroundColor = 'transparent';
                };
            
                // excluirOpcao.onclick = (e) => {
                //     e.stopPropagation();
                //     if (mensagem.imagem || mensagem.video) {
                //         excluirImagem(messageId, mensagem.imagem || mensagem.video);
                //     } else {
                //         excluirMensagem(messageId);
                //     }
                // };
                excluirOpcao.onclick = (e) => {
                    e.stopPropagation();
                    if (mensagem.arquivo) {
                        excluirArquivo(messageId, mensagem.arquivo.url);
                    } else if (mensagem.imagem) {
                        excluirImagem(messageId, mensagem.imagem);
                    } else {
                        excluirMensagem(messageId);
                    }
                };
            
                optionsButton.onclick = (e) => {
                    e.stopPropagation();
                    toggleMenuOpcoes(menuId);
                };
            
                menuOpcoes.appendChild(excluirOpcao);
                optionsButton.appendChild(menuOpcoes);
            
                messageWrapper.appendChild(div);
                messageWrapper.appendChild(optionsButton);
                mensagemContainer.appendChild(messageWrapper);
            
                messageWrapper.addEventListener('dblclick', function(e) {
                    iniciarSelecao(this, messageId);
                    e.stopPropagation();
                });
            
                messageWrapper.addEventListener('click', function(e) {
                if (modoSelecao) {
                    toggleSelecaoMensagem(this, messageId);
                    e.stopPropagation();
                }
                });
            } else {
            
                div.style.backgroundColor = '#E8E8E8';
                div.style.color = '#333';
                div.style.marginRight = 'auto';
            
                get(dbRef(getDatabase(), 'usuarios/' + mensagem.remetente)).then(snap => {
                    const userAmigo = snap.val() || { nome: 'Usuário' };
                    img.src = userAmigo.fotoPerfil ? userAmigo.fotoPerfil : 'static/avatar.png';
                    img.alt = userAmigo.nome || 'Usuário';
            
                    const timeString = formatTime(date);
            
                    if (mensagem.imagem) {
                        const imagemElement = document.createElement('img');
                        imagemElement.src = mensagem.imagem;
                        imagemElement.style.maxWidth = '100%';
                        imagemElement.style.borderRadius = '10px';
                        imagemElement.style.marginBottom = '8px';
                        imagemElement.style.cursor = 'pointer';
                
                        imagemElement.onclick = () => {
                            const modalImagem = document.createElement('div');
                            modalImagem.style.position = 'fixed';
                            modalImagem.style.top = '0';
                            modalImagem.style.left = '0';
                            modalImagem.style.width = '100%';
                            modalImagem.style.height = '100%';
                            modalImagem.style.backgroundColor = 'rgba(0,0,0,0.8)';
                            modalImagem.style.display = 'flex';
                            modalImagem.style.justifyContent = 'center';
                            modalImagem.style.alignItems = 'center';
                            modalImagem.style.zIndex = '1000';
                
                            const imagemModal = document.createElement('img');
                            imagemModal.src = mensagem.imagem;
                            imagemModal.style.maxWidth = '90%';
                            imagemModal.style.maxHeight = '90%';
                            imagemModal.style.objectFit = 'contain';
                
                            modalImagem.onclick = () => document.body.removeChild(modalImagem);
                            modalImagem.appendChild(imagemModal);
                            document.body.appendChild(modalImagem);
                        };
                
                        div.appendChild(imagemElement);
                    }
            
                    if (mensagem.video) {
                        const videoContainer = document.createElement('div');
                        videoContainer.style.maxWidth = '250px';
                        videoContainer.style.margin = '5px 0';
                        videoContainer.style.position = 'relative';
                
                        const videoElement = document.createElement('video');
                        videoElement.src = mensagem.video;
                        videoElement.style.maxWidth = '100%';
                        videoElement.style.borderRadius = '10px';
                        videoElement.controls = true;
                        videoElement.preload = 'metadata';
                
                        videoElement.onerror = (e) => {
                            console.error('Erro ao carregar vídeo:', e);
                            console.error('URL do vídeo:', mensagem.video);
                            videoContainer.innerHTML = `
                            <div style="color:red; text-align:center;">
                                Erro ao carregar vídeo
                                <br>
                                <small>${mensagem.video}</small>
                            </div>
                            `;
                        };
                
                        videoContainer.appendChild(videoElement);
                        div.appendChild(videoContainer);
                    }
            
                    if (mensagem.texto) {
                        const textoElement = document.createElement('div');
                        textoElement.textContent = mensagem.texto;
                        div.appendChild(textoElement);
                    }
            
                    const timeElement = document.createElement('div');
                    timeElement.textContent = timeString;
                    timeElement.style.textAlign = 'right';
                    timeElement.style.fontSize = 'small';
                    div.appendChild(timeElement);
                })
                .catch(error => {
                    console.error('Erro ao buscar informações do remetente:', error);
                    img.src = 'static/avatar.png';
                    img.alt = 'Usuário';
                });
            
                mensagemContainer.appendChild(img);
                mensagemContainer.appendChild(div);
            }
            
            chatMessagesContainer.appendChild(mensagemContainer);
        });
        
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
}
    
function iniciarSelecao(elemento, messageId) {
    if (!modoSelecao) {
        modoSelecao = true;
        mensagensSelecionadas = [];
        toggleSelecaoMensagem(elemento, messageId);
        
        const barraOpcoes = document.getElementById('barra-opcoes-selecao');
        if (barraOpcoes) {
            barraOpcoes.style.display = 'flex';
        }
    }
}
    
function toggleSelecaoMensagem(elemento, messageId) {
    if (!modoSelecao) return;

    if (!elemento.classList.contains('mensagem-usuario')) return;

    const index = mensagensSelecionadas.indexOf(messageId);

    if (index === -1) {
    
        mensagensSelecionadas.push(messageId);
        elemento.style.opacity = '0.7';
        elemento.querySelector('.message-bubble').style.borderWidth = '2px';
        elemento.querySelector('.message-bubble').style.borderStyle = 'solid';
        elemento.querySelector('.message-bubble').style.borderColor = 'yellow';
    } else {
    
        mensagensSelecionadas.splice(index, 1);
        elemento.style.opacity = '1';
        elemento.querySelector('.message-bubble').style.border = 'none';
        
        if (mensagensSelecionadas.length === 0) {
            cancelarSelecao();
        }
    }
    
        const contador = document.getElementById('contador-selecionadas');
        if (contador) {
            contador.textContent = `${mensagensSelecionadas.length} selecionada${mensagensSelecionadas.length !== 1 ? 's' : ''}`;
        }
    }
    
function cancelarSelecao() {
    modoSelecao = false;
    
    document.querySelectorAll('.mensagem-usuario').forEach(elem => {
        elem.style.opacity = '1';
        elem.querySelector('.message-bubble').style.border = 'none';
    });
    
    const barraOpcoes = document.getElementById('barra-opcoes-selecao');
    if (barraOpcoes) {
        barraOpcoes.style.display = 'none';
    }
}
    
  function excluirMensagensSelecionadas() {
      if (mensagensSelecionadas.length === 0) return;
    
      if (confirm(`Tem certeza que deseja excluir ${mensagensSelecionadas.length} mensagem(ns)?`)) {
    
    mensagensSelecionadas.forEach(messageId => {
      remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens/${messageId}`)).catch(error => {
          console.error('Erro ao excluir mensagem:', error);
        });
    });
    
    cancelarSelecao();
    }
}
    
    document.addEventListener('click', function(e) {
        if (modoSelecao && !e.target.closest('.mensagem-usuario')) {
            cancelarSelecao();
        }
    });
    
    function formatFileSize(bytes) {
      if (!Number.isFinite(bytes) || bytes < 0) return 'Tamanho inválido';
      if (bytes === 0) return '0 Bytes';
    
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
    
      return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
    
    function toggleMenuOpcoes(menuId) {
      const menu = document.getElementById(menuId);
      if (!menu) return;
    
      document.querySelectorAll('.menu-opcoes').forEach(m => {
    if (m.id !== menuId) {
      m.style.display = 'none';
    }
      });
    
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    
      function closeMenuOnClickOutside(e) {
    const clickedMenu = e.target.closest('.menu-opcoes');
    const clickedButton = e.target.closest('div[onclick*="toggleMenuOpcoes"]');
    
    if ((!clickedMenu || clickedMenu.id !== menuId) && 
        (!clickedButton || !clickedButton.contains(document.getElementById(menuId)))) {
      menu.style.display = 'none';
      document.removeEventListener('click', closeMenuOnClickOutside);
    }
      }
    
      if (menu.style.display === 'block') {
    
    setTimeout(() => {
      document.addEventListener('click', closeMenuOnClickOutside);
    }, 10);
      } else {
    document.removeEventListener('click', closeMenuOnClickOutside);
      }
    }
    
    function formatTimestamp(date) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      let hours = date.getHours().toString().padStart(2, '0');
      let minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    
    function formatTime(date) {
      let hours = date.getHours().toString().padStart(2, '0');
      let minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    document.addEventListener('DOMContentLoaded', function() {
      const messageInput = document.getElementById('messageInput');
      if (messageInput) {
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        enviarMensagem();
      }
    });
      }
    });
    
    function getQueryParam(param) {
      const params = new URLSearchParams(window.location.search);
      return params.get(param);
    }

});