//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../document-engine.js/import.js";


//==============================================================================
// 유저 캐릭터 페르소나.
// - 상황극에서 사용자가 연기할 인물의 설정을 보관한다.
// - PlaybookSession 에 주입되어 systemPrompt 의 prefix 로 합성된다.
//==============================================================================
export class Persona extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { string } */ #name;
	/** @private @type { string } */ #age;
	/** @private @type { string } */ #gender;
	/** @private @type { string } */ #personality;
	/** @private @type { string } */ #background;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { object } [options]
	 * @param { string } [options.name]
	 * @param { string } [options.age]
	 * @param { string } [options.gender]
	 * @param { string } [options.personality]
	 * @param { string } [options.background]
	 */
	constructor(options) {
		super();
		const safeOptions = options ?? {};
		this.#name = safeOptions.name ?? "";
		this.#age = safeOptions.age ?? "";
		this.#gender = safeOptions.gender ?? "";
		this.#personality = safeOptions.personality ?? "";
		this.#background = safeOptions.background ?? "";
	}

	//==============================================================================
	// 이름 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getName() {
		return this.#name;
	}

	//==============================================================================
	// 나이 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getAge() {
		return this.#age;
	}

	//==============================================================================
	// 성별 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getGender() {
		return this.#gender;
	}

	//==============================================================================
	// 성격 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getPersonality() {
		return this.#personality;
	}

	//==============================================================================
	// 배경 반환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getBackground() {
		return this.#background;
	}

	//==============================================================================
	// LLM 시스템 프롬프트 주입용 텍스트 반환.
	// - 비어 있는 필드는 출력하지 않는다.
	// - 모든 필드가 비어 있으면 빈 문자열을 반환한다.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	toPromptText() {
		const name = this.getName();
		const age = this.getAge();
		const gender = this.getGender();
		const personality = this.getPersonality();
		const background = this.getBackground();
		const lines = [];
		if (name !== "") {
			lines.push(`이름: ${name}`);
		}
		if (age !== "") {
			lines.push(`나이: ${age}`);
		}
		if (gender !== "") {
			lines.push(`성별: ${gender}`);
		}
		if (personality !== "") {
			lines.push(`성격: ${personality}`);
		}
		if (background !== "") {
			lines.push(`배경: ${background}`);
		}
		if (lines.length === 0) {
			return "";
		}
		const header = "[플레이어 페르소나]";
		const body = lines.join("\n");
		return `${header}\n${body}`;
	}
}
