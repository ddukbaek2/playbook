//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";


//==============================================================================
// 로컬 스토리지 래퍼.
//==============================================================================
export class Storage extends Object {
	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 */
	constructor() {
		super();
	}

	//==============================================================================
	// 전체 제거.
	//==============================================================================
	static clear() {
		System.window.localStorage.clear();
	}

	//==============================================================================
	// 키 목록 반환. (prefix 지정 시 prefix 로 시작하는 키만)
	//==============================================================================
	/**
	 * @param { string } [prefix]
	 * @returns { Array<string> }
	 */
	static getKeys(prefix = "") {
		const result = [];
		const localStorage = System.window.localStorage;
		const totalCount = localStorage.length;
		for (let index = 0; index < totalCount; index = index + 1) {
			const key = localStorage.key(index);
			if (key === null) {
				continue;
			}
			if (prefix === "" || key.startsWith(prefix)) {
				result.push(key);
			}
		}
		return result;
	}

	//==============================================================================
	// 값 제거.
	//==============================================================================
	/**
	 * @param { string } key
	 */
	static remove(key) {
		System.window.localStorage.removeItem(key);
	}

	//==============================================================================
	// 존재 여부 반환.
	//==============================================================================
	/**
	 * @param { string } key
	 * @returns { boolean }
	 */
	static containsKey(key) {
		const value = System.window.localStorage.getItem(key);
		return value !== null;
	}

	//==============================================================================
	// 문자열 값 설정.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { string } stringValue
	 */
	static setString(key, stringValue) {
		System.window.localStorage.setItem(key, stringValue);
	}

	//==============================================================================
	// 문자열 값 반환.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { string } defaultStringValue
	 * @returns { string }
	 */
	static getString(key, defaultStringValue = "") {
		const stringValue = System.window.localStorage.getItem(key);
		if (stringValue === null) {
			return defaultStringValue;
		}
		return stringValue;
	}

	//==============================================================================
	// 논리 값 설정.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { boolean } booleanValue
	 */
	static setBoolean(key, booleanValue) {
		const stringValue = booleanValue ? "true" : "false";
		Storage.setString(key, stringValue);
	}

	//==============================================================================
	// 논리 값 반환.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { boolean } defaultBooleanValue
	 * @returns { boolean }
	 */
	static getBoolean(key, defaultBooleanValue = false) {
		const stringValue = Storage.getString(key, "");
		if (stringValue === "") {
			return defaultBooleanValue;
		}
		return stringValue === "true";
	}

	//==============================================================================
	// 숫자 값 설정.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { number } numberValue
	 */
	static setNumber(key, numberValue) {
		const stringValue = System.String(numberValue);
		Storage.setString(key, stringValue);
	}

	//==============================================================================
	// 숫자 값 반환.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { number } defaultNumberValue
	 * @returns { number }
	 */
	static getNumber(key, defaultNumberValue = 0) {
		const stringValue = Storage.getString(key, "");
		if (stringValue === "") {
			return defaultNumberValue;
		}
		const numberValue = System.Number(stringValue);
		return numberValue;
	}

	//==============================================================================
	// JSON 값 설정.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { any } jsonValue
	 */
	static setJson(key, jsonValue) {
		const stringValue = System.JSON.stringify(jsonValue);
		Storage.setString(key, stringValue);
	}

	//==============================================================================
	// JSON 값 반환.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { any } defaultJsonValue
	 * @returns { any }
	 */
	static getJson(key, defaultJsonValue = null) {
		const stringValue = Storage.getString(key, "");
		if (stringValue === "") {
			return defaultJsonValue;
		}
		try {
			const jsonValue = System.JSON.parse(stringValue);
			return jsonValue;
		}
		catch (error) {
			return defaultJsonValue;
		}
	}
}
