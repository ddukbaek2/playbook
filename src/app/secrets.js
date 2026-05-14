//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;


//==============================================================================
// 비밀 정보 로더.
// - secrets.json 을 한 번 fetch 해 정적 캐시에 보관한다.
// - 외부에서는 Secrets.get(key) 로 값을 조회한다.
//==============================================================================
export class Secrets {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @static @type { object | null } */ static #data = null;

	//==============================================================================
	// 비밀 정보 로드.
	//==============================================================================
	/**
	 * @param { string } path
	 * @returns { Promise<void> }
	 */
	static async load(path) {
		try {
			const response = await System.fetch(path);
			if (!response.ok) {
				throw new System.Error(`secrets 로드 실패 (${response.status})`);
			}
			const data = await response.json();
			Secrets.#data = data;
		}
		catch (error) {
			System.console.error("[Secrets] 로드 실패:", error);
			Secrets.#data = {};
		}
	}

	//==============================================================================
	// 값 조회.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { string } [defaultValue]
	 * @returns { string }
	 */
	static get(key, defaultValue = "") {
		const data = Secrets.#data;
		if (data === null) {
			return defaultValue;
		}
		const value = data[key];
		if (value === undefined || value === null) {
			return defaultValue;
		}
		return value;
	}

	//==============================================================================
	// 로드 여부 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	static isLoaded() {
		return Secrets.#data !== null;
	}
}
