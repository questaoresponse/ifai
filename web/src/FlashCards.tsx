import { useEffect, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./FlashCards.scss";
import { useGlobal } from "./Global";
import Alert from "./Alert";

const GEMINI_API_KEY = "AIzaSyA8ABX5SrNQ1x14aMuUb0xJBeERPVzQtuE";

interface FlashcardInterface {
  id: string;
  front: string;
  back: string;
}

interface DeckInterface {
  id: string;
  name: string;
  description: string;
  flashcards: FlashcardInterface[];
}

interface flashcardAppInterface{
    [ key: string ]: any
}

function FlashCards(){
    const { usuarioLogado } = useGlobal();

    const showPopup = useRef<any>(null);

    const [ hasDecks, setHasDecks ] = useState(true);

    const [ decks, setDecks ] = useState<DeckInterface[]>([]);

    const [ currentDeck, setCurrentDeck ] = useState<string>("");

    const [ currentCardIndex, setCurrentCardIndex ] = useState<number>(0);

    const [ page, setPage ] = useState("decks");

    const [ flashCardMenu, setFlashCardMenu ] = useState(false);

    const [ showBackCard, setShowBackCard ] = useState(false);

    const [ progress, setProgress ] = useState("0");

    const [ awaitingGeneration, setAwaitingGeneration ] = useState(false);

    const refs = {
        ask: useRef<HTMLInputElement>(null)
    }

    const flashcardApp: flashcardAppInterface = useRef({

        init: function () {
          this.loadDecks();
        },

        loadDecks: function () {
          const savedDecks = localStorage.getItem("flashcardDecks");
          if (savedDecks) {
            const newDecks = JSON.parse(savedDecks);
            setDecks(newDecks);
            this.renderDecks(newDecks);
          }
        },

        saveDecks: function (decks: DeckInterface[]) {
          localStorage.setItem("flashcardDecks", JSON.stringify(decks));
        },

        toggleDeckForm: function (show: any) {
          const form = document.getElementById("deckForm")!;
          form.classList.toggle("hidden", !show);
        },

        toggleFlashcardForm: function (show: any) {
          const form = document.getElementById("flashcardForm")!;
          form.classList.toggle("hidden", !show);
        },

        resetDeckForm: function () {
            (document.getElementById("deckName") as HTMLInputElement)!.value = "";
            (document.getElementById("deckDescription") as HTMLInputElement)!.value = "";
        },

        resetFlashcardForm: function () {
            (document.getElementById("cardFront") as HTMLInputElement)!.value = "";
            (document.getElementById("cardBack") as HTMLInputElement)!.value = "";
        },

        saveNewDeck: function () {
          const name = (document.getElementById("deckName") as HTMLInputElement)!.value.trim();
          const description = (document
            .getElementById("deckDescription") as HTMLInputElement)!
            .value.trim();

          if (!name) {
            showPopup.current("Por favor, insira um nome para o deck.");
            return;
          }

          const newDeck = {
            id: Date.now().toString(),
            name: name,
            description: description,
            flashcards: [],
          };
          const newDecks = [...decks, newDeck];
          setDecks(newDecks);
          this.saveDecks(newDecks);
          this.renderDecks(newDecks);
          this.toggleDeckForm(false);
          this.resetDeckForm();
        },

        saveNewFlashcard: function () {
          const front = (document.getElementById("cardFront") as HTMLInputElement)!.value.trim();
          const back = (document.getElementById("cardBack") as HTMLInputElement)!.value.trim();

          if (!front || !back) {
            showPopup.current("Por favor, preencha ambos os lados do flashcard.");
            return;
          }

          const deck = decks.find((d) => d.id === currentDeck);
          if (deck) {
                deck.flashcards.push({
                    id: Date.now().toString(),
                    front: front,
                    back: back,
                });

                const decksValue = decks.map(deckValue=>deckValue.id === currentDeck ? deck : deckValue);

                setDecks(decksValue);

                this.saveDecks(decksValue);
                this.renderFlashcards(deck.id);
                this.toggleFlashcardForm(false);
                this.resetFlashcardForm();
          }
        },

        deleteDeck: function (deckId: any) {
            const newDecks = decks.filter((deck: any) => deck.id !== deckId);
            console.log(newDecks.length,decks.length);
            setDecks(newDecks);
            this.saveDecks(newDecks);
            this.renderDecks(newDecks);
        },

        deleteFlashcard: function (cardId: any) {
          const deck = decks.find((d) => d.id === currentDeck);
          if (deck) {
            deck.flashcards = deck.flashcards.filter(
              (card) => card.id !== cardId
            );
            const newDecks = decks.map(deckValue => deckValue.id == currentDeck ? deck : deckValue);
            this.saveDecks(newDecks);
            this.renderFlashcards(deck.id);
          }
        },

        renderDecks: function (decks: DeckInterface[]) {
            setHasDecks(decks.length > 0);
        },

        showDeck: function (deckId: any) {
            const deck = decks.find((d) => d.id === deckId);
            if (deck) {
                setCurrentDeck(deckId);
                this.renderFlashcards(deckId);
                setPage("flashcards");
            }
        },

        renderFlashcards: function (deckId: string) {
            const deck = decks.find((d) => d.id === deckId);

            if (!deck) return;

            const list = deck.flashcards;
            for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [list[i], list[j]] = [list[j], list[i]]; // troca os elementos
            }
            
            deck.flashcards = list;

            setDecks(decks=>decks.map(deckValue=>deckValue.id == deck.id ? deck : deckValue));
        },

        startStudyMode: function () {
            const deck = decks.find((d) => d.id === currentDeck);
            if (!deck || deck.flashcards.length === 0) {
                showPopup.current("Este deck não possui flashcards para estudar.");
                return;
            }

            const currentCardIndex = 0;
            setCurrentCardIndex(currentCardIndex);

            this.updateStudyCard(currentCardIndex);
            this.updateProgress(currentCardIndex);
            setPage("study");
        },

        updateStudyCard: function (currentCardIndex: number) {
            const deck = decks.find((d) => d.id === currentDeck);
            if (!deck || !deck.flashcards[currentCardIndex]) return;

            setShowBackCard(false);
        },

        updateProgress: function (currentCardIndex: number) {
            const deck = decks.find((d) => d.id === currentDeck);
            if (!deck) return;

            const progress = (currentCardIndex / deck.flashcards.length) * 100;
            setProgress(`${progress}%`);
        },

        showNextCard: function (currentCardIndex: number) {
            const deck = decks.find((d) => d.id === currentDeck);
            if (!deck) return;

            if (currentCardIndex < deck.flashcards.length - 1) {
                const currentCardIndexValue = currentCardIndex + 1;

                setCurrentCardIndex(currentCardIndexValue);

                this.updateStudyCard(currentCardIndexValue);
                this.updateProgress(currentCardIndexValue);
            } else {
                setPage("flashcards");
            }
        },

        showPreviousCard: function () {
          if (currentCardIndex > 0) {
            const currentCardIndexValue = currentCardIndex - 1;
            this.updateStudyCard(currentCardIndexValue);
            this.updateProgress(currentCardIndexValue);
          }
        },

        toggleStudyCard: function () {
            setShowBackCard(true);
        },
      });

    const generateFlashCard = async () => {
        setFlashCardMenu(false);

        const name = refs.ask.current!.value;

        // ATENÇÃO: NUNCA exponha sua API key diretamente no código do navegador em produção!
        // Para Node.js, use variáveis de ambiente (process.env.GEMINI_API_KEY).
        // Para o navegador, use um backend como proxy ou funções serverless.

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

        try {
            // Para texto, use gemini-pro
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

            const prompt = `Gere 3 flashcards sobre o assunto: ${name}. OBS: Sua respoosta dese seguir o seguinte formato: "{Pergunta}"//"{Resposta}"`;

            setAwaitingGeneration(true);
            const result = await model.generateContent(prompt);
            setAwaitingGeneration(false);
            const response = result.response;
            var text = response.text();
            text = "\"" + text.split("\"").splice(1).join("\"");
            const regex = /"([^"]+)"\/\/\s*"([^"]+)"/g;

            const newFlashCards: { front: string, back: string, id: string }[] = [...text.matchAll(regex)].map(match => ({
                front: match[1],
                back: match[2],
                id: Date.now().toString()
            }));

            const newDeck = decks.map(deck => deck.id == currentDeck ? {...deck, flashcards: [...deck.flashcards, ...newFlashCards]} : deck);
            flashcardApp.current.saveDecks(newDeck);
            setDecks(newDeck)
        } catch (error) {
            console.error("Erro ao gerar conteúdo:", error);
        }
    }

    useEffect(() => {
        if (usuarioLogado) {
            flashcardApp.current.init();
        }
    }, [usuarioLogado]);
    return <>
        <div id="flash" className="container page">
            <main>
                { page == "decks" ?
                <div id="decksView">
                <div className="card">
                    <h2>Meus decks</h2>
                    <button id="createDeckBtn" className="btn" onClick={()=>flashcardApp.current.toggleDeckForm(true)}>
                    <i className="fas fa-plus"></i> Criar novo deck
                    </button>

                    <div id="deckForm" className="hidden">
                    <div className="flex-row">
                        <div>
                        <input
                            type="text"
                            id="deckName"
                            placeholder="Nome do deck"
                            required
                        />
                        <textarea
                            id="deckDescription"
                            placeholder="Descrição (opcional)"
                            rows={3}
                        ></textarea>
                        </div>
                    </div>
                    <div>
                        <button id="saveDeckBtn" className="btn btn-success" onClick={()=>flashcardApp.current.saveNewDeck()}>Criar</button>
                        <button id="cancelDeckBtn" className="btn btn-outline" onClick={()=>{flashcardApp.current.toggleDeckForm(false);flashcardApp.current.resetDeckForm();}}>
                        Cancelar
                        </button>
                    </div>
                    </div>

                    <div id="decksList" className="decks-container">
                        { hasDecks ? decks.map((deck, index: number)=>{
                            return <div className="deck" onClick={()=>flashcardApp.current.showDeck(deck.id)} key={index}>
                                <div className="deck-actions">
                                <button onClick={()=>flashcardApp.current.deleteDeck(deck.id)}>
                                    <i className="fas fa-trash"></i>
                                </button>
                                </div>
                                <h3>{deck.name}</h3>
                                <p>{deck.description || "Sem descrição"}</p>
                                <p><strong>{deck.flashcards.length}</strong> flashcards</p>
                            </div>
                        }) : <div className="empty-state">
                            <i className="fas fa-inbox"></i>
                            <h3>Nenhum deck encontrado</h3>
                            <p>Crie seu primeiro deck para começar a adicionar flashcards</p>
                            <button className="btn" onClick={()=>flashcardApp.current.toggleDeckForm(true)}>Criar deck</button>
                        </div> }

                    </div>
                </div>
                </div> : page == "flashcards" ?
                <div id="flashcardsView">
                <div className="card">
                    <h2 id="currentDeckName">{decks.filter(deck=>deck.id == currentDeck)[0].name}</h2>
                    <div id="flash-btns">
                        <button id="backToDecksBtn" className="btn btn-outline" onClick={()=>setPage("decks")}>
                            <i className="fas fa-arrow-left"></i> Voltar para Decks
                        </button>
                        <button id="addFlashcardBtn" className="btn" onClick={()=>flashcardApp.current.toggleFlashcardForm(true)}>
                            <i className="fas fa-plus"></i> Adicionar flashcard
                        </button>
                        <button id="studyDeckBtn" className="btn btn-success" onClick={()=>flashcardApp.current.startStudyMode()}>
                            <i className="fas fa-graduation-cap"></i> Estudar deck
                        </button>
                        <button id="generateFlashCard" onClick={()=>setFlashCardMenu(true)}>{ awaitingGeneration ? "Gerando..." : "Gerar flashcards" }</button>
                    </div>
                    <div id="flashcardForm">
                    <div className="flex-row">
                        <div>
                        <h3>Frente do card</h3>
                        <textarea
                            id="cardFront"
                            placeholder="Pergunta"
                            rows={3}
                            required
                        ></textarea>
                        </div>
                        <div>
                        <h3>Verso do card</h3>
                        <textarea
                            id="cardBack"
                            placeholder="Resposta"
                            rows={3}
                            required
                        ></textarea>
                        </div>
                    </div>
                    <div>
                        <button id="saveFlashcardBtn" className="btn btn-success" onClick={()=>flashcardApp.current.saveNewFlashcard()}>
                            Salvar flashcard
                        </button>
                        <button id="cancelFlashcardBtn" className="btn btn-outline" onClick={()=>{flashcardApp.current.toggleFlashcardForm(false);flashcardApp.current.resetFlashcardForm();}}>
                            Cancelar
                        </button>
                    </div>
                    </div>

                    <div id="flashcardsList" className="flashcards-container">{currentDeck == "" ?    
                        <div className="empty-state">
                            <i className="fas fa-sticky-note"></i>
                            <h3>Nenhum flashcard neste deck</h3>
                            <p>Adicione seu primeiro flashcard para começar a estudar</p>
                            <button className="btn" onClick={()=>flashcardApp.current.toggleFlashcardForm(true)}>Adicionar flashcard</button>
                        </div>
                    : decks.filter(deck=>deck.id == currentDeck)[0].flashcards.map((card, index: number)=>{
                        return <div className="flashcard" onClick={(e: any)=>!e.target.closest(".card-actions") && e.target.classList.toggle("show-back")} key={index}>
                            <div className="flashcard-front">
                                <h3>{card.front}</h3>
                                </div>
                                <div className="flashcard-back">
                                <h3>{card.back}</h3>
                                </div>
                                <div className="card-actions">
                                <button className="btn btn-danger" onClick={()=>flashcardApp.current.deleteFlashcard(card.id)}>
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    })}</div>
                </div>
                </div>
                :
                <div id="studyView">
                <div className="card study-mode">
                    <h2>Estudando: <span id="studyDeckName">{decks.filter(deck => deck.id == currentDeck)[0].name}</span></h2>
                    <div className="progress-bar">
                    <div className="progress" id="studyProgress">{progress}</div>
                    </div>
                    <p> Progresso: <span id="currentCard">{currentCardIndex + 1}</span> de&nbsp;
                        <span id="totalCards">{decks.filter(deck => deck.id == currentDeck)[0].flashcards.length}</span>
                    </p>

                    <div className="study-card" id="studyCard" onClick={()=>flashcardApp.current.toggleStudyCard()}>
                        <div className="study-card-front" style={{ display: showBackCard ? "none" : "block" }}>
                            <h3 id="studyFront">{decks.filter(deck => deck.id == currentDeck)[0].flashcards[currentCardIndex].front}</h3>
                            <p>Clique no card para ver a resposta</p>
                        </div>
                        <div className="study-card-back" style={{ display: showBackCard ? "block" : "none" }}>
                            <h3 id="studyBack">{decks.filter(deck => deck.id == currentDeck)[0].flashcards[currentCardIndex].back}</h3>
                            <p>Clique no card para voltar</p>
                        </div>
                    </div>

                    <div className="study-controls">
                    <button id="prevCardBtn" className="btn btn-outline" onClick={()=>flashcardApp.current.showPreviousCard(currentCardIndex)}>
                        <i className="fas fa-arrow-left"></i> Anterior
                    </button>
                    <button id="nextCardBtn" className="btn" onClick={()=>flashcardApp.current.showNextCard(currentCardIndex)}>
                        Próximo <i className="fas fa-arrow-right"></i>
                    </button>
                    <button id="endStudyBtn" className="btn btn-danger" onClick={()=>setPage("flashcards")}>
                        <i className="fas fa-times"></i> Sair
                    </button>
                    </div>
                </div>
                </div> }
            </main>
            <div style={{ display: flashCardMenu ? "block" : "none" }} id="flashcard-menu">
                <input ref={refs.ask} placeholder="Digite o assunto..."></input>
                <div id="fm-btns">
                    <div id="fm-ask" onClick={generateFlashCard}>Perguntar</div>
                    <div id="fm-cancel" onClick={()=>setFlashCardMenu(false)}>Cancelar</div>
                </div>
            </div>
        </div>
        <Alert showPopup={showPopup}></Alert>
    </>
};

export default FlashCards;
