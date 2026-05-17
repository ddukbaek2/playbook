//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Scene, SceneManager, DomLayout, DomNode, Storage } from "../../../libs/dom.js/import.js";
import { GeminiClient, PlaybookSession, Persona, Character } from "../../../libs/playbook-engine.js/import.js";
import { Secrets } from "../secrets.js";


//==============================================================================
// 플레이 씬.
// - PlaybookSession 인스턴스 위에 UI 레이어만 얹는다.
// - 매 턴: 사용자 입력 -> session.act(input) -> 응답을 화면에 표시.
//==============================================================================
export class PlayScene extends Scene {
	//==============================================================================
	// 입력 모드 상수.
	//==============================================================================
	/** @type { string } */ static INPUT_MODE_DIALOGUE = "dialogue";
	/** @type { string } */ static INPUT_MODE_MIXED = "mixed";
	/** @type { string } */ static INPUT_MODE_DESCRIPTION = "description";

	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { object } */ #book;
	/** @private @type { PlaybookSession | null } */ #session;
	/** @private @type { string } */ #inputMode;
	/** @private @type { boolean } */ #isCharacterListPanelOpen;

	/** @private @type { DomNode | null } */ #titleNode;
	/** @private @type { DomNode | null } */ #messageListNode;
	/** @private @type { DomNode | null } */ #userInputNode;
	/** @private @type { DomNode | null } */ #sendButtonNode;
	/** @private @type { DomNode | null } */ #clearButtonNode;
	/** @private @type { DomNode | null } */ #statusNode;
	/** @private @type { DomNode | null } */ #menuButtonNode;
	/** @private @type { DomNode | null } */ #characterListPanelNode;
	/** @private @type { DomNode | null } */ #characterListBackdropNode;
	/** @private @type { DomNode | null } */ #dialogueModeButtonNode;
	/** @private @type { DomNode | null } */ #mixedModeButtonNode;
	/** @private @type { DomNode | null } */ #descriptionModeButtonNode;
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
		this.setName("PlayScene");
		this.#book = options.book;
		this.#slotId = options.slotId;
		this.#session = null;
		this.#inputMode = PlayScene.INPUT_MODE_MIXED;
		this.#isCharacterListPanelOpen = false;

		this.#titleNode = null;
		this.#messageListNode = null;
		this.#userInputNode = null;
		this.#sendButtonNode = null;
		this.#clearButtonNode = null;
		this.#statusNode = null;
		this.#menuButtonNode = null;
		this.#characterListPanelNode = null;
		this.#characterListBackdropNode = null;
		this.#dialogueModeButtonNode = null;
		this.#mixedModeButtonNode = null;
		this.#descriptionModeButtonNode = null;
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
	// 메시지 목록 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getMessageListNode() {
		return this.#messageListNode;
	}

	//==============================================================================
	// 사용자 입력 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getUserInputNode() {
		return this.#userInputNode;
	}

	//==============================================================================
	// 전송 버튼 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getSendButtonNode() {
		return this.#sendButtonNode;
	}

	//==============================================================================
	// 상태 표시 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getStatusNode() {
		return this.#statusNode;
	}

	//==============================================================================
	// 비우기 버튼 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getClearButtonNode() {
		return this.#clearButtonNode;
	}

	//==============================================================================
	// 메뉴 버튼 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getMenuButtonNode() {
		return this.#menuButtonNode;
	}

	//==============================================================================
	// 등장인물 목록 패널 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getCharacterListPanelNode() {
		return this.#characterListPanelNode;
	}

	//==============================================================================
	// 대사 모드 버튼 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getDialogueModeButtonNode() {
		return this.#dialogueModeButtonNode;
	}

	//==============================================================================
	// 혼합 모드 버튼 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getMixedModeButtonNode() {
		return this.#mixedModeButtonNode;
	}

	//==============================================================================
	// 상황 모드 버튼 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getDescriptionModeButtonNode() {
		return this.#descriptionModeButtonNode;
	}

	//==============================================================================
	// 현재 입력 모드 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getInputMode() {
		return this.#inputMode;
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
			visitedEpisodeIds: savedState.visitedEpisodeIds
		});

		this.registerBookNpcs();

		this.buildUI();
		this.refreshInputModeStyles();
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
	 * @returns { { messageHistory: Array | null, currentEpisodeId: string | null, visitedEpisodeIds: Array<string> | null } }
	 */
	loadStoredSession(storageKey) {
		const stored = Storage.getJson(storageKey, null);
		if (stored === null) {
			return {
				messageHistory: null,
				currentEpisodeId: null,
				visitedEpisodeIds: null
			};
		}
		if (System.Array.isArray(stored)) {
			return {
				messageHistory: stored,
				currentEpisodeId: null,
				visitedEpisodeIds: null
			};
		}
		return {
			messageHistory: stored.messageHistory ?? null,
			currentEpisodeId: stored.currentEpisodeId ?? null,
			visitedEpisodeIds: stored.visitedEpisodeIds ?? null
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
			visitedEpisodeIds: sessionState.visitedEpisodeIds
		};
		Storage.setJson(storageKey, slotData);
	}

	//==============================================================================
	// UI 구성.
	//==============================================================================
	buildUI() {
		const book = this.getBook();
		const bookTitle = book.title ?? "상황극";

		DomLayout.create("div")
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
				DomLayout.create("div")
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
						DomLayout.create("button")
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
						DomLayout.create("div")
							.text(bookTitle)
							.style({
								fontSize: "14px",
								fontWeight: "bold",
								color: "#ffffff"
							})
							.bind((node) => {
								this.#titleNode = node;
							}),
						DomLayout.create("div")
							.text("")
							.style({
								marginLeft: "auto",
								fontSize: "12px",
								color: "#888888"
							})
							.bind((node) => {
								this.#statusNode = node;
							}),
						DomLayout.create("button")
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
							.bind((node) => {
								this.#menuButtonNode = node;
							}),
						DomLayout.create("div")
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
							.bind((node) => {
								this.#characterListPanelNode = node;
							})
					),
				DomLayout.create("div")
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
					.bind((node) => {
						this.#characterListBackdropNode = node;
					}),
				DomLayout.create("div")
					.style({
						flex: "1 1 auto",
						overflowY: "auto",
						padding: "16px",
						display: "flex",
						flexDirection: "column",
						gap: "12px"
					})
					.bind((node) => {
						this.#messageListNode = node;
					}),
				DomLayout.create("div")
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
						DomLayout.create("div")
							.style({
								display: "flex",
								flexDirection: "row",
								gap: "4px"
							})
							.children(
								DomLayout.create("button")
									.text("대사")
									.style({
										flex: "1",
										height: "32px",
										padding: "0 10px",
										fontSize: "12px",
										fontWeight: "bold",
										border: "1px solid #555555",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.setInputMode(PlayScene.INPUT_MODE_DIALOGUE);
									})
									.bind((node) => {
										this.#dialogueModeButtonNode = node;
									}),
								DomLayout.create("button")
									.text("혼합")
									.style({
										flex: "1",
										height: "32px",
										padding: "0 10px",
										fontSize: "12px",
										fontWeight: "bold",
										border: "1px solid #555555",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.setInputMode(PlayScene.INPUT_MODE_MIXED);
									})
									.bind((node) => {
										this.#mixedModeButtonNode = node;
									}),
								DomLayout.create("button")
									.text("상황")
									.style({
										flex: "1",
										height: "32px",
										padding: "0 10px",
										fontSize: "12px",
										fontWeight: "bold",
										border: "1px solid #555555",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.setInputMode(PlayScene.INPUT_MODE_DESCRIPTION);
									})
									.bind((node) => {
										this.#descriptionModeButtonNode = node;
									}),
								DomLayout.create("button")
									.text("비우기")
									.style({
										flex: "1",
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
									.bind((node) => {
										this.#clearButtonNode = node;
									})
							),
						DomLayout.create("div")
							.style({
								display: "flex",
								flexDirection: "row",
								alignItems: "stretch",
								gap: "8px"
							})
							.children(
								DomLayout.create("textarea")
									.attr("rows", "2")
									.style({
										flex: "1",
										minHeight: "44px",
										maxHeight: "120px",
										padding: "8px 12px",
										fontSize: "14px",
										lineHeight: "1.5",
										color: "#ffffff",
										backgroundColor: "#3c3c3c",
										border: "1px solid #555555",
										borderRadius: "4px",
										outline: "none",
										resize: "vertical",
										fontFamily: "inherit",
										boxSizing: "border-box"
									})
									.on("keydown", (event) => {
										this.handleInputKeydown(event);
									})
									.on("input", () => {
										this.refreshSendButton();
									})
									.bind((node) => {
										this.#userInputNode = node;
									}),
								DomLayout.create("button")
									.text("자동진행")
									.style({
										minWidth: "80px",
										padding: "0 20px",
										fontSize: "14px",
										fontWeight: "bold",
										color: "#ffffff",
										backgroundColor: "#6a3a8c",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer"
									})
									.on("click", () => {
										this.handleSendClick();
									})
									.bind((node) => {
										this.#sendButtonNode = node;
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
	// 전송 처리.
	//==============================================================================
	async handleSendClick() {
		const session = this.getSession();
		if (session.isWaitingResponse()) {
			return;
		}
		const userInputNode = this.getUserInputNode();
		const inputValue = userInputNode.getValue().trim();
		const isAutoAdvance = (inputValue === "");
		const currentMode = this.getInputMode();
		let submittedText = "";
		let submittedMode = currentMode;
		if (isAutoAdvance) {
			submittedText = "(자동 진행)";
			submittedMode = "auto";
		}
		else if (currentMode === PlayScene.INPUT_MODE_DIALOGUE) {
			submittedText = `"${inputValue}"`;
		}
		else {
			submittedText = inputValue;
		}

		userInputNode.setValue("");
		this.refreshSendButton();
		this.appendMessage("user", submittedText, submittedMode);
		await this.requestAIResponse(submittedText, submittedMode);
	}

	//==============================================================================
	// 뒤로가기 처리.
	//==============================================================================
	async handleBackClick() {
		const { TitleScene } = await import("./titlescene.js");
		const titleScene = new TitleScene();
		SceneManager.getInstance().replace(titleScene);
	}

	//==============================================================================
	// AI 응답 요청.
	//==============================================================================
	/**
	 * @param { string } userInput
	 */
	async requestAIResponse(userInput, mode) {
		this.setSendButtonEnabled(false);
		this.setUserInputEnabled(false);

		const thinkingNode = this.appendSpinnerMessage();

		const session = this.getSession();
		try {
			const actOptions = (mode !== undefined && mode !== null) ? { mode: mode } : undefined;
			const result = await session.act(userInput, actOptions);
			const responseText = result.text;
			this.removeMessageNode(thinkingNode);
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
			this.removeMessageNode(thinkingNode);
			const errorText = error && error.message ? error.message : System.String(error);
			this.appendMessage("system", `오류: ${errorText}`);
		}
		finally {
			this.setSendButtonEnabled(true);
			this.setUserInputEnabled(true);
			this.saveSessionHistory();
			this.refreshTurnCountStatus();
		}
	}

	//==============================================================================
	// 메시지 박스 추가. (role: user | model | scene | system)
	// - 히스토리 관리는 PlaybookSession 이 담당하므로 본 메서드는 UI 표시만 수행한다.
	//==============================================================================
	/**
	 * @param { string } role
	 * @param { string } text
	 * @returns { DomNode }
	 */
	appendMessage(role, text, mode) {
		const messageListNode = this.getMessageListNode();

		let backgroundColor = "#2d2d30";
		if (role === "user") {
			if (mode === "auto") {
				backgroundColor = "#3a3a44";
			}
			else if (mode === PlayScene.INPUT_MODE_DIALOGUE) {
				backgroundColor = "#1c4a6c";
			}
			else if (mode === PlayScene.INPUT_MODE_MIXED) {
				backgroundColor = "#1e5c5c";
			}
			else if (mode === PlayScene.INPUT_MODE_DESCRIPTION) {
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

		const messageNode = DomLayout.create("div")
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
				DomLayout.create("div")
					.text(text)
			)
			.build(messageListNode);

		this.scrollMessageListToBottom();
		return messageNode;
	}

	//==============================================================================
	// 응답 대기용 스피너 메시지 추가.
	// - 초당 1회전 회전 인디케이터를 담은 모델 톤의 박스를 추가하고 노드를 반환한다.
	// - Web Animations API 로 회전. 노드 제거 시 애니메이션도 함께 정리된다.
	//==============================================================================
	/**
	 * @returns { DomNode }
	 */
	appendSpinnerMessage() {
		const messageListNode = this.getMessageListNode();

		const messageNode = DomLayout.create("div")
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
				DomLayout.create("div")
					.style({
						width: "16px",
						height: "16px",
						border: "2px solid #555555",
						borderTopColor: "#ffffff",
						borderRadius: "50%",
						boxSizing: "border-box"
					})
					.bind((spinnerNode) => {
						const spinnerElement = spinnerNode.getElement();
						const keyframes = [
							{ transform: "rotate(0deg)" },
							{ transform: "rotate(360deg)" }
						];
						const animationOptions = {
							duration: 1000,
							iterations: System.Infinity,
							easing: "linear"
						};
						spinnerElement.animate(keyframes, animationOptions);
					})
			)
			.build(messageListNode);

		this.scrollMessageListToBottom();
		return messageNode;
	}

	//==============================================================================
	// 메시지 노드 제거.
	//==============================================================================
	/**
	 * @param { DomNode } messageNode
	 */
	removeMessageNode(messageNode) {
		const messageListNode = this.getMessageListNode();
		messageListNode.removeChild(messageNode);
		messageNode.destroy();
	}

	//==============================================================================
	// 메시지 목록 맨 아래로 스크롤.
	//==============================================================================
	scrollMessageListToBottom() {
		const messageListNode = this.getMessageListNode();
		const element = messageListNode.getElement();
		element.scrollTop = element.scrollHeight;
	}

	//==============================================================================
	// 상태 텍스트 설정.
	//==============================================================================
	/**
	 * @param { string } text
	 */
	setStatusText(text) {
		const statusNode = this.getStatusNode();
		statusNode.setText(text);
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
		const sendButtonNode = this.getSendButtonNode();
		const element = sendButtonNode.getElement();
		element.disabled = !enabled;
		element.style.opacity = enabled ? "1" : "0.5";
		element.style.cursor = enabled ? "pointer" : "not-allowed";
	}

	//==============================================================================
	// 사용자 입력창 활성/비활성.
	//==============================================================================
	/**
	 * @param { boolean } enabled
	 */
	setUserInputEnabled(enabled) {
		const userInputNode = this.getUserInputNode();
		const element = userInputNode.getElement();
		element.disabled = !enabled;
		element.style.opacity = enabled ? "1" : "0.5";
		element.style.cursor = enabled ? "text" : "not-allowed";
	}

	//==============================================================================
	// 비우기 버튼 처리. (textarea 내용을 빈 문자열로 설정하고 포커스)
	//==============================================================================
	handleClearClick() {
		const userInputNode = this.getUserInputNode();
		userInputNode.setValue("");
		this.refreshSendButton();
		const userInputElement = userInputNode.getElement();
		userInputElement.focus();
	}

	//==============================================================================
	// 진행 버튼 라벨/색상 갱신.
	// - textarea 가 비어 있으면 "자동진행"(보라톤), 내용이 있으면 "진행"(블루톤).
	//==============================================================================
	refreshSendButton() {
		const sendButtonNode = this.getSendButtonNode();
		const userInputNode = this.getUserInputNode();
		if (sendButtonNode === null) {
			return;
		}
		if (userInputNode === null) {
			return;
		}
		const inputValue = userInputNode.getValue().trim();
		const isAutoAdvance = (inputValue === "");
		const sendButtonElement = sendButtonNode.getElement();
		if (isAutoAdvance) {
			sendButtonElement.textContent = "자동진행";
			sendButtonElement.style.backgroundColor = "#6a3a8c";
		}
		else {
			sendButtonElement.textContent = "진행";
			sendButtonElement.style.backgroundColor = "#0e639c";
		}
	}

	//==============================================================================
	// 입력 모드 설정.
	// - INPUT_MODE_DIALOGUE 또는 INPUT_MODE_DESCRIPTION.
	//==============================================================================
	/**
	 * @param { string } mode
	 */
	setInputMode(mode) {
		this.#inputMode = mode;
		this.refreshInputModeStyles();
	}

	//==============================================================================
	// 입력 모드별 스타일 적용.
	// - 입력창 배경색과 모드 버튼의 활성/비활성 표시를 갱신한다.
	//==============================================================================
	refreshInputModeStyles() {
		const mode = this.getInputMode();
		const userInputNode = this.getUserInputNode();
		const dialogueModeButtonNode = this.getDialogueModeButtonNode();
		const mixedModeButtonNode = this.getMixedModeButtonNode();
		const descriptionModeButtonNode = this.getDescriptionModeButtonNode();
		if (userInputNode === null) {
			return;
		}
		if (dialogueModeButtonNode === null) {
			return;
		}
		if (mixedModeButtonNode === null) {
			return;
		}
		if (descriptionModeButtonNode === null) {
			return;
		}

		const dialogueActiveColor = "#2c3a4c";
		const mixedActiveColor = "#2c4c4c";
		const descriptionActiveColor = "#7a3450";
		const inactiveBackgroundColor = "#2a2a2c";
		const inactiveTextColor = "#888888";
		const activeTextColor = "#ffffff";

		const userInputElement = userInputNode.getElement();
		const dialogueModeButtonElement = dialogueModeButtonNode.getElement();
		const mixedModeButtonElement = mixedModeButtonNode.getElement();
		const descriptionModeButtonElement = descriptionModeButtonNode.getElement();

		dialogueModeButtonElement.style.backgroundColor = inactiveBackgroundColor;
		dialogueModeButtonElement.style.color = inactiveTextColor;
		mixedModeButtonElement.style.backgroundColor = inactiveBackgroundColor;
		mixedModeButtonElement.style.color = inactiveTextColor;
		descriptionModeButtonElement.style.backgroundColor = inactiveBackgroundColor;
		descriptionModeButtonElement.style.color = inactiveTextColor;

		if (mode === PlayScene.INPUT_MODE_DIALOGUE) {
			userInputElement.style.backgroundColor = dialogueActiveColor;
			userInputElement.placeholder = "대사를 입력하세요";
			dialogueModeButtonElement.style.backgroundColor = dialogueActiveColor;
			dialogueModeButtonElement.style.color = activeTextColor;
		}
		else if (mode === PlayScene.INPUT_MODE_MIXED) {
			userInputElement.style.backgroundColor = mixedActiveColor;
			userInputElement.placeholder = "대사 (괄호 안에 상황/설명) 형식으로 입력하세요";
			mixedModeButtonElement.style.backgroundColor = mixedActiveColor;
			mixedModeButtonElement.style.color = activeTextColor;
		}
		else {
			userInputElement.style.backgroundColor = descriptionActiveColor;
			userInputElement.placeholder = "상황을 입력하세요";
			descriptionModeButtonElement.style.backgroundColor = descriptionActiveColor;
			descriptionModeButtonElement.style.color = activeTextColor;
		}
	}

	//==============================================================================
	// 등장인물 목록 패널 토글.
	//==============================================================================
	toggleCharacterListPanel() {
		const characterListPanelNode = this.getCharacterListPanelNode();
		const characterListBackdropNode = this.getCharacterListBackdropNode();
		if (characterListPanelNode === null) {
			return;
		}
		const isOpen = this.#isCharacterListPanelOpen;
		const nextOpen = !isOpen;
		this.#isCharacterListPanelOpen = nextOpen;
		const panelElement = characterListPanelNode.getElement();
		if (nextOpen) {
			this.refreshCharacterListPanel();
			panelElement.style.display = "flex";
			if (characterListBackdropNode !== null) {
				const backdropElement = characterListBackdropNode.getElement();
				backdropElement.style.display = "block";
			}
		}
		else {
			panelElement.style.display = "none";
			if (characterListBackdropNode !== null) {
				const backdropElement = characterListBackdropNode.getElement();
				backdropElement.style.display = "none";
			}
		}
	}

	//==============================================================================
	// 등장인물 패널 백드롭 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getCharacterListBackdropNode() {
		return this.#characterListBackdropNode;
	}

	//==============================================================================
	// 등장인물 목록 패널 갱신.
	// - 세션에 등록된 모든 character 를 카드 형태로 다시 그린다.
	//==============================================================================
	refreshCharacterListPanel() {
		const characterListPanelNode = this.getCharacterListPanelNode();
		if (characterListPanelNode === null) {
			return;
		}
		characterListPanelNode.removeChildren();

		const session = this.getSession();
		if (session === null) {
			return;
		}
		const characters = session.getCharacters();

		DomLayout.create("div")
			.text("등장인물")
			.style({
				fontSize: "13px",
				fontWeight: "bold",
				color: "#ffffff",
				paddingBottom: "6px",
				borderBottom: "1px solid #444444"
			})
			.build(characterListPanelNode);

		if (characters.length === 0) {
			DomLayout.create("div")
				.text("등록된 등장인물이 없습니다.")
				.style({
					fontSize: "12px",
					color: "#888888",
					padding: "8px 0"
				})
				.build(characterListPanelNode);
			return;
		}

		for (const character of characters) {
			this.appendCharacterCard(character, characterListPanelNode);
		}
	}

	//==============================================================================
	// 등장인물 카드 한 개 추가.
	//==============================================================================
	/**
	 * @param { object } character
	 * @param { DomNode } parentNode
	 */
	appendCharacterCard(character, parentNode) {
		const name = character.getName();
		const session = this.getSession();
		const playerCharacter = session !== null ? session.getCharacter() : null;
		const isPlayer = (playerCharacter !== null) && (character === playerCharacter);
		const displayName = isPlayer ? `${name} (플레이어)` : name;

		DomLayout.create("div")
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
				DomLayout.create("div")
					.text(displayName)
					.style({
						fontWeight: "bold"
					})
			)
			.build(parentNode);
	}

	//==============================================================================
	// EP 카드 추가.
	// - 현재 화의 ID/제목/요약을 강조 박스로 표시한다.
	//==============================================================================
	/**
	 * @param { object } episode
	 * @returns { DomNode }
	 */
	appendEpisodeCard(episode) {
		const messageListNode = this.getMessageListNode();
		const episodeId = episode.id;
		const episodeTitle = episode.title;
		const episodeSummary = episode.summary ?? "";

		const cardChildren = [
			DomLayout.create("div")
				.text("EPISODE")
				.style({
					fontSize: "11px",
					fontWeight: "bold",
					color: "#c9a86c",
					letterSpacing: "0.1em"
				}),
			DomLayout.create("div")
				.text(`${episodeId} — ${episodeTitle}`)
				.style({
					fontSize: "15px",
					fontWeight: "bold",
					color: "#ffffff"
				})
		];
		if (episodeSummary !== "") {
			cardChildren.push(
				DomLayout.create("div")
					.text(episodeSummary)
					.style({
						fontSize: "12px",
						color: "#ccc4a8",
						lineHeight: "1.5"
					})
			);
		}

		const cardNode = DomLayout.create("div")
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
			.build(messageListNode);

		this.scrollMessageListToBottom();
		return cardNode;
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
