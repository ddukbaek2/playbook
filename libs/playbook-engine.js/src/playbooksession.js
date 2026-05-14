//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../dom.js/import.js";


//==============================================================================
// 상황극 세션.
// - 단일 상황극 인스턴스를 표현한다.
// - book 데이터 + 누적 대화 기록(history) 을 보유하고, 매 턴 LLM 클라이언트를 통해 진행한다.
// - UI 레이어는 본 클래스의 start()/act() 만 호출하면 된다.
//==============================================================================
export class PlaybookSession extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { object } */ #book;
	/** @private @type { object } */ #llmClient;
	/** @private @type { Array<{ role: string, text: string }> } */ #messageHistory;
	/** @private @type { boolean } */ #isWaitingResponse;
	/** @private @type { boolean } */ #isStarted;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { object } options
	 * @param { object } options.book
	 * @param { object } options.llmClient
	 */
	constructor(options) {
		super();
		const book = options.book;
		const llmClient = options.llmClient;
		if (!book) {
			throw new System.Error("PlaybookSession: book 이 필요합니다.");
		}
		if (!llmClient) {
			throw new System.Error("PlaybookSession: llmClient 가 필요합니다.");
		}
		this.#book = book;
		this.#llmClient = llmClient;
		this.#messageHistory = [];
		this.#isWaitingResponse = false;
		this.#isStarted = false;
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
	// LLM 클라이언트 반환.
	//==============================================================================
	/**
	 * @returns { object }
	 */
	getLlmClient() {
		return this.#llmClient;
	}

	//==============================================================================
	// 대화 기록 반환. (LLM 에 전달되는 누적 contents 와 동일 형식)
	//==============================================================================
	/**
	 * @returns { Array<{ role: string, text: string }> }
	 */
	getMessageHistory() {
		return this.#messageHistory;
	}

	//==============================================================================
	// 응답 대기 여부 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isWaitingResponse() {
		return this.#isWaitingResponse;
	}

	//==============================================================================
	// 시작 여부 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isStarted() {
		return this.#isStarted;
	}

	//==============================================================================
	// 세션 시작.
	// - book.opening 을 첫 user 메시지로 history 에 누적한다.
	// - LLM 호출은 하지 않는다. (첫 사용자 입력 시점에 act() 가 호출되며 그때 LLM 호출)
	//==============================================================================
	start() {
		if (this.#isStarted) {
			return;
		}
		const book = this.getBook();
		const opening = book.opening ?? "";
		if (opening !== "") {
			this.#messageHistory.push({ role: "user", text: opening });
		}
		this.#isStarted = true;
	}

	//==============================================================================
	// 한 턴 진행.
	// - 사용자 입력을 history 에 push 한 뒤 LLM 호출.
	// - 모델 응답 텍스트를 history 에 push 하고 반환.
	//==============================================================================
	/**
	 * @param { string } userInput
	 * @returns { Promise<string> }
	 */
	async act(userInput) {
		if (this.#isWaitingResponse) {
			throw new System.Error("이전 응답을 기다리는 중입니다.");
		}
		const trimmedInput = userInput.trim();
		if (trimmedInput === "") {
			throw new System.Error("빈 입력은 진행할 수 없습니다.");
		}

		this.#isWaitingResponse = true;
		try {
			this.#messageHistory.push({ role: "user", text: trimmedInput });

			const book = this.getBook();
			const systemPrompt = book.systemPrompt ?? "";
			const llmClient = this.getLlmClient();
			const replyText = await llmClient.generate(systemPrompt, this.#messageHistory);

			this.#messageHistory.push({ role: "model", text: replyText });
			return replyText;
		}
		finally {
			this.#isWaitingResponse = false;
		}
	}
}
