//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../document-engine.js/import.js";


//==============================================================================
// Gemini API 클라이언트.
// - generativelanguage.googleapis.com REST 엔드포인트를 호출한다.
// - 시스템 프롬프트와 누적 메시지(contents)를 받아 모델 응답 텍스트를 반환한다.
//==============================================================================
export class GeminiClient extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { string } */ #apiKey;
	/** @private @type { string } */ #modelName;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { string } apiKey
	 * @param { string } [modelName]
	 */
	constructor(apiKey, modelName = "gemini-2.5-pro") {
		super();
		this.#apiKey = apiKey;
		this.#modelName = modelName;
	}

	//==============================================================================
	// API 키 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getApiKey() {
		return this.#apiKey;
	}

	//==============================================================================
	// 모델명 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getModelName() {
		return this.#modelName;
	}

	//==============================================================================
	// 콘텐츠 생성 요청.
	// - systemPrompt: 시스템 인스트럭션.
	// - messageHistory: [{ role: "user"|"model", text: string }, ...] 형태.
	//==============================================================================
	/**
	 * @param { string } systemPrompt
	 * @param { Array<{ role: string, text: string }> } messageHistory
	 * @returns { Promise<string> }
	 */
	async generate(systemPrompt, messageHistory) {
		const apiKey = this.getApiKey();
		const modelName = this.getModelName();
		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
		const maskedEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=***`;

		const contents = [];
		for (const message of messageHistory) {
			const role = message.role;
			const text = message.text;
			contents.push({
				role: role,
				parts: [{ text: text }]
			});
		}

		const requestBody = {
			contents: contents,
			systemInstruction: {
				parts: [{ text: systemPrompt }]
			},
			generationConfig: {
				temperature: 0.9,
				topP: 0.95
			}
		};

		const requestStartTime = System.performance.now();
		System.console.groupCollapsed(`[Gemini] 요청 (${modelName}, history ${messageHistory.length}건)`);
		System.console.log("endpoint:", maskedEndpoint);
		System.console.log("model:", modelName);
		System.console.log("systemPrompt:", systemPrompt);
		System.console.log("messageHistory:", messageHistory);
		System.console.log("requestBody:", requestBody);
		System.console.groupEnd();

		let response = null;
		try {
			response = await System.fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: System.JSON.stringify(requestBody)
			});
		}
		catch (fetchError) {
			System.console.error("[Gemini] fetch 실패:", fetchError);
			throw fetchError;
		}

		if (!response.ok) {
			const errorText = await response.text();
			System.console.error(`[Gemini] HTTP ${response.status}:`, errorText);
			throw new System.Error(`Gemini API 오류 (${response.status}): ${errorText}`);
		}

		const responseJson = await response.json();
		const elapsedMs = System.performance.now() - requestStartTime;

		const candidates = responseJson.candidates;
		if (!candidates || candidates.length === 0) {
			System.console.error("[Gemini] 응답에 candidates 가 없습니다:", responseJson);
			throw new System.Error("Gemini 응답에 candidates 가 없습니다.");
		}
		const firstCandidate = candidates[0];
		const content = firstCandidate.content;
		if (!content || !content.parts || content.parts.length === 0) {
			System.console.error("[Gemini] 응답에 content.parts 가 없습니다:", responseJson);
			throw new System.Error("Gemini 응답에 content.parts 가 없습니다.");
		}

		let resultText = "";
		for (const part of content.parts) {
			const partText = part.text ?? "";
			resultText += partText;
		}

		System.console.groupCollapsed(`[Gemini] 응답 (${elapsedMs.toFixed(0)}ms, ${resultText.length}자)`);
		System.console.log("resultText:", resultText);
		System.console.log("responseJson:", responseJson);
		System.console.groupEnd();

		return resultText;
	}
}
