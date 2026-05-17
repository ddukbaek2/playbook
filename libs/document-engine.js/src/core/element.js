//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";


//==============================================================================
// HTML 요소 래퍼.
// - HTMLElement 를 1:1 로 소유하며 부모/자식 관계를 Element 트리와 DOM 양쪽에서 동기화한다.
// - 화면 단위인 Document 도 본 클래스를 상속한다.
//==============================================================================
export class Element extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { HTMLElement } */ #htmlElement;
	/** @private @type { Element | null } */ #parent;
	/** @private @type { Element[] } */ #children;
	/** @private @type { string } */ #name;
	/** @private @type { boolean } */ #isActive;
	/** @private @type { Map<string, Function[]> } */ #eventListeners;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { string } [tagName]
	 */
	constructor(tagName = "div") {
		super();
		this.#htmlElement = System.document.createElement(tagName);
		this.#parent = null;
		this.#children = [];
		this.#name = "";
		this.#isActive = true;
		this.#eventListeners = new System.Map();
	}

	//==============================================================================
	// 내부 HTMLElement 반환.
	//==============================================================================
	/**
	 * @returns { HTMLElement }
	 */
	getHtmlElement() {
		return this.#htmlElement;
	}

	//==============================================================================
	// 부모 설정.
	//==============================================================================
	/**
	 * @param { Element | null } parent
	 */
	setParent(parent) {
		if (this === parent) {
			throw new System.Error("자기 자신을 부모로 지정할 수 없습니다.");
		}

		const currentParent = this.getParent();
		if (currentParent) {
			if (currentParent === parent) {
				return;
			}
			const currentParentChildren = currentParent.getChildren();
			const childIndex = currentParentChildren.indexOf(this);
			if (childIndex !== -1) {
				currentParentChildren.splice(childIndex, 1);
			}
			const currentHtmlElement = this.getHtmlElement();
			const currentParentHtmlElement = currentParent.getHtmlElement();
			if (currentHtmlElement.parentElement === currentParentHtmlElement) {
				currentParentHtmlElement.removeChild(currentHtmlElement);
			}
			this.#parent = null;
		}

		if (parent) {
			this.#parent = parent;
			const newParentChildren = parent.getChildren();
			newParentChildren.push(this);
			const htmlElement = this.getHtmlElement();
			const newParentHtmlElement = parent.getHtmlElement();
			newParentHtmlElement.appendChild(htmlElement);
		}
	}

	//==============================================================================
	// 부모 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getParent() {
		return this.#parent;
	}

	//==============================================================================
	// 자식 추가.
	//==============================================================================
	/**
	 * @param { Element } child
	 */
	addChild(child) {
		child.setParent(this);
	}

	//==============================================================================
	// 자식 제거.
	//==============================================================================
	/**
	 * @param { Element } child
	 */
	removeChild(child) {
		const hasChild = this.hasChild(child);
		if (hasChild) {
			child.setParent(null);
		}
	}

	//==============================================================================
	// 모든 자식 제거.
	//==============================================================================
	removeChildren() {
		const children = this.getChildren();
		while (children.length > 0) {
			const child = children[0];
			this.removeChild(child);
		}
	}

	//==============================================================================
	// 자식 목록 반환.
	//==============================================================================
	/**
	 * @returns { Element[] }
	 */
	getChildren() {
		return this.#children;
	}

	//==============================================================================
	// 자식 포함 여부 반환.
	//==============================================================================
	/**
	 * @param { Element } child
	 * @returns { boolean }
	 */
	hasChild(child) {
		const children = this.getChildren();
		const childIndex = children.indexOf(child);
		return childIndex !== -1;
	}

	//==============================================================================
	// 이름 설정.
	//==============================================================================
	/**
	 * @param { string } name
	 */
	setName(name) {
		this.#name = name;
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
	// 활성 상태 설정.
	// - 비활성 시 element.style.display = "none" 으로 숨김 처리.
	//==============================================================================
	/**
	 * @param { boolean } active
	 */
	setActive(active) {
		this.#isActive = active;
		const htmlElement = this.getHtmlElement();
		if (active) {
			htmlElement.style.display = "";
		}
		else {
			htmlElement.style.display = "none";
		}
	}

	//==============================================================================
	// 활성 상태 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isActive() {
		return this.#isActive;
	}

	//==============================================================================
	// 텍스트 설정.
	//==============================================================================
	/**
	 * @param { string } text
	 */
	setText(text) {
		const htmlElement = this.getHtmlElement();
		htmlElement.textContent = text;
	}

	//==============================================================================
	// 스타일 일괄 설정.
	//==============================================================================
	/**
	 * @param { object } styleObject
	 */
	setStyle(styleObject) {
		const htmlElement = this.getHtmlElement();
		const keys = System.Object.keys(styleObject);
		for (const key of keys) {
			const value = styleObject[key];
			htmlElement.style[key] = value;
		}
	}

	//==============================================================================
	// 클래스 추가.
	//==============================================================================
	/**
	 * @param { string } className
	 */
	addClass(className) {
		const htmlElement = this.getHtmlElement();
		htmlElement.classList.add(className);
	}

	//==============================================================================
	// 클래스 제거.
	//==============================================================================
	/**
	 * @param { string } className
	 */
	removeClass(className) {
		const htmlElement = this.getHtmlElement();
		htmlElement.classList.remove(className);
	}

	//==============================================================================
	// 속성 설정.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { string } value
	 */
	setAttribute(key, value) {
		const htmlElement = this.getHtmlElement();
		htmlElement.setAttribute(key, value);
	}

	//==============================================================================
	// 이벤트 리스너 등록.
	//==============================================================================
	/**
	 * @param { string } eventName
	 * @param { Function } callback
	 */
	on(eventName, callback) {
		const htmlElement = this.getHtmlElement();
		htmlElement.addEventListener(eventName, callback);
		const eventListeners = this.#eventListeners;
		if (!eventListeners.has(eventName)) {
			eventListeners.set(eventName, []);
		}
		const callbackList = eventListeners.get(eventName);
		callbackList.push(callback);
	}

	//==============================================================================
	// 이벤트 리스너 해제.
	//==============================================================================
	/**
	 * @param { string } eventName
	 * @param { Function } callback
	 */
	off(eventName, callback) {
		const htmlElement = this.getHtmlElement();
		htmlElement.removeEventListener(eventName, callback);
		const eventListeners = this.#eventListeners;
		if (eventListeners.has(eventName)) {
			const callbackList = eventListeners.get(eventName);
			const callbackIndex = callbackList.indexOf(callback);
			if (callbackIndex !== -1) {
				callbackList.splice(callbackIndex, 1);
			}
		}
	}

	//==============================================================================
	// 입력 값 반환. (input, textarea 전용)
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getValue() {
		const htmlElement = this.getHtmlElement();
		return htmlElement.value ?? "";
	}

	//==============================================================================
	// 입력 값 설정. (input, textarea 전용)
	//==============================================================================
	/**
	 * @param { string } value
	 */
	setValue(value) {
		const htmlElement = this.getHtmlElement();
		htmlElement.value = value;
	}

	//==============================================================================
	// 파괴.
	//==============================================================================
	/**
	 * @override
	 */
	destroy() {
		const isDestroyed = this.isDestroyed();
		if (isDestroyed) {
			return;
		}

		this.removeChildren();

		const eventListeners = this.#eventListeners;
		const htmlElement = this.getHtmlElement();
		for (const [eventName, callbackList] of eventListeners) {
			for (const callback of callbackList) {
				htmlElement.removeEventListener(eventName, callback);
			}
		}
		eventListeners.clear();

		const parent = this.getParent();
		if (parent) {
			parent.removeChild(this);
		}

		super.destroy();
	}
}
