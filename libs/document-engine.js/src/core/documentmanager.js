//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";
import { resolveTransition } from "./transition.js";


//==============================================================================
// 도큐먼트 매니저.
// - 도큐먼트 스택을 보유하며 push / pop / replace 로 화면을 전환한다.
// - 전환 시 옵션으로 트랜지션 이름과 지속시간을 지정할 수 있다.
// - 트랜지션 진행 중 추가 전환 요청이 들어오면 큐로 직렬화된다.
//==============================================================================
export class DocumentManager extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @static @type { DocumentManager | null } */ static #instance = null;
	/** @private @type { import("./element.js").Element | null } */ #rootElement;
	/** @private @type { Array<import("./document.js").Document> } */ #documentStack;
	/** @private @type { boolean } */ #isTransitioning;
	/** @private @type { Array<Function> } */ #pendingActions;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 */
	constructor() {
		super();
		this.#rootElement = null;
		this.#documentStack = [];
		this.#isTransitioning = false;
		this.#pendingActions = [];
	}

	//==============================================================================
	// 공유 인스턴스 반환.
	//==============================================================================
	/**
	 * @returns { DocumentManager }
	 */
	static getInstance() {
		if (DocumentManager.#instance === null) {
			DocumentManager.#instance = new DocumentManager();
		}
		return DocumentManager.#instance;
	}

	//==============================================================================
	// 루트 Element 설정. (Application 이 부트스트랩 시 호출)
	//==============================================================================
	/**
	 * @param { import("./element.js").Element } rootElement
	 */
	setRootElement(rootElement) {
		this.#rootElement = rootElement;
	}

	//==============================================================================
	// 루트 Element 반환.
	//==============================================================================
	/**
	 * @returns { import("./element.js").Element | null }
	 */
	getRootElement() {
		return this.#rootElement;
	}

	//==============================================================================
	// 현재 활성 도큐먼트 반환. (없으면 null)
	//==============================================================================
	/**
	 * @returns { import("./document.js").Document | null }
	 */
	getCurrentDocument() {
		const documentStack = this.#documentStack;
		if (documentStack.length === 0) {
			return null;
		}
		return documentStack[documentStack.length - 1];
	}

	//==============================================================================
	// 도큐먼트 스택 깊이 반환.
	//==============================================================================
	/**
	 * @returns { number }
	 */
	getStackDepth() {
		return this.#documentStack.length;
	}

	//==============================================================================
	// 전환 진행 여부 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isTransitioning() {
		return this.#isTransitioning;
	}

	//==============================================================================
	// 도큐먼트 push.
	// - 새 도큐먼트를 스택 위에 올리고 enter 트랜지션을 재생한다.
	// - 이전 도큐먼트는 스택에 남아 있으며 exit 트랜지션 후 DOM 에서만 분리된다.
	//==============================================================================
	/**
	 * @param { import("./document.js").Document } document
	 * @param { object } [options]
	 * @param { string | import("./transition.js").Transition } [options.transition]
	 * @param { number } [options.duration]
	 * @returns { Promise<void> }
	 */
	push(document, options) {
		return this.enqueueAction(() => this.performPush(document, options));
	}

	//==============================================================================
	// 도큐먼트 pop.
	// - 스택 최상단 도큐먼트를 제거하고 그 아래 도큐먼트를 노출한다.
	// - 스택 깊이가 1 이하이면 아무 동작도 하지 않는다.
	//==============================================================================
	/**
	 * @param { object } [options]
	 * @param { string | import("./transition.js").Transition } [options.transition]
	 * @param { number } [options.duration]
	 * @returns { Promise<void> }
	 */
	pop(options) {
		return this.enqueueAction(() => this.performPop(options));
	}

	//==============================================================================
	// 도큐먼트 replace.
	// - 현재 최상단 도큐먼트를 새 도큐먼트로 교체한다.
	// - 이전 도큐먼트는 onExit 후 파괴된다.
	//==============================================================================
	/**
	 * @param { import("./document.js").Document } document
	 * @param { object } [options]
	 * @param { string | import("./transition.js").Transition } [options.transition]
	 * @param { number } [options.duration]
	 * @returns { Promise<void> }
	 */
	replace(document, options) {
		return this.enqueueAction(() => this.performReplace(document, options));
	}

	//==============================================================================
	// 액션을 큐에 넣고 순차 실행.
	// - 트랜지션 도중 들어온 요청은 진행 중인 트랜지션이 끝난 뒤 차례대로 실행된다.
	//==============================================================================
	/**
	 * @param { Function } action
	 * @returns { Promise<void> }
	 */
	enqueueAction(action) {
		return new System.Promise((resolve, reject) => {
			const wrapped = async () => {
				try {
					await action();
					resolve();
				}
				catch (error) {
					reject(error);
				}
			};
			this.#pendingActions.push(wrapped);
			if (!this.#isTransitioning) {
				this.processNextAction();
			}
		});
	}

	//==============================================================================
	// 큐의 다음 액션을 실행.
	//==============================================================================
	async processNextAction() {
		const pendingActions = this.#pendingActions;
		if (pendingActions.length === 0) {
			return;
		}
		const nextAction = pendingActions.shift();
		this.#isTransitioning = true;
		try {
			await nextAction();
		}
		finally {
			this.#isTransitioning = false;
			if (pendingActions.length > 0) {
				this.processNextAction();
			}
		}
	}

	//==============================================================================
	// push 실제 수행.
	//==============================================================================
	/**
	 * @param { import("./document.js").Document } document
	 * @param { object } [options]
	 */
	async performPush(document, options) {
		const rootElement = this.getRootElement();
		if (rootElement === null) {
			throw new System.Error("DocumentManager 의 루트 Element 가 설정되지 않았습니다.");
		}

		const previousDocument = this.getCurrentDocument();
		this.#documentStack.push(document);

		const safeOptions = options ?? {};
		const transition = resolveTransition(safeOptions.transition ?? "none");
		const durationMs = safeOptions.duration ?? transition.getDefaultDurationMs();

		rootElement.addChild(document);
		document.onEnter();

		const animations = [];
		const documentHtmlElement = document.getHtmlElement();
		animations.push(transition.playEnter(documentHtmlElement, durationMs));
		if (previousDocument !== null) {
			const previousHtmlElement = previousDocument.getHtmlElement();
			animations.push(transition.playExit(previousHtmlElement, durationMs));
		}
		await System.Promise.all(animations);

		// push 의 경우 이전 도큐먼트는 스택에 남아 있어야 하지만, 화면을 점유하지 않도록 숨긴다.
		if (previousDocument !== null) {
			previousDocument.setActive(false);
		}
	}

	//==============================================================================
	// pop 실제 수행.
	//==============================================================================
	/**
	 * @param { object } [options]
	 */
	async performPop(options) {
		const documentStack = this.#documentStack;
		if (documentStack.length <= 1) {
			return;
		}

		const topDocument = documentStack[documentStack.length - 1];
		const beneathDocument = documentStack[documentStack.length - 2];

		const safeOptions = options ?? {};
		const transition = resolveTransition(safeOptions.transition ?? "none");
		const durationMs = safeOptions.duration ?? transition.getDefaultDurationMs();

		// pop 의 경우 아래 도큐먼트를 다시 활성화하고 DOM 에 살린다. (push 시 setActive(false) 만 했다)
		beneathDocument.setActive(true);
		const rootElement = this.getRootElement();
		if (rootElement !== null && !rootElement.hasChild(beneathDocument)) {
			rootElement.addChild(beneathDocument);
		}

		const animations = [];
		const topHtmlElement = topDocument.getHtmlElement();
		animations.push(transition.playExit(topHtmlElement, durationMs));
		const beneathHtmlElement = beneathDocument.getHtmlElement();
		animations.push(transition.playEnter(beneathHtmlElement, durationMs));
		await System.Promise.all(animations);

		documentStack.pop();
		topDocument.onExit();
		topDocument.destroy();
	}

	//==============================================================================
	// replace 실제 수행.
	//==============================================================================
	/**
	 * @param { import("./document.js").Document } document
	 * @param { object } [options]
	 */
	async performReplace(document, options) {
		const rootElement = this.getRootElement();
		if (rootElement === null) {
			throw new System.Error("DocumentManager 의 루트 Element 가 설정되지 않았습니다.");
		}

		const documentStack = this.#documentStack;
		const previousDocument = (documentStack.length > 0) ? documentStack[documentStack.length - 1] : null;

		const safeOptions = options ?? {};
		const transition = resolveTransition(safeOptions.transition ?? "none");
		const durationMs = safeOptions.duration ?? transition.getDefaultDurationMs();

		if (previousDocument !== null) {
			documentStack[documentStack.length - 1] = document;
		}
		else {
			documentStack.push(document);
		}

		rootElement.addChild(document);
		document.onEnter();

		const animations = [];
		const documentHtmlElement = document.getHtmlElement();
		animations.push(transition.playEnter(documentHtmlElement, durationMs));
		if (previousDocument !== null) {
			const previousHtmlElement = previousDocument.getHtmlElement();
			animations.push(transition.playExit(previousHtmlElement, durationMs));
		}
		await System.Promise.all(animations);

		if (previousDocument !== null) {
			previousDocument.onExit();
			previousDocument.destroy();
		}
	}
}
