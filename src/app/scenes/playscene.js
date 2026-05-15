//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Scene, SceneManager, DomLayout, DomNode, Storage } from "../../../libs/dom.js/import.js";
import { GeminiClient, PlaybookSession, Persona } from "../../../libs/playbook-engine.js/import.js";
import { Secrets } from "../secrets.js";


//==============================================================================
// 플레이 씬.
// - PlaybookSession 인스턴스 위에 UI 레이어만 얹는다.
// - 매 턴: 사용자 입력 -> session.act(input) -> 응답을 화면에 표시.
//==============================================================================
export class PlayScene extends Scene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { object } */ #book;
	/** @private @type { PlaybookSession | null } */ #session;

	/** @private @type { DomNode | null } */ #titleNode;
	/** @private @type { DomNode | null } */ #messageListNode;
	/** @private @type { DomNode | null } */ #userInputNode;
	/** @private @type { DomNode | null } */ #sendButtonNode;
	/** @private @type { DomNode | null } */ #statusNode;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { object } book
	 */
	constructor(book) {
		super();
		this.setName("PlayScene");
		this.#book = book;
		this.#session = null;

		this.#titleNode = null;
		this.#messageListNode = null;
		this.#userInputNode = null;
		this.#sendButtonNode = null;
		this.#statusNode = null;
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
	// 스토리지 키 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getStorageKey() {
		const book = this.getBook();
		const bookId = book.id ?? "default";
		return `playbook.session.${bookId}`;
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

		const persona = new Persona({
			name: "플레이어"
		});

		const storageKey = this.getStorageKey();
		const savedMessageHistory = Storage.getJson(storageKey, null);

		this.#session = new PlaybookSession({
			book: this.getBook(),
			llmClient: geminiClient,
			persona: persona,
			messageHistory: savedMessageHistory
		});

		this.buildUI();
		const hasSavedHistory = (savedMessageHistory !== null) && (savedMessageHistory.length > 0);
		if (hasSavedHistory) {
			this.resumeScenario();
		}
		else {
			this.startScenario();
		}
	}

	//==============================================================================
	// 진행 상태 저장.
	//==============================================================================
	saveSessionHistory() {
		const session = this.getSession();
		const messageHistory = session.getMessageHistory();
		const storageKey = this.getStorageKey();
		Storage.setJson(storageKey, messageHistory);
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
							})
					),
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
						flexDirection: "row",
						gap: "8px",
						padding: "12px 16px",
						borderTop: "1px solid #333333",
						backgroundColor: "#252526"
					})
					.children(
						DomLayout.create("textarea")
							.attr("placeholder", "행동이나 대사를 입력하세요 (Ctrl+Enter 로 전송)")
							.style({
								flex: "1",
								minHeight: "60px",
								maxHeight: "160px",
								padding: "10px 12px",
								fontSize: "14px",
								lineHeight: "1.5",
								color: "#ffffff",
								backgroundColor: "#3c3c3c",
								border: "1px solid #555555",
								borderRadius: "4px",
								outline: "none",
								resize: "vertical",
								fontFamily: "inherit"
							})
							.on("keydown", (event) => {
								this.handleInputKeydown(event);
							})
							.bind((node) => {
								this.#userInputNode = node;
							}),
						DomLayout.create("button")
							.text("전송")
							.style({
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
							.bind((node) => {
								this.#sendButtonNode = node;
							})
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

		const book = this.getBook();
		const opening = book.opening ?? "";
		if (opening !== "") {
			this.appendMessage("scene", opening);
		}
		this.appendMessage("system", "지금부터 자유롭게 행동하거나 말해 보세요. 입력은 주인공의 행동/대사로 간주됩니다.");
		this.saveSessionHistory();
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

		for (let index = 0; index < historyLength; index++) {
			const entry = messageHistory[index];
			const role = entry.role;
			const text = entry.text;
			const isOpeningEntry = (index === 0) && (role === "user") && (opening !== "");
			if (isOpeningEntry) {
				this.appendMessage("scene", text);
			}
			else {
				this.appendMessage(role, text);
			}
		}
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
		if (inputValue === "") {
			return;
		}

		userInputNode.setValue("");
		this.appendMessage("user", inputValue);
		await this.requestAIResponse(inputValue);
	}

	//==============================================================================
	// 뒤로가기 처리.
	//==============================================================================
	async handleBackClick() {
		const { SelectScene } = await import("./selectscene.js");
		const selectScene = new SelectScene();
		SceneManager.getInstance().replace(selectScene);
	}

	//==============================================================================
	// AI 응답 요청.
	//==============================================================================
	/**
	 * @param { string } userInput
	 */
	async requestAIResponse(userInput) {
		this.setStatusText("AI 응답 생성 중...");
		this.setSendButtonEnabled(false);
		this.setUserInputEnabled(false);

		const thinkingNode = this.appendSpinnerMessage();

		const session = this.getSession();
		try {
			const responseText = await session.act(userInput);
			this.removeMessageNode(thinkingNode);
			this.appendMessage("model", responseText);
			this.setStatusText("");
		}
		catch (error) {
			this.removeMessageNode(thinkingNode);
			const errorText = error && error.message ? error.message : System.String(error);
			this.appendMessage("system", `오류: ${errorText}`);
			this.setStatusText("오류");
		}
		finally {
			this.setSendButtonEnabled(true);
			this.setUserInputEnabled(true);
			this.saveSessionHistory();
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
	appendMessage(role, text) {
		const messageListNode = this.getMessageListNode();

		let backgroundColor = "#2d2d30";
		if (role === "user") {
			backgroundColor = "#0e3a5c";
		}
		else if (role === "model") {
			backgroundColor = "#2a2a2c";
		}
		else if (role === "scene") {
			backgroundColor = "#2a2a2c";
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
}
