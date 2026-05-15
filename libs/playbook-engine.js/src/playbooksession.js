//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../dom.js/import.js";


//==============================================================================
// 상황극 세션.
// - 단일 상황극 인스턴스를 표현한다.
// - book 데이터 + 누적 대화 기록(history) 을 보유하고, 매 턴 LLM 클라이언트를 통해 진행한다.
// - 전체 messageHistory 는 보관하되, LLM 호출 시에는 최근 MAX_TURNS 턴 만 컨텍스트로 전달한다.
// - UI 레이어는 본 클래스의 start()/act() 만 호출하면 된다.
//==============================================================================
export class PlaybookSession extends Object {
	//==============================================================================
	// 상수 목록.
	//==============================================================================
	/** @type { number } */ static MAX_TURNS = 20;

	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { object } */ #book;
	/** @private @type { object } */ #llmClient;
	/** @private @type { object | null } */ #persona;
	/** @private @type { object | null } */ #character;
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
	 * @param { object } [options.persona]
	 * @param { object } [options.character]
	 * @param { Array<{ role: string, text: string }> } [options.messageHistory]
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
		const initialMessageHistory = options.messageHistory ?? null;
		const persona = options.persona ?? null;
		const character = options.character ?? null;
		this.#book = book;
		this.#llmClient = llmClient;
		this.#persona = persona;
		this.#character = character;
		this.#messageHistory = (initialMessageHistory !== null) ? initialMessageHistory.slice() : [];
		this.#isWaitingResponse = false;
		this.#isStarted = this.#messageHistory.length > 0;
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
	// 페르소나 반환. (없으면 null)
	//==============================================================================
	/**
	 * @returns { object | null }
	 */
	getPersona() {
		return this.#persona;
	}

	//==============================================================================
	// 등장인물(주인공) 반환. (없으면 null)
	//==============================================================================
	/**
	 * @returns { object | null }
	 */
	getCharacter() {
		return this.#character;
	}

	//==============================================================================
	// LLM 컨텍스트에 유지할 최대 턴 수 반환.
	// - 한 턴 = 사용자 입력 + 모델 응답 (메시지 2 개).
	//==============================================================================
	/**
	 * @returns { number }
	 */
	getMaxTurns() {
		return PlaybookSession.MAX_TURNS;
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

			const fullSystemPrompt = this.buildSystemPrompt();
			const llmContents = this.buildLlmContents();
			const llmClient = this.getLlmClient();
			const replyText = await llmClient.generate(fullSystemPrompt, llmContents);

			this.#messageHistory.push({ role: "model", text: replyText });
			return replyText;
		}
		finally {
			this.#isWaitingResponse = false;
		}
	}

	//==============================================================================
	// 시스템 프롬프트 합성.
	// - 페르소나가 있으면 페르소나 텍스트를 책의 systemPrompt 앞에 prepend 한다.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	buildSystemPrompt() {
		const book = this.getBook();
		const baseSystemPrompt = book.systemPrompt ?? "";
		const persona = this.getPersona();
		if (persona === null) {
			return baseSystemPrompt;
		}
		const personaText = persona.toPromptText();
		if (personaText === "") {
			return baseSystemPrompt;
		}
		if (baseSystemPrompt === "") {
			return personaText;
		}
		return `${personaText}\n\n${baseSystemPrompt}`;
	}

	//==============================================================================
	// LLM 에 전달할 메시지 콘텐츠 구성.
	// - 전체 messageHistory 는 보관하되, 최근 MAX_TURNS 턴(=메시지 N*2 개)만 슬라이싱한다.
	// - book.opening 이 존재하는 경우 첫 메시지(=opening)는 항상 유지하여 장면 컨텍스트를 잃지 않게 한다.
	//==============================================================================
	/**
	 * @returns { Array<{ role: string, text: string }> }
	 */
	buildLlmContents() {
		const messageHistory = this.getMessageHistory();
		const maxTurns = this.getMaxTurns();
		const maxTailMessages = maxTurns * 2;
		const historyLength = messageHistory.length;
		const book = this.getBook();
		const opening = book.opening ?? "";
		const hasOpening = opening !== "";
		if (hasOpening) {
			const allowedLength = 1 + maxTailMessages;
			if (historyLength <= allowedLength) {
				return messageHistory.slice();
			}
			const openingEntry = messageHistory[0];
			const tail = messageHistory.slice(historyLength - maxTailMessages);
			const result = [openingEntry];
			for (const entry of tail) {
				result.push(entry);
			}
			return result;
		}
		if (historyLength <= maxTailMessages) {
			return messageHistory.slice();
		}
		return messageHistory.slice(historyLength - maxTailMessages);
	}
}
