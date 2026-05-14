//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";


//==============================================================================
// DOM 계층 노드.
// - HTMLElement 를 1:1 로 소유하며 부모/자식 관계를 노드와 DOM 양쪽에서 동기화한다.
//==============================================================================
export class DomNode extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { HTMLElement } */ #element;
	/** @private @type { DomNode | null } */ #parent;
	/** @private @type { DomNode[] } */ #children;
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
		this.#element = System.document.createElement(tagName);
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
	getElement() {
		return this.#element;
	}

	//==============================================================================
	// 부모 설정.
	//==============================================================================
	/**
	 * @param { DomNode | null } parent
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
			const currentElement = this.getElement();
			const currentParentElement = currentParent.getElement();
			if (currentElement.parentElement === currentParentElement) {
				currentParentElement.removeChild(currentElement);
			}
			this.#parent = null;
		}

		if (parent) {
			this.#parent = parent;
			const newParentChildren = parent.getChildren();
			newParentChildren.push(this);
			const element = this.getElement();
			const newParentElement = parent.getElement();
			newParentElement.appendChild(element);
		}
	}

	//==============================================================================
	// 부모 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getParent() {
		return this.#parent;
	}

	//==============================================================================
	// 자식 추가.
	//==============================================================================
	/**
	 * @param { DomNode } child
	 */
	addChild(child) {
		child.setParent(this);
	}

	//==============================================================================
	// 자식 제거.
	//==============================================================================
	/**
	 * @param { DomNode } child
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
	 * @returns { DomNode[] }
	 */
	getChildren() {
		return this.#children;
	}

	//==============================================================================
	// 자식 포함 여부 반환.
	//==============================================================================
	/**
	 * @param { DomNode } child
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
		const element = this.getElement();
		if (active) {
			element.style.display = "";
		}
		else {
			element.style.display = "none";
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
		const element = this.getElement();
		element.textContent = text;
	}

	//==============================================================================
	// 스타일 일괄 설정.
	//==============================================================================
	/**
	 * @param { object } styleObject
	 */
	setStyle(styleObject) {
		const element = this.getElement();
		const keys = System.Object.keys(styleObject);
		for (const key of keys) {
			const value = styleObject[key];
			element.style[key] = value;
		}
	}

	//==============================================================================
	// 클래스 추가.
	//==============================================================================
	/**
	 * @param { string } className
	 */
	addClass(className) {
		const element = this.getElement();
		element.classList.add(className);
	}

	//==============================================================================
	// 클래스 제거.
	//==============================================================================
	/**
	 * @param { string } className
	 */
	removeClass(className) {
		const element = this.getElement();
		element.classList.remove(className);
	}

	//==============================================================================
	// 속성 설정.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { string } value
	 */
	setAttribute(key, value) {
		const element = this.getElement();
		element.setAttribute(key, value);
	}

	//==============================================================================
	// 이벤트 리스너 등록.
	//==============================================================================
	/**
	 * @param { string } eventName
	 * @param { Function } callback
	 */
	on(eventName, callback) {
		const element = this.getElement();
		element.addEventListener(eventName, callback);
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
		const element = this.getElement();
		element.removeEventListener(eventName, callback);
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
		const element = this.getElement();
		return element.value ?? "";
	}

	//==============================================================================
	// 입력 값 설정. (input, textarea 전용)
	//==============================================================================
	/**
	 * @param { string } value
	 */
	setValue(value) {
		const element = this.getElement();
		element.value = value;
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
		const element = this.getElement();
		for (const [eventName, callbackList] of eventListeners) {
			for (const callback of callbackList) {
				element.removeEventListener(eventName, callback);
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
