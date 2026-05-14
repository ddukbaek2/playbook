//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Scene, SceneManager, DomLayout, DomNode } from "../../../libs/dom.js/import.js";
import { Secrets } from "../secrets.js";
import { GeminiClient } from "../geminiclient.js";


//==============================================================================
// 플레이 씬.
// - 선택된 book 인스턴스를 받아 자동 진행하는 상황극 화면.
// - 매 턴: 사용자 입력 -> 누적 메시지 + systemPrompt 로 Gemini 호출 -> 응답 표시.
//==============================================================================
export class PlayScene extends Scene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { object } */ #book;
	/** @private @type { GeminiClient | null } */ #geminiClient;
	/** @private @type { Array<{ role: string, text: string }> } */ #messageHistory;
	/** @private @type { boolean } */ #isWaitingResponse;

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
		this.#geminiClient = null;
		this.#messageHistory = [];
		this.#isWaitingResponse = false;

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
	// 진입.
	//==============================================================================
	/**
	 * @override
	 */
	onEnter() {
		const apiKey = Secrets.get("geminiApiKey", "");
		const modelName = Secrets.get("geminiModel", "gemini-2.5-pro");
		this.#geminiClient = new GeminiClient(apiKey, modelName);

		this.buildUI();
		this.startScenario();
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
	// - book.opening 을 시스템 안내(model 메시지가 아닌 회색 박스)로 표시한다.
	// - 첫 사용자 입력 전까지 AI 호출은 하지 않는다.
	//==============================================================================
	startScenario() {
		const book = this.getBook();
		const opening = book.opening ?? "";
		if (opening !== "") {
			this.appendMessage("scene", opening);
		}
		this.appendMessage("system", "지금부터 자유롭게 행동하거나 말해 보세요. 입력은 주인공의 행동/대사로 간주됩니다.");
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
		if (this.#isWaitingResponse) {
			return;
		}
		const userInputNode = this.getUserInputNode();
		const inputValue = userInputNode.getValue().trim();
		if (inputValue === "") {
			return;
		}

		userInputNode.setValue("");
		this.appendMessage("user", inputValue);
		await this.requestAIResponse();
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
	async requestAIResponse() {
		this.#isWaitingResponse = true;
		this.setStatusText("AI 응답 생성 중...");
		this.setSendButtonEnabled(false);

		const thinkingNode = this.appendMessage("model", "...");

		try {
			const book = this.getBook();
			const systemPrompt = book.systemPrompt ?? "";
			const responseText = await this.#geminiClient.generate(systemPrompt, this.#messageHistory);
			this.removeMessageNode(thinkingNode);
			this.#messageHistory.push({ role: "model", text: responseText });
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
			this.#isWaitingResponse = false;
			this.setSendButtonEnabled(true);
		}
	}

	//==============================================================================
	// 메시지 박스 추가. (role: user | model | scene | system)
	// - user 는 히스토리에도 누적된다. model 은 호출처에서 별도 push 한다.
	//==============================================================================
	/**
	 * @param { string } role
	 * @param { string } text
	 * @returns { DomNode }
	 */
	appendMessage(role, text) {
		const messageListNode = this.getMessageListNode();

		let backgroundColor = "#2d2d30";
		let labelText = "?";
		let labelColor = "#888888";
		if (role === "user") {
			backgroundColor = "#0e3a5c";
			labelText = "나";
			labelColor = "#9dcdf5";
			this.#messageHistory.push({ role: "user", text: text });
		}
		else if (role === "model") {
			backgroundColor = "#2a2a2c";
			labelText = "GM";
			labelColor = "#f5c98f";
		}
		else if (role === "scene") {
			backgroundColor = "#2a2a2c";
			labelText = "도입";
			labelColor = "#f5c98f";
			this.#messageHistory.push({ role: "user", text: text });
		}
		else if (role === "system") {
			backgroundColor = "#33333a";
			labelText = "안내";
			labelColor = "#aaaaaa";
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
					.text(labelText)
					.style({
						fontSize: "11px",
						fontWeight: "bold",
						color: labelColor
					}),
				DomLayout.create("div")
					.text(text)
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
}
