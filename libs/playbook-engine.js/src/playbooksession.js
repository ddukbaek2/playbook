//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../document-engine.js/import.js";


//==============================================================================
// 상황극 세션.
// - 단일 상황극 인스턴스를 표현한다.
// - book(chapters/episodes/npcs) + 대화 기록 + 진행 상태(현재 화, 방문 화)를 보유.
// - 매 턴 LLM 호출 시 현재 에피소드 가이드와 전환 지침이 systemPrompt 에 자동 합성된다.
// - LLM 응답에 포함된 `[다음화: <id>]` 태그를 파싱해 화 전환을 처리한다.
// - UI 레이어는 본 클래스의 start()/act() / 상태 게터만 사용한다.
//==============================================================================
export class PlaybookSession extends Object {
	//==============================================================================
	// 상수 목록.
	//==============================================================================
	/** @type { number } */ static MAX_TURNS = 20;
	/** @type { number } */ static MIN_TURNS_PER_EPISODE = 3;
	/** @type { RegExp } */ static TRANSITION_REGEX = /\[다음화\s*:\s*([\w가-힣_-]+)\s*\]/;

	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { object } */ #book;
	/** @private @type { object } */ #llmClient;
	/** @private @type { object | null } */ #persona;
	/** @private @type { object | null } */ #character;
	/** @private @type { Map<string, object> } */ #characters;
	/** @private @type { Map<string, { appearsAt: string | null }> } */ #characterMetadata;
	/** @private @type { Array<object> } */ #chapters;
	/** @private @type { Map<string, object> } */ #episodesById;
	/** @private @type { string | null } */ #currentEpisodeId;
	/** @private @type { Set<string> } */ #visitedEpisodeIds;
	/** @private @type { number } */ #currentEpisodeTurnCount;
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
	 * @param { string } [options.currentEpisodeId]
	 * @param { Array<string> } [options.visitedEpisodeIds]
	 * @param { number } [options.currentEpisodeTurnCount]
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
		this.#characters = new System.Map();
		this.#characterMetadata = new System.Map();
		this.#messageHistory = (initialMessageHistory !== null) ? initialMessageHistory.slice() : [];
		this.#isWaitingResponse = false;
		this.#isStarted = this.#messageHistory.length > 0;

		this.#chapters = book.chapters ?? [];
		this.#episodesById = new System.Map();
		for (const chapter of this.#chapters) {
			const chapterEpisodes = chapter.episodes ?? [];
			for (const episode of chapterEpisodes) {
				const episodeId = episode.id;
				const episodeEntry = {
					id: episodeId,
					title: episode.title ?? "",
					summary: episode.summary ?? "",
					transitions: episode.transitions ?? [],
					chapterId: chapter.id
				};
				this.#episodesById.set(episodeId, episodeEntry);
			}
		}

		const fallbackStartEpisodeId = this.computeFallbackStartEpisodeId(book);
		const requestedCurrentEpisodeId = options.currentEpisodeId ?? null;
		let resolvedCurrentEpisodeId = null;
		if (requestedCurrentEpisodeId !== null && this.#episodesById.has(requestedCurrentEpisodeId)) {
			resolvedCurrentEpisodeId = requestedCurrentEpisodeId;
		}
		else {
			resolvedCurrentEpisodeId = fallbackStartEpisodeId;
		}
		this.#currentEpisodeId = resolvedCurrentEpisodeId;

		this.#visitedEpisodeIds = new System.Set();
		const requestedVisitedIds = options.visitedEpisodeIds ?? null;
		if (requestedVisitedIds !== null) {
			for (const visitedId of requestedVisitedIds) {
				if (this.#episodesById.has(visitedId)) {
					this.#visitedEpisodeIds.add(visitedId);
				}
			}
		}
		if (resolvedCurrentEpisodeId !== null) {
			this.#visitedEpisodeIds.add(resolvedCurrentEpisodeId);
		}

		const requestedCurrentEpisodeTurnCount = options.currentEpisodeTurnCount;
		if (typeof requestedCurrentEpisodeTurnCount === "number" && requestedCurrentEpisodeTurnCount >= 0) {
			this.#currentEpisodeTurnCount = requestedCurrentEpisodeTurnCount;
		}
		else {
			this.#currentEpisodeTurnCount = 0;
		}

		if (character !== null) {
			const characterName = character.getName();
			this.#characters.set(characterName, character);
			this.#characterMetadata.set(characterName, { appearsAt: null });
		}
	}

	//==============================================================================
	// 기본 시작 에피소드 ID 계산.
	// - book.startEpisode 가 유효하면 사용, 아니면 첫 챕터의 첫 에피소드.
	//==============================================================================
	/**
	 * @param { object } book
	 * @returns { string | null }
	 */
	computeFallbackStartEpisodeId(book) {
		const startEpisode = book.startEpisode ?? null;
		if (startEpisode !== null && this.#episodesById.has(startEpisode)) {
			return startEpisode;
		}
		const chapters = book.chapters ?? [];
		for (const chapter of chapters) {
			const chapterEpisodes = chapter.episodes ?? [];
			if (chapterEpisodes.length > 0) {
				return chapterEpisodes[0].id;
			}
		}
		return null;
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
	// 등장 인물 등록.
	// - options.appearsAt 가 주어지면 해당 에피소드 방문 이전에는 숨겨진다.
	// - options 미지정 시 항상 표시(예: 주인공).
	//==============================================================================
	/**
	 * @param { object } character
	 * @param { object } [options]
	 * @param { string } [options.appearsAt]
	 */
	addCharacter(character, options) {
		const characterName = character.getName();
		this.#characters.set(characterName, character);
		const safeOptions = options ?? {};
		const appearsAt = safeOptions.appearsAt ?? null;
		this.#characterMetadata.set(characterName, { appearsAt: appearsAt });
	}

	//==============================================================================
	// 등장 인물 전체 목록 반환. (가시성 무시, 등록 순)
	//==============================================================================
	/**
	 * @returns { Array<object> }
	 */
	getAllCharacters() {
		const characters = this.#characters;
		return System.Array.from(characters.values());
	}

	//==============================================================================
	// 현재 보이는 등장 인물 목록 반환.
	// - appearsAt 가 null 이면 항상 노출.
	// - appearsAt 가 방문한 에피소드 ID 이면 노출.
	//==============================================================================
	/**
	 * @returns { Array<object> }
	 */
	getCharacters() {
		const result = [];
		for (const [name, character] of this.#characters) {
			const metadata = this.#characterMetadata.get(name);
			if (metadata === undefined) {
				result.push(character);
				continue;
			}
			const appearsAt = metadata.appearsAt;
			if (appearsAt === null) {
				result.push(character);
				continue;
			}
			if (this.#visitedEpisodeIds.has(appearsAt)) {
				result.push(character);
			}
		}
		return result;
	}

	//==============================================================================
	// 챕터 전체 목록 반환.
	//==============================================================================
	/**
	 * @returns { Array<object> }
	 */
	getChapters() {
		return this.#chapters;
	}

	//==============================================================================
	// 에피소드 ID 맵 반환.
	//==============================================================================
	/**
	 * @returns { Map<string, object> }
	 */
	getEpisodesById() {
		return this.#episodesById;
	}

	//==============================================================================
	// 에피소드 단건 조회. (없으면 null)
	//==============================================================================
	/**
	 * @param { string } episodeId
	 * @returns { object | null }
	 */
	getEpisode(episodeId) {
		const episode = this.#episodesById.get(episodeId);
		if (episode === undefined) {
			return null;
		}
		return episode;
	}

	//==============================================================================
	// 챕터 단건 조회. (없으면 null)
	//==============================================================================
	/**
	 * @param { string } chapterId
	 * @returns { object | null }
	 */
	getChapter(chapterId) {
		for (const chapter of this.#chapters) {
			if (chapter.id === chapterId) {
				return chapter;
			}
		}
		return null;
	}

	//==============================================================================
	// 현재 에피소드 ID 반환. (없으면 null)
	//==============================================================================
	/**
	 * @returns { string | null }
	 */
	getCurrentEpisodeId() {
		return this.#currentEpisodeId;
	}

	//==============================================================================
	// 현재 에피소드 객체 반환. (없으면 null)
	//==============================================================================
	/**
	 * @returns { object | null }
	 */
	getCurrentEpisode() {
		const currentEpisodeId = this.getCurrentEpisodeId();
		if (currentEpisodeId === null) {
			return null;
		}
		return this.getEpisode(currentEpisodeId);
	}

	//==============================================================================
	// 현재 챕터 객체 반환. (없으면 null)
	//==============================================================================
	/**
	 * @returns { object | null }
	 */
	getCurrentChapter() {
		const currentEpisode = this.getCurrentEpisode();
		if (currentEpisode === null) {
			return null;
		}
		const chapterId = currentEpisode.chapterId;
		return this.getChapter(chapterId);
	}

	//==============================================================================
	// 방문한 에피소드 ID 집합 반환.
	//==============================================================================
	/**
	 * @returns { Set<string> }
	 */
	getVisitedEpisodeIds() {
		return this.#visitedEpisodeIds;
	}

	//==============================================================================
	// 에피소드 방문 여부 반환.
	//==============================================================================
	/**
	 * @param { string } episodeId
	 * @returns { boolean }
	 */
	isEpisodeVisited(episodeId) {
		return this.#visitedEpisodeIds.has(episodeId);
	}

	//==============================================================================
	// LLM 컨텍스트에 유지할 최대 턴 수 반환.
	//==============================================================================
	/**
	 * @returns { number }
	 */
	getMaxTurns() {
		return PlaybookSession.MAX_TURNS;
	}

	//==============================================================================
	// 대화 기록 반환.
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
	// 직렬화 가능한 세션 상태 반환.
	// - localStorage 등에 보관해 추후 재구성 가능.
	//==============================================================================
	/**
	 * @returns { object }
	 */
	getSessionState() {
		const messageHistory = this.getMessageHistory();
		const visitedEpisodeIds = System.Array.from(this.#visitedEpisodeIds);
		return {
			messageHistory: messageHistory.slice(),
			currentEpisodeId: this.#currentEpisodeId,
			visitedEpisodeIds: visitedEpisodeIds,
			currentEpisodeTurnCount: this.#currentEpisodeTurnCount
		};
	}

	//==============================================================================
	// 현재 화에서 누적된 턴 수 반환.
	//==============================================================================
	/**
	 * @returns { number }
	 */
	getCurrentEpisodeTurnCount() {
		return this.#currentEpisodeTurnCount;
	}

	//==============================================================================
	// 한 화에서 다음 화로 넘어가기 위한 최소 턴 수 반환.
	//==============================================================================
	/**
	 * @returns { number }
	 */
	getMinTurnsPerEpisode() {
		return PlaybookSession.MIN_TURNS_PER_EPISODE;
	}

	//==============================================================================
	// 세션 시작.
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
	// - 사용자 입력을 history 에 push 후 LLM 호출.
	// - 응답에서 `[다음화: <id>]` 태그를 분리하여 에피소드 전환을 처리.
	// - 반환값은 태그가 제거된 텍스트.
	//==============================================================================
	/**
	 * @param { string } userInput
	 * @param { object } [options]
	 * @param { string } [options.mode]
	 * @returns { Promise<{ text: string, transitioned: boolean, previousEpisodeId: string | null, nextEpisodeId: string | null }> }
	 */
	async act(userInput, options) {
		if (this.#isWaitingResponse) {
			throw new System.Error("이전 응답을 기다리는 중입니다.");
		}
		const trimmedInput = userInput.trim();
		if (trimmedInput === "") {
			throw new System.Error("빈 입력은 진행할 수 없습니다.");
		}

		this.#isWaitingResponse = true;
		try {
			const safeOptions = options ?? {};
			const inputMode = safeOptions.mode ?? null;
			const userEntry = { role: "user", text: trimmedInput };
			if (inputMode !== null) {
				userEntry.mode = inputMode;
			}
			this.#messageHistory.push(userEntry);

			const fullSystemPrompt = this.buildSystemPrompt();
			const llmContents = this.buildLlmContents();
			const llmClient = this.getLlmClient();
			const rawReplyText = await llmClient.generate(fullSystemPrompt, llmContents);

			const parsed = this.parseTransitionTag(rawReplyText);
			const cleanedText = parsed.text;
			const requestedEpisodeId = parsed.episodeId;

			// 현재 화의 턴 카운트는 LLM 응답이 들어온 시점에서 +1.
			this.#currentEpisodeTurnCount = this.#currentEpisodeTurnCount + 1;

			let transitioned = false;
			const previousEpisodeId = this.#currentEpisodeId;
			let nextEpisodeId = null;
			const minTurnsPerEpisode = PlaybookSession.MIN_TURNS_PER_EPISODE;
			const hasMetMinTurnGate = this.#currentEpisodeTurnCount >= minTurnsPerEpisode;
			const isValidNextEpisode = (requestedEpisodeId !== null) && this.#episodesById.has(requestedEpisodeId);
			if (isValidNextEpisode && hasMetMinTurnGate) {
				nextEpisodeId = requestedEpisodeId;
				this.#currentEpisodeId = requestedEpisodeId;
				this.#visitedEpisodeIds.add(requestedEpisodeId);
				this.#currentEpisodeTurnCount = 0;
				transitioned = true;
			}

			this.#messageHistory.push({ role: "model", text: cleanedText });

			return {
				text: cleanedText,
				transitioned: transitioned,
				previousEpisodeId: previousEpisodeId,
				nextEpisodeId: nextEpisodeId
			};
		}
		finally {
			this.#isWaitingResponse = false;
		}
	}

	//==============================================================================
	// 응답 텍스트에서 `[다음화: <id>]` 태그 파싱.
	// - 발견하면 태그를 제거한 텍스트와 episodeId 를 반환.
	// - 없으면 원문 그대로 + episodeId=null.
	//==============================================================================
	/**
	 * @param { string } text
	 * @returns { { text: string, episodeId: string | null } }
	 */
	parseTransitionTag(text) {
		const match = text.match(PlaybookSession.TRANSITION_REGEX);
		if (match === null) {
			return { text: text, episodeId: null };
		}
		const matchedTag = match[0];
		const episodeId = match[1];
		const strippedText = text.replace(matchedTag, "").trim();
		return { text: strippedText, episodeId: episodeId };
	}

	//==============================================================================
	// 시스템 프롬프트 합성.
	// - 페르소나 + book.systemPrompt + 출력 포맷 지침 + 현재 에피소드 가이드(매 턴 동적) 를 조합.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	buildSystemPrompt() {
		const sections = [];

		const persona = this.getPersona();
		if (persona !== null) {
			const personaText = persona.toPromptText();
			if (personaText !== "") {
				sections.push(personaText);
			}
		}

		const book = this.getBook();
		const baseSystemPrompt = book.systemPrompt ?? "";
		if (baseSystemPrompt !== "") {
			sections.push(baseSystemPrompt);
		}

		const outputFormatGuide = this.buildOutputFormatGuideText();
		if (outputFormatGuide !== "") {
			sections.push(outputFormatGuide);
		}

		const userInputPreservationGuide = this.buildUserInputPreservationGuideText();
		if (userInputPreservationGuide !== "") {
			sections.push(userInputPreservationGuide);
		}

		const npcReactionGuide = this.buildNpcReactionGuideText();
		if (npcReactionGuide !== "") {
			sections.push(npcReactionGuide);
		}

		const episodeGuide = this.buildEpisodeGuideText();
		if (episodeGuide !== "") {
			sections.push(episodeGuide);
		}

		return sections.join("\n\n");
	}

	//==============================================================================
	// 사용자 입력 보존 지침 텍스트 빌드.
	// - 사용자가 입력한 대사/행동/상황을 임의로 변형하지 않고 100% 그대로 사실로 채택하도록 강제한다.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	buildUserInputPreservationGuideText() {
		const lines = [];
		lines.push("[사용자 입력 보존 지침 (최우선 규칙)]");
		lines.push("- 사용자가 입력한 대사, 행동, 상황 묘사는 100% 그대로 발생한 사실로 받아들이세요.");
		lines.push("- 사용자의 입력 내용을 절대로 임의로 요약, 축약, 생략, 대체, 각색, 부정, 무시하지 마세요.");
		lines.push("- 사용자의 입력이 큰따옴표로 감싸진 대사라면 주인공이 그 문구를 토씨 하나 틀리지 않고 그대로 말한 것으로 처리하세요.");
		lines.push("- 사용자의 입력이 상황/행동 묘사라면 그 행동이 그대로 일어난 것으로 처리하세요.");
		lines.push("- 사용자의 입력이 현재 에피소드의 가이드와 충돌하거나 시나리오 진행을 망가뜨리는 경우에도 사용자의 입력을 우선합니다. 이 경우 진행이 어색해지거나 결말이 바뀌더라도 사용자의 선택을 존중해 자연스러운 후속 반응만 묘사하세요.");
		lines.push("- 응답에서는 사용자의 입력 자체를 다시 반복해 출력하지 말고, 그 입력에 대한 NPC/세계의 반응과 후속 묘사만 작성하세요.");
		return lines.join("\n");
	}

	//==============================================================================
	// NPC 반응 인과 지침 텍스트 빌드.
	// - NPC 의 행동/대사가 직전 사용자 입력에 어떻게 반응한 것인지 그 사유가 응답 본문에 드러나도록 강제한다.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	buildNpcReactionGuideText() {
		const lines = [];
		lines.push("[NPC 반응 인과 지침]");
		lines.push("- 등장인물(NPC)의 행동, 표정, 대사가 직전 사용자 입력의 어떤 부분에 반응한 것인지 그 사유가 응답 본문에서 항상 드러나도록 작성하세요.");
		lines.push("- 속마음(내적 독백) 묘사가 아니어도 됩니다. 표정 변화, 시선, 호흡, 몸짓, 어조, 말끝의 망설임, 짧은 되묻기, 주변 묘사 등 어떤 외적 단서로든 \"왜 그렇게 반응했는지\" 가 사용자 입력과 인과로 연결되어야 합니다.");
		lines.push("- 사용자의 대사/행동이 NPC 에게 황당하거나 예상 밖일수록, 그 당황/혼란/분노/웃음 등이 어떤 지점에서 촉발됐는지 더 분명하게 표현하세요. (예: NPC 가 사용자의 말 중 특정 단어를 되뇌인다, 사용자가 한 행동의 결과물을 시선으로 좇는다 등)");
		lines.push("- 이유 없이 NPC 가 갑자기 새로운 행동을 시작하거나 화제를 돌리지 마세요. 모든 반응 변화는 직전 사용자 입력 또는 직전 상황 묘사와 명시적/암시적 인과를 가져야 합니다.");
		return lines.join("\n");
	}

	//==============================================================================
	// 출력 포맷 지침 텍스트 빌드.
	// - 설명/묘사와 대사를 줄바꿈으로 분리하도록 강제한다.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	buildOutputFormatGuideText() {
		const lines = [];
		lines.push("[출력 포맷 지침]");
		lines.push("- 장면 묘사/설명과 등장인물의 대사 사이에는 반드시 빈 줄(\\n\\n) 을 넣어 분리하세요.");
		lines.push("- 등장인물의 대사는 큰따옴표(\"...\") 로 감싸고, 묘사 단락과는 별도의 단락에 배치하세요.");
		lines.push("- 서로 다른 등장인물의 대사가 연속될 때에도 각 대사 사이에 빈 줄을 넣어 단락을 분리하세요.");
		lines.push("- 예시:");
		lines.push("  어쩌고 저쨌다.");
		lines.push("");
		lines.push("  \"대사\"");
		lines.push("");
		lines.push("  이어서 또 어쩌고 했다.");
		return lines.join("\n");
	}

	//==============================================================================
	// 현재 에피소드 가이드 + 전환 지침 텍스트 빌드.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	buildEpisodeGuideText() {
		const currentEpisode = this.getCurrentEpisode();
		if (currentEpisode === null) {
			return "";
		}
		const currentChapter = this.getCurrentChapter();
		const chapterTitle = currentChapter !== null ? currentChapter.title : "";
		const episodeId = currentEpisode.id;
		const episodeTitle = currentEpisode.title;
		const episodeSummary = currentEpisode.summary;
		const transitions = currentEpisode.transitions ?? [];

		const lines = [];
		lines.push("[현재 진행 상황]");
		if (chapterTitle !== "") {
			lines.push(`- 현재 챕터: ${chapterTitle}`);
		}
		lines.push(`- 현재 화: ${episodeId} (${episodeTitle})`);
		if (episodeSummary !== "") {
			lines.push(`- 화 요약: ${episodeSummary}`);
		}
		const currentEpisodeTurnCount = this.getCurrentEpisodeTurnCount();
		const minTurnsPerEpisode = this.getMinTurnsPerEpisode();
		lines.push(`- 현재 화 누적 턴 수: ${currentEpisodeTurnCount} (전환 가능 최소 턴: ${minTurnsPerEpisode})`);

		if (transitions.length === 0) {
			lines.push("- 가능한 다음 화: 없음 (마지막 화)");
			lines.push("");
			lines.push("[전환 지침]");
			lines.push("이 화가 마지막입니다. [다음화] 태그를 출력하지 말고 결말까지 자연스럽게 전개하세요.");
		}
		else {
			const transitionDescriptions = [];
			for (const transitionId of transitions) {
				const targetEpisode = this.getEpisode(transitionId);
				if (targetEpisode !== null) {
					transitionDescriptions.push(`${transitionId}(${targetEpisode.title})`);
				}
				else {
					transitionDescriptions.push(transitionId);
				}
			}
			lines.push(`- 가능한 다음 화: ${transitionDescriptions.join(", ")}`);
			lines.push("");
			lines.push("[전환 지침 (엄격)]");
			lines.push(`- 현재 화에서 최소 ${minTurnsPerEpisode} 턴이 누적되기 전에는 절대로 [다음화] 태그를 출력하지 마세요. 사용자의 단 한두 번의 응답만으로 전환하는 것은 시나리오를 망치는 행위입니다.`);
			lines.push("- 최소 턴 조건이 충족된 이후에도, 화 요약에 적힌 사건의 시작·중간·끝이 모두 자연스럽게 묘사되었고, 사용자가 그 흐름에 충분히 참여했으며, 다음 화로 넘어가는 것이 부자연스럽지 않을 때에만 응답의 마지막 줄에 `[다음화: <id>]` 형식으로 다음 화 ID 를 표기하세요.");
			lines.push("- 가능한 다음 화 ID 중에서 하나를 골라야 합니다. 판단이 애매하면 전환하지 말고 현재 화의 묘사를 더 풍부하게 이어 가세요. 전환은 한 번 일어나면 되돌릴 수 없으므로 신중하게 결정하세요.");
			lines.push("- 사용자가 \"다음 화로 가자\" 같은 메타 요청을 직접 하지 않는 한, 위 두 조건이 모두 만족될 때까지 전환을 보류합니다.");
		}

		return lines.join("\n");
	}

	//==============================================================================
	// LLM 에 전달할 메시지 콘텐츠 구성.
	// - 전체 messageHistory 는 보관하되, opening + 최근 MAX_TURNS 턴 만 슬라이싱.
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
