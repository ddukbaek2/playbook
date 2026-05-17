//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";


//==============================================================================
// Document 전환 트랜지션 기반 클래스.
// - enter / exit 두 단계를 Web Animations API 로 구현한다.
// - 두 단계는 동시에 진행되며, DocumentManager 는 둘 다 완료될 때까지 기다린다.
// - 서브클래스는 buildEnterKeyframes / buildExitKeyframes 만 구현하면 된다.
//==============================================================================
export class Transition extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { number } */ #defaultDurationMs;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { object } [options]
	 * @param { number } [options.defaultDurationMs]
	 */
	constructor(options) {
		super();
		const safeOptions = options ?? {};
		this.#defaultDurationMs = safeOptions.defaultDurationMs ?? 300;
	}

	//==============================================================================
	// 기본 지속시간 반환.
	//==============================================================================
	/**
	 * @returns { number }
	 */
	getDefaultDurationMs() {
		return this.#defaultDurationMs;
	}

	//==============================================================================
	// 진입 키프레임 배열 반환.
	// - 서브클래스 오버라이드. (반환 빈 배열이면 enter 애니메이션 없음)
	//==============================================================================
	/**
	 * @virtual
	 * @returns { Array<object> }
	 */
	buildEnterKeyframes() {
		return [];
	}

	//==============================================================================
	// 퇴장 키프레임 배열 반환.
	// - 서브클래스 오버라이드. (반환 빈 배열이면 exit 애니메이션 없음)
	//==============================================================================
	/**
	 * @virtual
	 * @returns { Array<object> }
	 */
	buildExitKeyframes() {
		return [];
	}

	//==============================================================================
	// 새 도큐먼트 HTMLElement 에 enter 애니메이션 적용.
	// - 완료 시 resolve 되는 Promise 반환.
	//==============================================================================
	/**
	 * @param { HTMLElement } htmlElement
	 * @param { number } durationMs
	 * @returns { Promise<void> }
	 */
	playEnter(htmlElement, durationMs) {
		const keyframes = this.buildEnterKeyframes();
		if (keyframes.length === 0) {
			return System.Promise.resolve();
		}
		return this.playAnimation(htmlElement, keyframes, durationMs);
	}

	//==============================================================================
	// 이전 도큐먼트 HTMLElement 에 exit 애니메이션 적용.
	// - 완료 시 resolve 되는 Promise 반환.
	//==============================================================================
	/**
	 * @param { HTMLElement } htmlElement
	 * @param { number } durationMs
	 * @returns { Promise<void> }
	 */
	playExit(htmlElement, durationMs) {
		const keyframes = this.buildExitKeyframes();
		if (keyframes.length === 0) {
			return System.Promise.resolve();
		}
		return this.playAnimation(htmlElement, keyframes, durationMs);
	}

	//==============================================================================
	// Web Animations API 로 키프레임 재생.
	// - 마지막 키프레임 상태를 유지(fill="forwards")해 깜빡임을 막는다.
	//==============================================================================
	/**
	 * @param { HTMLElement } htmlElement
	 * @param { Array<object> } keyframes
	 * @param { number } durationMs
	 * @returns { Promise<void> }
	 */
	playAnimation(htmlElement, keyframes, durationMs) {
		const animation = htmlElement.animate(keyframes, {
			duration: durationMs,
			easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
			fill: "forwards"
		});
		return new System.Promise((resolve) => {
			animation.addEventListener("finish", () => {
				resolve();
			});
			animation.addEventListener("cancel", () => {
				resolve();
			});
		});
	}
}


//==============================================================================
// 트랜지션 없음. (즉시 교체)
//==============================================================================
export class NoneTransition extends Transition {
	constructor() {
		super({ defaultDurationMs: 0 });
	}
}


//==============================================================================
// 페이드 트랜지션.
//==============================================================================
export class FadeTransition extends Transition {
	constructor() {
		super({ defaultDurationMs: 250 });
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildEnterKeyframes() {
		return [
			{ opacity: "0" },
			{ opacity: "1" }
		];
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildExitKeyframes() {
		return [
			{ opacity: "1" },
			{ opacity: "0" }
		];
	}
}


//==============================================================================
// 왼쪽 슬라이드 트랜지션. (새 도큐먼트가 오른쪽에서 들어오고, 이전 도큐먼트가 왼쪽으로 빠진다)
//==============================================================================
export class SlideLeftTransition extends Transition {
	constructor() {
		super({ defaultDurationMs: 300 });
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildEnterKeyframes() {
		return [
			{ transform: "translateX(100%)" },
			{ transform: "translateX(0%)" }
		];
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildExitKeyframes() {
		return [
			{ transform: "translateX(0%)" },
			{ transform: "translateX(-100%)" }
		];
	}
}


//==============================================================================
// 오른쪽 슬라이드 트랜지션. (새 도큐먼트가 왼쪽에서 들어오고, 이전 도큐먼트가 오른쪽으로 빠진다)
// - pop / 뒤로가기 의미.
//==============================================================================
export class SlideRightTransition extends Transition {
	constructor() {
		super({ defaultDurationMs: 300 });
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildEnterKeyframes() {
		return [
			{ transform: "translateX(-100%)" },
			{ transform: "translateX(0%)" }
		];
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildExitKeyframes() {
		return [
			{ transform: "translateX(0%)" },
			{ transform: "translateX(100%)" }
		];
	}
}


//==============================================================================
// 스케일 인 트랜지션. (새 도큐먼트가 살짝 축소된 상태에서 페이드 인)
//==============================================================================
export class ScaleInTransition extends Transition {
	constructor() {
		super({ defaultDurationMs: 250 });
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildEnterKeyframes() {
		return [
			{ opacity: "0", transform: "scale(0.95)" },
			{ opacity: "1", transform: "scale(1)" }
		];
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildExitKeyframes() {
		return [
			{ opacity: "1", transform: "scale(1)" },
			{ opacity: "0", transform: "scale(1.05)" }
		];
	}
}


//==============================================================================
// 푸시 업 트랜지션. (새 도큐먼트가 아래에서 위로 올라오고, 이전 도큐먼트가 위로 빠진다)
//==============================================================================
export class PushUpTransition extends Transition {
	constructor() {
		super({ defaultDurationMs: 300 });
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildEnterKeyframes() {
		return [
			{ transform: "translateY(100%)" },
			{ transform: "translateY(0%)" }
		];
	}

	/**
	 * @override
	 * @returns { Array<object> }
	 */
	buildExitKeyframes() {
		return [
			{ transform: "translateY(0%)" },
			{ transform: "translateY(-100%)" }
		];
	}
}


//==============================================================================
// 트랜지션 이름 → Transition 인스턴스 매핑.
// - 사용자는 문자열로 트랜지션을 지정하고 DocumentManager 가 본 함수로 인스턴스를 얻는다.
// - Transition 서브클래스 인스턴스가 직접 전달되면 그대로 반환한다.
//==============================================================================
/**
 * @param { string | Transition } transitionNameOrInstance
 * @returns { Transition }
 */
export function resolveTransition(transitionNameOrInstance) {
	if (transitionNameOrInstance instanceof Transition) {
		return transitionNameOrInstance;
	}
	const transitionName = transitionNameOrInstance ?? "none";
	if (transitionName === "none") {
		return new NoneTransition();
	}
	if (transitionName === "fade") {
		return new FadeTransition();
	}
	if (transitionName === "slide-left") {
		return new SlideLeftTransition();
	}
	if (transitionName === "slide-right") {
		return new SlideRightTransition();
	}
	if (transitionName === "scale-in") {
		return new ScaleInTransition();
	}
	if (transitionName === "push-up") {
		return new PushUpTransition();
	}
	throw new System.Error(`알 수 없는 트랜지션 이름: ${transitionName}`);
}
