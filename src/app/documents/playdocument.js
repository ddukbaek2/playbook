//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Document, DocumentManager, Layout, Element, Storage, Popup } from "../../../libs/document-engine.js/import.js";
import { GeminiClient, PlaybookSession, Persona, Character } from "../../../libs/playbook-engine.js/import.js";
import { Secrets } from "../secrets.js";
import { Limits } from "../limits.js";


//==============================================================================
// 플레이 도큐먼트.
// - PlaybookSession 인스턴스 위에 UI 레이어만 얹는다.
// - 매 턴: 사용자 입력 -> session.act(input) -> 응답을 화면에 표시.
//==============================================================================
export class PlayDocument extends Document {
	//==============================================================================
	// 입력 모드 상수.
	// - 신규 사용자 입력은 항상 "mixed" 로 전송된다.
	// - 다른 값(dialogue/description/auto) 은 과거 저장 세션 복원 시의 컬러 분기 호환용으로만 남겨 둔다.
	//==============================================================================
	/** @type { string } */ static INPUT_MODE_DIALOGUE = "dialogue";
	/** @type { string } */ static INPUT_MODE_MIXED = "mixed";
	/** @type { string } */ static INPUT_MODE_DESCRIPTION = "description";

	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { object } */ #book;
	/** @private @type { PlaybookSession | null } */ #session;
	/** @private @type { boolean } */ #isCharacterListPanelOpen;

	/** @private @type { Element | null } */ #titleElement;
	/** @private @type { Element | null } */ #messageListElement;
	/** @private @type { Element | null } */ #userInputElement;
	/** @private @type { Element | null } */ #sendButtonElement;
	/** @private @type { Element | null } */ #autoAdvanceButtonElement;
	/** @private @type { Element | null } */ #clearButtonElement;
	/** @private @type { Element | null } */ #suggestButtonElement;
	/** @private @type { Element | null } */ #suggestionsContainerElement;
	/** @private @type { boolean } */ #isSuggestionsOpen;
	/** @private @type { Array<string> | null } */ #cachedSuggestions;
	/** @private @type { Element | null } */ #statusElement;
	/** @private @type { Element | null } */ #menuButtonElement;
	/** @private @type { Element | null } */ #characterListPanelElement;
	/** @private @type { Element | null } */ #characterListBackdropElement;
	/** @private @type { string } */ #slotId;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { object } options
	 * @param { object } options.book
	 * @param { string } options.slotId
	 */
	constructor(options) {
		super();
		this.setName("PlayDocument");
		this.#book = options.book;
		this.#slotId = options.slotId;
		this.#session = null;
		this.#isCharacterListPanelOpen = false;

		this.#titleElement = null;
		this.#messageListElement = null;
		this.#userInputElement = null;
		this.#sendButtonElement = null;
		this.#autoAdvanceButtonElement = null;
		this.#clearButtonElement = null;
		this.#suggestButtonElement = null;
		this.#suggestionsContainerElement = null;
		this.#isSuggestionsOpen = false;
		this.#cachedSuggestions = null;
		this.#statusElement = null;
		this.#menuButtonElement = null;
		this.#characterListPanelElement = null;
		this.#characterListBackdropElement = null;
	}

	//==============================================================================
	// 슬롯 ID 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getSlotId() {
		return this.#slotId;
	}

	//==============================================================================
	// 책 데이터 반환.
	//==============================================================================
	/**
	 * @returns { object }
	 */
	getBook() {
		return this.#book;
	}

	//==============================================================================
	// 세션 반환.
	//==============================================================================
	/**
	 * @returns { PlaybookSession | null }
	 */
	getSession() {
		return this.#session;
	}

	//==============================================================================
	// 메시지 목록 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getMessageListElement() {
		return this.#messageListElement;
	}

	//==============================================================================
	// 사용자 입력 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getUserInputElement() {
		return this.#userInputElement;
	}

	//==============================================================================
	// 전송 버튼 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getSendButtonElement() {
		return this.#sendButtonElement;
	}

	//==============================================================================
	// 자동진행 버튼 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getAutoAdvanceButtonElement() {
		return this.#autoAdvanceButtonElement;
	}

	//==============================================================================
	// 추천 버튼 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getSuggestButtonElement() {
		return this.#suggestButtonElement;
	}

	//==============================================================================
	// 추천 카드 컨테이너 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getSuggestionsContainerElement() {
		return this.#suggestionsContainerElement;
	}

	//==============================================================================
	// 상태 표시 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getStatusElement() {
		return this.#statusElement;
	}

	//==============================================================================
	// 비우기 버튼 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getClearButtonElement() {
		return this.#clearButtonElement;
	}

	//==============================================================================
	// 메뉴 버튼 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getMenuButtonElement() {
		return this.#menuButtonElement;
	}

	//==============================================================================
	// 등장인물 목록 패널 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getCharacterListPanelElement() {
		return this.#characterListPanelElement;
	}

	//==============================================================================
	// 스토리지 키 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getStorageKey() {
		const slotId = this.getSlotId();
		return `playbook.slot.${slotId}`;
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	/**
	 * @override
	 */
	onEnter() {
		const apiKey = Secrets.get("geminiApiKey", "");
		const modelName = Secrets.get("geminiModel", "gemini-2.5-pro");
		const geminiClient = new GeminiClient(apiKey, modelName);

		const book = this.getBook();
		const playerConfig = book.player ?? {};
		const playerName = playerConfig.name ?? "플레이어";

		const persona = new Persona({
			name: playerName
		});

		const playerMaxHealth = playerConfig.maxHealth ?? 130;
		const playerMaxStamina = playerConfig.maxStamina ?? 130;
		const playerMaxMana = playerConfig.maxMana ?? 125;
		const character = new Character({
			name: playerName,
			strength: playerConfig.strength ?? 13,
			dexterity: playerConfig.dexterity ?? 13,
			intelligence: playerConfig.intelligence ?? 10,
			constitution: playerConfig.constitution ?? 13,
			luck: playerConfig.luck ?? 15,
			maxHealth: playerMaxHealth,
			health: playerConfig.health ?? playerMaxHealth,
			maxStamina: playerMaxStamina,
			stamina: playerConfig.stamina ?? playerMaxStamina,
			maxMana: playerMaxMana,
			mana: playerConfig.mana ?? playerMaxMana
		});

		const storageKey = this.getStorageKey();
		const savedState = this.loadStoredSession(storageKey);

		const currentOpening = book.opening ?? "";
		const hasMessageHistory = (savedState.messageHistory !== null) && (savedState.messageHistory.length > 0);
		if (hasMessageHistory && currentOpening !== "") {
			const firstEntry = savedState.messageHistory[0];
			if (firstEntry.role === "user") {
				firstEntry.text = currentOpening;
			}
		}

		this.#session = new PlaybookSession({
			book: book,
			llmClient: geminiClient,
			persona: persona,
			character: character,
			messageHistory: savedState.messageHistory,
			currentEpisodeId: savedState.currentEpisodeId,
			visitedEpisodeIds: savedState.visitedEpisodeIds,
			currentEpisodeTurnCount: savedState.currentEpisodeTurnCount ?? undefined
		});

		this.registerBookNpcs();

		this.buildUI();
		this.refreshSendButton();
		const savedMessageHistory = savedState.messageHistory;
		const hasSavedHistory = (savedMessageHistory !== null) && (savedMessageHistory.length > 0);
		if (hasSavedHistory) {
			this.resumeScenario();
		}
		else {
			this.startScenario();
		}
	}

	//==============================================================================
	// 저장된 세션 상태 로드. (구 포맷=배열 / 신 포맷=object 모두 호환)
	//==============================================================================
	/**
	 * @param { string } storageKey
	 * @returns { { messageHistory: Array | null, currentEpisodeId: string | null, visitedEpisodeIds: Array<string> | null, currentEpisodeTurnCount: number | null } }
	 */
	loadStoredSession(storageKey) {
		const stored = Storage.getJson(storageKey, null);
		if (stored === null) {
			return {
				messageHistory: null,
				currentEpisodeId: null,
				visitedEpisodeIds: null,
				currentEpisodeTurnCount: null
			};
		}
		if (System.Array.isArray(stored)) {
			return {
				messageHistory: stored,
				currentEpisodeId: null,
				visitedEpisodeIds: null,
				currentEpisodeTurnCount: null
			};
		}
		return {
			messageHistory: stored.messageHistory ?? null,
			currentEpisodeId: stored.currentEpisodeId ?? null,
			visitedEpisodeIds: stored.visitedEpisodeIds ?? null,
			currentEpisodeTurnCount: stored.currentEpisodeTurnCount ?? null
		};
	}

	//==============================================================================
	// 진행 상태 저장. (메타데이터 + messageHistory + 에피소드 상태 통합)
	//==============================================================================
	saveSessionHistory() {
		const session = this.getSession();
		const sessionState = session.getSessionState();
		const book = this.getBook();
		const slotId = this.getSlotId();
		const storageKey = this.getStorageKey();
		const now = System.Date.now();
		const existing = Storage.getJson(storageKey, null);
		let createdAt = now;
		if (existing !== null && typeof existing === "object" && existing.createdAt) {
			createdAt = existing.createdAt;
		}
		const slotData = {
			slotId: slotId,
			bookId: book.id,
			bookTitle: book.title,
			createdAt: createdAt,
			lastPlayedAt: now,
			messageHistory: sessionState.messageHistory,
			currentEpisodeId: sessionState.currentEpisodeId,
			visitedEpisodeIds: sessionState.visitedEpisodeIds,
			currentEpisodeTurnCount: sessionState.currentEpisodeTurnCount
		};
		Storage.setJson(storageKey, slotData);
	}

	//==============================================================================
	// UI 구성.
	//==============================================================================
	buildUI() {
		const book = this.getBook();
		const bookTitle = book.title ?? "상황극";

		Layout.create("div")
			.style({
				position: "absolute",
				left: "0",
				top: "0",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column"
			})
			.children(
				Layout.create("div")
					.style({
						flex: "0 0 auto",
						position: "relative",
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						padding: "10px 16px",
						borderBottom: "1px solid #333333",
						backgroundColor: "#252526",
						gap: "12px"
					})
					.children(
						Layout.create("button")
							.text("← 목록")
							.style({
								padding: "6px 12px",
								fontSize: "13px",
								color: "#cccccc",
								backgroundColor: "#3c3c3c",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer"
							})
							.on("click", () => {
								this.handleBackClick();
							}),
						Layout.create("div")
							.text(bookTitle)
							.style({
								fontSize: "14px",
								fontWeight: "bold",
								color: "#ffffff"
							})
							.bind((element) => {
								this.#titleElement = element;
							}),
						Layout.create("div")
							.text("")
							.style({
								marginLeft: "auto",
								fontSize: "12px",
								color: "#888888"
							})
							.bind((element) => {
								this.#statusElement = element;
							}),
						Layout.create("button")
							.text("≡ 메뉴")
							.style({
								position: "relative",
								padding: "6px 12px",
								fontSize: "13px",
								color: "#cccccc",
								backgroundColor: "#3c3c3c",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
								zIndex: "11"
							})
							.on("click", () => {
								this.toggleCharacterListPanel();
							})
							.bind((element) => {
								this.#menuButtonElement = element;
							}),
						Layout.create("div")
							.style({
								position: "absolute",
								top: "100%",
								right: "16px",
								marginTop: "4px",
								width: "320px",
								maxHeight: "70vh",
								overflowY: "auto",
								padding: "12px",
								backgroundColor: "#252526",
								border: "1px solid #444444",
								borderRadius: "6px",
								boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
								display: "none",
								flexDirection: "column",
								gap: "10px",
								zIndex: "10"
							})
							.bind((element) => {
								this.#characterListPanelElement = element;
							})
					),
				Layout.create("div")
					.style({
						position: "absolute",
						left: "0",
						top: "0",
						width: "100%",
						height: "100%",
						backgroundColor: "rgba(0, 0, 0, 0.3)",
						display: "none",
						zIndex: "5"
					})
					.on("click", () => {
						this.toggleCharacterListPanel();
					})
					.bind((element) => {
						this.#characterListBackdropElement = element;
					}),
				Layout.create("div")
					.style({
						flex: "1 1 auto",
						overflowY: "auto",
						padding: "16px",
						display: "flex",
						flexDirection: "column",
						gap: "12px"
					})
					.bind((element) => {
						this.#messageListElement = element;
					}),
				Layout.create("div")
					.style({
						flex: "0 0 auto",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						padding: "12px 16px",
						borderTop: "1px solid #333333",
						backgroundColor: "#252526"
					})
					.children(
						Layout.create("div")
							.style({
								display: "none",
								flexDirection: "column",
								gap: "6px"
							})
							.bind((element) => {
								this.#suggestionsContainerElement = element;
							}),
						Layout.create("div")
							.style({
								display: "flex",
								flexDirection: "row",
								gap: "4px"
							})
							.children(
								Layout.create("button")
									.text("( )")
									.style({
										flex: "0 0 60px",
										height: "32px",
										padding: "0 10px",
										fontSize: "13px",
										color: "#cccccc",
										backgroundColor: "#3c3c3c",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.handleParenthesesClick();
									}),
								Layout.create("button")
									.text("지우기")
									.style({
										flex: "0 0 60px",
										height: "32px",
										padding: "0 10px",
										fontSize: "13px",
										color: "#cccccc",
										backgroundColor: "#3c3c3c",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.handleClearClick();
									})
									.bind((element) => {
										this.#clearButtonElement = element;
									}),
								Layout.create("button")
									.text("추천")
									.style({
										flex: "0 0 60px",
										height: "32px",
										marginLeft: "auto",
										padding: "0 10px",
										fontSize: "13px",
										fontWeight: "bold",
										color: "#ffffff",
										backgroundColor: "#4a6a3c",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.handleSuggestClick();
									})
									.bind((element) => {
										this.#suggestButtonElement = element;
									}),
								Layout.create("button")
									.text("자동진행")
									.style({
										flex: "0 0 80px",
										height: "32px",
										padding: "0 10px",
										fontSize: "13px",
										fontWeight: "bold",
										color: "#ffffff",
										backgroundColor: "#6a3a8c",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.handleAutoAdvanceClick();
									})
									.bind((element) => {
										this.#autoAdvanceButtonElement = element;
									})
							),
						Layout.create("div")
							.style({
								display: "flex",
								flexDirection: "row",
								alignItems: "stretch",
								gap: "8px"
							})
							.children(
								Layout.create("textarea")
									.attr("rows", "2")
									.style({
										flex: "1",
										minHeight: "44px",
										maxHeight: "120px",
										padding: "8px 12px",
										fontSize: "14px",
										lineHeight: "1.5",
										color: "#ffffff",
										backgroundColor: "#2c4c4c",
										border: "1px solid #555555",
										borderRadius: "4px",
										outline: "none",
										resize: "vertical",
										fontFamily: "inherit",
										boxSizing: "border-box"
									})
									.attr("placeholder", "대사 (괄호 안에 상황/설명) 형식으로 입력하세요")
									.on("keydown", (event) => {
										this.handleInputKeydown(event);
									})
									.on("input", () => {
										this.refreshSendButton();
									})
									.bind((element) => {
										this.#userInputElement = element;
									}),
								Layout.create("button")
									.text("진행")
									.style({
										minWidth: "80px",
										padding: "0 20px",
										fontSize: "14px",
										fontWeight: "bold",
										color: "#ffffff",
										backgroundColor: "#0e639c",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.handleSendClick();
									})
									.bind((element) => {
										this.#sendButtonElement = element;
									})
							)
					)
			)
			.build(this);
	}

	//==============================================================================
	// 시나리오 자동 시작.
	//==============================================================================
	startScenario() {
		const session = this.getSession();
		session.start();

		const currentEpisode = session.getCurrentEpisode();
		if (currentEpisode !== null) {
			this.appendEpisodeCard(currentEpisode);
		}
		const book = this.getBook();
		const opening = book.opening ?? "";
		if (opening !== "") {
			this.appendMessage("scene", opening);
		}
		this.saveSessionHistory();
		this.refreshTurnCountStatus();
	}

	//==============================================================================
	// 저장된 히스토리로부터 시나리오 복원.
	// - 히스토리의 첫 'user' 엔트리는 book.opening 으로 간주하여 'scene' UI 로 표시한다.
	// - 나머지 'user' / 'model' 엔트리는 각각의 역할 그대로 표시한다.
	//==============================================================================
	resumeScenario() {
		const session = this.getSession();
		const messageHistory = session.getMessageHistory();
		const book = this.getBook();
		const opening = book.opening ?? "";
		const historyLength = messageHistory.length;

		const visitedEpisodeIds = session.getVisitedEpisodeIds();
		let startingEpisode = null;
		const visitedIterator = visitedEpisodeIds.values();
		const firstVisited = visitedIterator.next();
		if (!firstVisited.done) {
			startingEpisode = session.getEpisode(firstVisited.value);
		}
		if (startingEpisode !== null) {
			this.appendEpisodeCard(startingEpisode);
		}

		for (let index = 0; index < historyLength; index++) {
			const entry = messageHistory[index];
			const role = entry.role;
			const text = entry.text;
			const mode = entry.mode;
			const isOpeningEntry = (index === 0) && (role === "user") && (opening !== "");
			if (isOpeningEntry) {
				this.appendMessage("scene", text);
			}
			else {
				this.appendMessage(role, text, mode);
			}
		}

		const currentEpisode = session.getCurrentEpisode();
		if (currentEpisode !== null && currentEpisode !== startingEpisode) {
			this.appendEpisodeCard(currentEpisode);
		}
		this.refreshTurnCountStatus();
	}

	//==============================================================================
	// 입력창 키 입력 처리. (Ctrl+Enter 전송)
	//==============================================================================
	/**
	 * @param { KeyboardEvent } event
	 */
	handleInputKeydown(event) {
		const isEnter = event.key === "Enter";
		const isCtrl = event.ctrlKey || event.metaKey;
		if (isEnter && isCtrl) {
			event.preventDefault();
			this.handleSendClick();
		}
	}

	//==============================================================================
	// 턴 수 제한 체크. (제한에 걸리면 팝업 띄우고 true 반환)
	//==============================================================================
	/**
	 * @returns { boolean } 제한에 걸렸으면 true.
	 */
	checkTurnLimitAndWarn() {
		if (!Limits.enabledPerRoomTurnLimit) {
			return false;
		}
		const turnCount = this.computeTurnCount();
		const maxTurnsPerRoom = Limits.maxTurnsPerRoom;
		if (turnCount < maxTurnsPerRoom) {
			return false;
		}
		Popup.alert(
			`이 방은 ${maxTurnsPerRoom}턴까지만 진행할 수 있습니다.\n현재 ${turnCount}턴 진행되었습니다.\n\n다른 흐름으로 시도하려면 새로하기에서 새 방을 만들어 보세요.`,
			{ title: "턴 수 제한" }
		);
		return true;
	}

	//==============================================================================
	// 전송 처리. (입력창 내용 → 혼합 모드로 전송)
	// - 입력창이 비어 있으면 아무 동작 없음 (자동진행은 별도 버튼).
	//==============================================================================
	async handleSendClick() {
		const session = this.getSession();
		if (session.isWaitingResponse()) {
			return;
		}
		const userInputElement = this.getUserInputElement();
		const inputValue = userInputElement.getValue().trim();
		if (inputValue === "") {
			return;
		}
		if (this.checkTurnLimitAndWarn()) {
			return;
		}
		const submittedText = inputValue;
		const submittedMode = PlayDocument.INPUT_MODE_MIXED;

		userInputElement.setValue("");
		this.refreshSendButton();
		this.appendMessage("user", submittedText, submittedMode);
		await this.requestAIResponse(submittedText, submittedMode);
	}

	//==============================================================================
	// 추천 버튼 처리. (토글)
	// - 카드가 열려 있으면 닫는다.
	// - 닫혀 있으면: 현재 턴의 캐시가 있으면 그대로 재사용, 없으면 LLM 으로 새로 받아 캐시한다.
	// - 캐시는 새 턴이 진행(act 완료) 될 때마다 초기화된다.
	// - suggestActions 는 세션 잠금을 사용하지 않으므로 사용자가 도중에 닫고 다시 눌러도
	//   새 호출이 막히지 않는다.
	//==============================================================================
	async handleSuggestClick() {
		if (this.#isSuggestionsOpen) {
			this.hideSuggestions();
			return;
		}
		const session = this.getSession();
		if (session === null) {
			return;
		}
		// act() (진행/자동진행 응답 대기) 중에는 추천 호출을 차단한다.
		if (session.isWaitingResponse()) {
			return;
		}

		// 캐시 히트: 추가 LLM 호출 없이 즉시 카드 노출.
		if (this.#cachedSuggestions !== null) {
			this.openSuggestionsContainer();
			this.renderSuggestionCards(this.#cachedSuggestions);
			return;
		}

		this.showSuggestionsLoading();
		try {
			const suggestions = await session.suggestActions(3);
			if (!this.#isSuggestionsOpen) {
				return;
			}
			if (suggestions.length === 0) {
				this.renderSuggestionsError("추천을 만들어내지 못했어요. 다시 시도해 보세요.");
				return;
			}
			this.#cachedSuggestions = suggestions;
			this.renderSuggestionCards(suggestions);
		}
		catch (error) {
			System.console.error("[Suggest] failed:", error);
			if (!this.#isSuggestionsOpen) {
				return;
			}
			const errorText = error && error.message ? error.message : System.String(error);
			this.renderSuggestionsError(`추천 실패: ${errorText}`);
		}
	}

	//==============================================================================
	// 추천 카드 컨테이너만 노출. (로딩 메시지 없이)
	//==============================================================================
	openSuggestionsContainer() {
		this.#isSuggestionsOpen = true;
		const suggestionsContainerElement = this.getSuggestionsContainerElement();
		if (suggestionsContainerElement === null) {
			return;
		}
		suggestionsContainerElement.removeChildren();
		const htmlElement = suggestionsContainerElement.getHtmlElement();
		htmlElement.style.display = "flex";
	}

	//==============================================================================
	// 추천 카드 영역 숨김.
	//==============================================================================
	hideSuggestions() {
		this.#isSuggestionsOpen = false;
		const suggestionsContainerElement = this.getSuggestionsContainerElement();
		if (suggestionsContainerElement === null) {
			return;
		}
		suggestionsContainerElement.removeChildren();
		const htmlElement = suggestionsContainerElement.getHtmlElement();
		htmlElement.style.display = "none";
	}

	//==============================================================================
	// 추천 카드 영역 노출 + 로딩 인디케이터 표시.
	//==============================================================================
	showSuggestionsLoading() {
		this.#isSuggestionsOpen = true;
		const suggestionsContainerElement = this.getSuggestionsContainerElement();
		if (suggestionsContainerElement === null) {
			return;
		}
		suggestionsContainerElement.removeChildren();
		const htmlElement = suggestionsContainerElement.getHtmlElement();
		htmlElement.style.display = "flex";

		Layout.create("div")
			.text("추천 생성 중... (수 초 걸릴 수 있어요)")
			.style({
				fontSize: "13px",
				color: "#888888",
				padding: "10px",
				textAlign: "center",
				fontStyle: "italic"
			})
			.build(suggestionsContainerElement);
	}

	//==============================================================================
	// 추천 카드 3장 렌더.
	//==============================================================================
	/**
	 * @param { Array<string> } suggestions
	 */
	renderSuggestionCards(suggestions) {
		const suggestionsContainerElement = this.getSuggestionsContainerElement();
		if (suggestionsContainerElement === null) {
			return;
		}
		suggestionsContainerElement.removeChildren();
		for (const suggestion of suggestions) {
			this.appendSuggestionCard(suggestion, suggestionsContainerElement);
		}
	}

	//==============================================================================
	// 단일 추천 카드 추가.
	// - hover 시 배경 변화, 클릭 시 handleSuggestionCardClick.
	//==============================================================================
	/**
	 * @param { string } suggestionText
	 * @param { Element } parentElement
	 */
	appendSuggestionCard(suggestionText, parentElement) {
		const baseBackgroundColor = "#3a4a3c";
		const hoverBackgroundColor = "#4a6a4c";
		Layout.create("div")
			.text(suggestionText)
			.style({
				padding: "10px 14px",
				backgroundColor: baseBackgroundColor,
				border: "1px solid #5a7a5c",
				borderRadius: "6px",
				fontSize: "13px",
				color: "#ffffff",
				lineHeight: "1.5",
				cursor: "pointer",
				transition: "background-color 0.12s",
				whiteSpace: "pre-wrap",
				wordBreak: "break-word"
			})
			.on("mouseenter", (event) => {
				event.currentTarget.style.backgroundColor = hoverBackgroundColor;
			})
			.on("mouseleave", (event) => {
				event.currentTarget.style.backgroundColor = baseBackgroundColor;
			})
			.on("click", () => {
				this.handleSuggestionCardClick(suggestionText);
			})
			.build(parentElement);
	}

	//==============================================================================
	// 추천 오류/안내 메시지 렌더.
	//==============================================================================
	/**
	 * @param { string } message
	 */
	renderSuggestionsError(message) {
		const suggestionsContainerElement = this.getSuggestionsContainerElement();
		if (suggestionsContainerElement === null) {
			return;
		}
		suggestionsContainerElement.removeChildren();
		Layout.create("div")
			.text(message)
			.style({
				fontSize: "13px",
				color: "#ff9988",
				padding: "10px",
				textAlign: "center"
			})
			.build(suggestionsContainerElement);
	}

	//==============================================================================
	// 추천 카드 클릭 처리.
	// - 카드를 닫고 입력창을 카드 내용으로 채운 뒤 즉시 진행한다.
	//==============================================================================
	/**
	 * @param { string } suggestionText
	 */
	async handleSuggestionCardClick(suggestionText) {
		this.hideSuggestions();
		const userInputElement = this.getUserInputElement();
		if (userInputElement === null) {
			return;
		}
		userInputElement.setValue(suggestionText);
		this.refreshSendButton();
		await this.handleSendClick();
	}

	//==============================================================================
	// 자동진행 처리.
	// - 사용자 입력과 무관하게 "(자동 진행)" 을 auto 모드로 송신하여 1턴 진행한다.
	// - 입력창 내용은 건드리지 않는다.
	//==============================================================================
	async handleAutoAdvanceClick() {
		const session = this.getSession();
		if (session.isWaitingResponse()) {
			return;
		}
		if (this.checkTurnLimitAndWarn()) {
			return;
		}
		const submittedText = "(자동 진행)";
		const submittedMode = "auto";
		this.appendMessage("user", submittedText, submittedMode);
		await this.requestAIResponse(submittedText, submittedMode);
	}

	//==============================================================================
	// 뒤로가기 처리. (방 목록 = 이어하기 도큐먼트로 복귀)
	//==============================================================================
	async handleBackClick() {
		const { RoomListDocument } = await import("./roomlistdocument.js");
		const roomListDocument = new RoomListDocument();
		DocumentManager.getInstance().replace(roomListDocument, { transition: "slide-right" });
	}

	//==============================================================================
	// AI 응답 요청.
	//==============================================================================
	/**
	 * @param { string } userInput
	 */
	async requestAIResponse(userInput, mode) {
		this.setSendButtonEnabled(false);
		this.setAutoAdvanceButtonEnabled(false);
		this.setSuggestButtonEnabled(false);
		this.setUserInputEnabled(false);

		const thinkingElement = this.appendSpinnerMessage();

		const session = this.getSession();
		try {
			const actOptions = (mode !== undefined && mode !== null) ? { mode: mode } : undefined;
			const result = await session.act(userInput, actOptions);
			const responseText = result.text;
			this.removeMessageElement(thinkingElement);
			this.appendMessage("model", responseText);
			if (result.transitioned) {
				const nextEpisodeId = result.nextEpisodeId;
				const nextEpisode = session.getEpisode(nextEpisodeId);
				if (nextEpisode !== null) {
					this.appendEpisodeCard(nextEpisode);
				}
				this.refreshCharacterListPanel();
			}
		}
		catch (error) {
			this.removeMessageElement(thinkingElement);
			const errorText = error && error.message ? error.message : System.String(error);
			this.appendMessage("system", `오류: ${errorText}`);
		}
		finally {
			this.setUserInputEnabled(true);
			this.setAutoAdvanceButtonEnabled(true);
			this.setSuggestButtonEnabled(true);
			this.saveSessionHistory();
			this.refreshTurnCountStatus();
			this.refreshSendButton();
			// 새 턴이 완료됐으므로 추천 캐시를 비워, 다음 추천 클릭 시 새로 생성한다.
			this.#cachedSuggestions = null;
		}
	}

	//==============================================================================
	// 메시지 박스 추가. (role: user | model | scene | system)
	// - 히스토리 관리는 PlaybookSession 이 담당하므로 본 메서드는 UI 표시만 수행한다.
	//==============================================================================
	/**
	 * @param { string } role
	 * @param { string } text
	 * @returns { Element }
	 */
	appendMessage(role, text, mode) {
		const messageListElement = this.getMessageListElement();

		let backgroundColor = "#2d2d30";
		if (role === "user") {
			if (mode === "auto") {
				backgroundColor = "#3a3a44";
			}
			else if (mode === PlayDocument.INPUT_MODE_DIALOGUE) {
				backgroundColor = "#1c4a6c";
			}
			else if (mode === PlayDocument.INPUT_MODE_MIXED) {
				backgroundColor = "#1e5c5c";
			}
			else if (mode === PlayDocument.INPUT_MODE_DESCRIPTION) {
				backgroundColor = "#6c2a44";
			}
			else {
				const isAutoAdvance = (text === "(자동 진행)");
				const isDialogue = text.startsWith("\"") && text.endsWith("\"") && text.length >= 2;
				if (isAutoAdvance) {
					backgroundColor = "#3a3a44";
				}
				else if (isDialogue) {
					backgroundColor = "#1c4a6c";
				}
				else {
					backgroundColor = "#6c2a44";
				}
			}
		}
		else if (role === "model") {
			backgroundColor = "#2a2a2c";
		}
		else if (role === "scene") {
			backgroundColor = "#3a3328";
		}
		else if (role === "system") {
			backgroundColor = "#33333a";
		}

		const messageElement = Layout.create("div")
			.style({
				display: "flex",
				flexDirection: "column",
				gap: "4px",
				padding: "10px 14px",
				backgroundColor: backgroundColor,
				borderRadius: "6px",
				color: "#ffffff",
				fontSize: "14px",
				lineHeight: "1.6",
				whiteSpace: "pre-wrap",
				wordBreak: "break-word"
			})
			.children(
				Layout.create("div")
					.text(text)
			)
			.build(messageListElement);

		this.scrollMessageListToBottom();
		return messageElement;
	}

	//==============================================================================
	// 응답 대기용 스피너 메시지 추가.
	// - 초당 1회전 회전 인디케이터를 담은 모델 톤의 박스를 추가하고 Element 를 반환한다.
	// - Web Animations API 로 회전. Element 제거 시 애니메이션도 함께 정리된다.
	//==============================================================================
	/**
	 * @returns { Element }
	 */
	appendSpinnerMessage() {
		const messageListElement = this.getMessageListElement();

		const messageElement = Layout.create("div")
			.style({
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: "10px",
				padding: "10px 14px",
				backgroundColor: "#2a2a2c",
				borderRadius: "6px",
				color: "#ffffff",
				fontSize: "14px",
				lineHeight: "1.6"
			})
			.children(
				Layout.create("div")
					.style({
						width: "16px",
						height: "16px",
						border: "2px solid #555555",
						borderTopColor: "#ffffff",
						borderRadius: "50%",
						boxSizing: "border-box"
					})
					.bind((spinnerElement) => {
						const spinnerHtmlElement = spinnerElement.getHtmlElement();
						const keyframes = [
							{ transform: "rotate(0deg)" },
							{ transform: "rotate(360deg)" }
						];
						const animationOptions = {
							duration: 1000,
							iterations: System.Infinity,
							easing: "linear"
						};
						spinnerHtmlElement.animate(keyframes, animationOptions);
					})
			)
			.build(messageListElement);

		this.scrollMessageListToBottom();
		return messageElement;
	}

	//==============================================================================
	// 메시지 Element 제거.
	//==============================================================================
	/**
	 * @param { Element } messageElement
	 */
	removeMessageElement(messageElement) {
		const messageListElement = this.getMessageListElement();
		messageListElement.removeChild(messageElement);
		messageElement.destroy();
	}

	//==============================================================================
	// 메시지 목록 맨 아래로 스크롤.
	//==============================================================================
	scrollMessageListToBottom() {
		const messageListElement = this.getMessageListElement();
		const htmlElement = messageListElement.getHtmlElement();
		htmlElement.scrollTop = htmlElement.scrollHeight;
	}

	//==============================================================================
	// 상태 텍스트 설정.
	//==============================================================================
	/**
	 * @param { string } text
	 */
	setStatusText(text) {
		const statusElement = this.getStatusElement();
		statusElement.setText(text);
	}

	//==============================================================================
	// 현재 턴 수 계산.
	// - messageHistory 의 model 응답 수가 곧 완료된 턴 수다.
	//==============================================================================
	/**
	 * @returns { number }
	 */
	computeTurnCount() {
		const session = this.getSession();
		if (session === null) {
			return 0;
		}
		const messageHistory = session.getMessageHistory();
		let turnCount = 0;
		for (const entry of messageHistory) {
			if (entry.role === "model") {
				turnCount = turnCount + 1;
			}
		}
		return turnCount;
	}

	//==============================================================================
	// 헤더 상태 영역에 현재 턴 수 갱신.
	//==============================================================================
	refreshTurnCountStatus() {
		const turnCount = this.computeTurnCount();
		this.setStatusText(`${turnCount}턴 진행`);
	}

	//==============================================================================
	// 전송 버튼 활성/비활성.
	//==============================================================================
	/**
	 * @param { boolean } enabled
	 */
	setSendButtonEnabled(enabled) {
		const sendButtonElement = this.getSendButtonElement();
		const htmlElement = sendButtonElement.getHtmlElement();
		htmlElement.disabled = !enabled;
		htmlElement.style.opacity = enabled ? "1" : "0.5";
		htmlElement.style.cursor = enabled ? "pointer" : "not-allowed";
	}

	//==============================================================================
	// 자동진행 버튼 활성/비활성.
	//==============================================================================
	/**
	 * @param { boolean } enabled
	 */
	setAutoAdvanceButtonEnabled(enabled) {
		const autoAdvanceButtonElement = this.getAutoAdvanceButtonElement();
		if (autoAdvanceButtonElement === null) {
			return;
		}
		const htmlElement = autoAdvanceButtonElement.getHtmlElement();
		htmlElement.disabled = !enabled;
		htmlElement.style.opacity = enabled ? "1" : "0.5";
		htmlElement.style.cursor = enabled ? "pointer" : "not-allowed";
	}

	//==============================================================================
	// 추천 버튼 활성/비활성.
	//==============================================================================
	/**
	 * @param { boolean } enabled
	 */
	setSuggestButtonEnabled(enabled) {
		const suggestButtonElement = this.getSuggestButtonElement();
		if (suggestButtonElement === null) {
			return;
		}
		const htmlElement = suggestButtonElement.getHtmlElement();
		htmlElement.disabled = !enabled;
		htmlElement.style.opacity = enabled ? "1" : "0.5";
		htmlElement.style.cursor = enabled ? "pointer" : "not-allowed";
	}

	//==============================================================================
	// 사용자 입력창 활성/비활성.
	//==============================================================================
	/**
	 * @param { boolean } enabled
	 */
	setUserInputEnabled(enabled) {
		const userInputElement = this.getUserInputElement();
		const htmlElement = userInputElement.getHtmlElement();
		htmlElement.disabled = !enabled;
		htmlElement.style.opacity = enabled ? "1" : "0.5";
		htmlElement.style.cursor = enabled ? "text" : "not-allowed";
	}

	//==============================================================================
	// 비우기 버튼 처리. (textarea 내용을 빈 문자열로 설정하고 포커스)
	//==============================================================================
	handleClearClick() {
		const userInputElement = this.getUserInputElement();
		userInputElement.setValue("");
		this.refreshSendButton();
		const userInputHtmlElement = userInputElement.getHtmlElement();
		userInputHtmlElement.focus();
	}

	//==============================================================================
	// 괄호 버튼 처리.
	// - 현재 커서 위치에 "()" 를 삽입(선택 범위가 있으면 감싸기) 하고 커서를 괄호 안쪽으로 옮긴다.
	//==============================================================================
	handleParenthesesClick() {
		const userInputElement = this.getUserInputElement();
		const userInputHtmlElement = userInputElement.getHtmlElement();
		const startPosition = userInputHtmlElement.selectionStart;
		const endPosition = userInputHtmlElement.selectionEnd;
		const currentValue = userInputHtmlElement.value;
		const beforeText = currentValue.substring(0, startPosition);
		const selectedText = currentValue.substring(startPosition, endPosition);
		const afterText = currentValue.substring(endPosition);
		const newValue = `${beforeText}(${selectedText})${afterText}`;
		userInputHtmlElement.value = newValue;
		const cursorInsidePosition = startPosition + 1 + selectedText.length;
		userInputHtmlElement.focus();
		userInputHtmlElement.setSelectionRange(cursorInsidePosition, cursorInsidePosition);
		this.refreshSendButton();
	}

	//==============================================================================
	// 진행 버튼 활성/비활성 갱신.
	// - textarea 가 비어 있으면 진행 비활성, 내용이 있으면 활성.
	// - 자동진행 버튼은 입력값과 무관하게 항상 활성 (AI 응답 대기 중에만 별도로 비활성화됨).
	//==============================================================================
	refreshSendButton() {
		const sendButtonElement = this.getSendButtonElement();
		const userInputElement = this.getUserInputElement();
		if (sendButtonElement === null) {
			return;
		}
		if (userInputElement === null) {
			return;
		}
		const inputValue = userInputElement.getValue().trim();
		const hasInput = inputValue !== "";
		this.setSendButtonEnabled(hasInput);
	}

	//==============================================================================
	// 등장인물 목록 패널 토글.
	//==============================================================================
	toggleCharacterListPanel() {
		const characterListPanelElement = this.getCharacterListPanelElement();
		const characterListBackdropElement = this.getCharacterListBackdropElement();
		if (characterListPanelElement === null) {
			return;
		}
		const isOpen = this.#isCharacterListPanelOpen;
		const nextOpen = !isOpen;
		this.#isCharacterListPanelOpen = nextOpen;
		const panelHtmlElement = characterListPanelElement.getHtmlElement();
		if (nextOpen) {
			this.refreshCharacterListPanel();
			panelHtmlElement.style.display = "flex";
			if (characterListBackdropElement !== null) {
				const backdropHtmlElement = characterListBackdropElement.getHtmlElement();
				backdropHtmlElement.style.display = "block";
			}
		}
		else {
			panelHtmlElement.style.display = "none";
			if (characterListBackdropElement !== null) {
				const backdropHtmlElement = characterListBackdropElement.getHtmlElement();
				backdropHtmlElement.style.display = "none";
			}
		}
	}

	//==============================================================================
	// 등장인물 패널 백드롭 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getCharacterListBackdropElement() {
		return this.#characterListBackdropElement;
	}

	//==============================================================================
	// 등장인물 목록 패널 갱신.
	// - 세션에 등록된 모든 character 를 카드 형태로 다시 그린다.
	//==============================================================================
	refreshCharacterListPanel() {
		const characterListPanelElement = this.getCharacterListPanelElement();
		if (characterListPanelElement === null) {
			return;
		}
		characterListPanelElement.removeChildren();

		const session = this.getSession();
		if (session === null) {
			return;
		}
		const characters = session.getCharacters();

		Layout.create("div")
			.text("등장인물")
			.style({
				fontSize: "13px",
				fontWeight: "bold",
				color: "#ffffff",
				paddingBottom: "6px",
				borderBottom: "1px solid #444444"
			})
			.build(characterListPanelElement);

		if (characters.length === 0) {
			Layout.create("div")
				.text("등록된 등장인물이 없습니다.")
				.style({
					fontSize: "12px",
					color: "#888888",
					padding: "8px 0"
				})
				.build(characterListPanelElement);
		}
		else {
			for (const character of characters) {
				this.appendCharacterCard(character, characterListPanelElement);
			}
		}

		this.appendExitButton(characterListPanelElement);
	}

	//==============================================================================
	// 메뉴 패널 하단 나가기 버튼 추가.
	// - 클릭 시 RoomListDocument 로 복귀(handleBackClick 과 동일 동선).
	//==============================================================================
	/**
	 * @param { Element } parentElement
	 */
	appendExitButton(parentElement) {
		Layout.create("div")
			.style({
				marginTop: "8px",
				paddingTop: "10px",
				borderTop: "1px solid #444444"
			})
			.children(
				Layout.create("button")
					.text("나가기")
					.style({
						width: "100%",
						padding: "10px",
						fontSize: "13px",
						fontWeight: "bold",
						color: "#ffcccc",
						backgroundColor: "#5c2a2a",
						border: "1px solid #7a3a3a",
						borderRadius: "4px",
						cursor: "pointer"
					})
					.on("click", () => {
						this.toggleCharacterListPanel();
						this.handleBackClick();
					})
			)
			.build(parentElement);
	}

	//==============================================================================
	// 등장인물 카드 한 개 추가.
	//==============================================================================
	/**
	 * @param { object } character
	 * @param { Element } parentElement
	 */
	appendCharacterCard(character, parentElement) {
		const name = character.getName();
		const session = this.getSession();
		const playerCharacter = session !== null ? session.getCharacter() : null;
		const isPlayer = (playerCharacter !== null) && (character === playerCharacter);
		const displayName = isPlayer ? `${name} (플레이어)` : name;

		Layout.create("div")
			.style({
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				padding: "8px 10px",
				backgroundColor: "#2a2a2c",
				border: "1px solid #3c3c3c",
				borderRadius: "4px",
				fontSize: "13px",
				color: "#ffffff"
			})
			.children(
				Layout.create("div")
					.text(displayName)
					.style({
						fontWeight: "bold"
					})
			)
			.build(parentElement);
	}

	//==============================================================================
	// EP 카드 추가.
	// - 현재 화의 ID/제목/요약을 강조 박스로 표시한다.
	//==============================================================================
	/**
	 * @param { object } episode
	 * @returns { Element }
	 */
	appendEpisodeCard(episode) {
		const messageListElement = this.getMessageListElement();
		const episodeId = episode.id;
		const episodeTitle = episode.title;
		const episodeSummary = episode.summary ?? "";

		const cardChildren = [
			Layout.create("div")
				.text("EPISODE")
				.style({
					fontSize: "11px",
					fontWeight: "bold",
					color: "#c9a86c",
					letterSpacing: "0.1em"
				}),
			Layout.create("div")
				.text(`${episodeId} — ${episodeTitle}`)
				.style({
					fontSize: "15px",
					fontWeight: "bold",
					color: "#ffffff"
				})
		];
		if (episodeSummary !== "") {
			cardChildren.push(
				Layout.create("div")
					.text(episodeSummary)
					.style({
						fontSize: "12px",
						color: "#ccc4a8",
						lineHeight: "1.5"
					})
			);
		}

		const cardElement = Layout.create("div")
			.style({
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				padding: "12px 16px",
				backgroundColor: "#3a2e1e",
				border: "1px solid #5a4a2e",
				borderRadius: "8px",
				alignSelf: "center",
				maxWidth: "85%",
				textAlign: "center"
			})
			.children(...cardChildren)
			.build(messageListElement);

		this.scrollMessageListToBottom();
		return cardElement;
	}

	//==============================================================================
	// 책에 사전 정의된 NPC 들을 세션에 등록.
	// - book.npcs 가 문자열 배열인 경우 각각 기본 스탯의 Character 로 추가한다.
	//==============================================================================
	registerBookNpcs() {
		const session = this.getSession();
		if (session === null) {
			return;
		}
		const book = this.getBook();
		const bookNpcs = book.npcs ?? [];
		for (const npcEntry of bookNpcs) {
			const npcCharacter = new Character(npcEntry);
			const npcAppearsAt = npcEntry.appearsAt ?? null;
			session.addCharacter(npcCharacter, { appearsAt: npcAppearsAt });
		}
	}
}
