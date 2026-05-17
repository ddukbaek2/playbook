//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";
import { Element } from "./element.js";


//==============================================================================
// Element 레이아웃 빌더.
// - 지역 변수 없이 Element 계층 구조를 선언적으로 구성하는 플루언트 빌더.
//
// 사용 예:
//   const panel = Layout.create("div")
//       .name("chat-panel")
//       .style({ padding: "10px", color: "#fff" })
//       .children(
//           Layout.create("button")
//               .text("시작")
//               .on("click", (event) => { ... })
//       )
//       .build();
//==============================================================================
export class Layout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Element } */ #element;
	/** @private @type { Layout[] } */ #childLayouts;
	/** @private @type { Element | null } */ #parentElement;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { Function } [elementClass]
	 * @param { string } [tagName]
	 */
	constructor(elementClass, tagName) {
		super();
		const ElementClass = elementClass ?? Element;
		this.#element = new ElementClass(tagName);
		this.#childLayouts = [];
		this.#parentElement = null;
	}

	//==============================================================================
	// 레이아웃 인스턴스 생성. (기본 Element + 태그명 지정)
	//==============================================================================
	/**
	 * @param { string } [tagName]
	 * @returns { Layout }
	 */
	static create(tagName = "div") {
		const layout = new Layout(Element, tagName);
		return layout;
	}

	//==============================================================================
	// 레이아웃 인스턴스 생성. (커스텀 Element 서브클래스)
	//==============================================================================
	/**
	 * @param { Function } elementClass
	 * @param { string } [tagName]
	 * @returns { Layout }
	 */
	static createWith(elementClass, tagName) {
		const layout = new Layout(elementClass, tagName);
		return layout;
	}

	//==============================================================================
	// 빌드 대상 Element 직접 접근.
	//==============================================================================
	/**
	 * @param { Function } callback
	 * @returns { Layout }
	 */
	apply(callback) {
		callback(this.#element);
		return this;
	}

	//==============================================================================
	// 활성화 설정.
	//==============================================================================
	/**
	 * @param { boolean } active
	 * @returns { Layout }
	 */
	active(active) {
		this.#element.setActive(active);
		return this;
	}

	//==============================================================================
	// 이름 설정.
	//==============================================================================
	/**
	 * @param { string } name
	 * @returns { Layout }
	 */
	name(name) {
		this.#element.setName(name);
		return this;
	}

	//==============================================================================
	// 텍스트 설정.
	//==============================================================================
	/**
	 * @param { string } text
	 * @returns { Layout }
	 */
	text(text) {
		this.#element.setText(text);
		return this;
	}

	//==============================================================================
	// 스타일 설정.
	//==============================================================================
	/**
	 * @param { object } styleObject
	 * @returns { Layout }
	 */
	style(styleObject) {
		this.#element.setStyle(styleObject);
		return this;
	}

	//==============================================================================
	// 클래스 추가.
	//==============================================================================
	/**
	 * @param { string } className
	 * @returns { Layout }
	 */
	addClass(className) {
		this.#element.addClass(className);
		return this;
	}

	//==============================================================================
	// 속성 설정.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { string } value
	 * @returns { Layout }
	 */
	attr(key, value) {
		this.#element.setAttribute(key, value);
		return this;
	}

	//==============================================================================
	// 이벤트 리스너 등록.
	//==============================================================================
	/**
	 * @param { string } eventName
	 * @param { Function } callback
	 * @returns { Layout }
	 */
	on(eventName, callback) {
		this.#element.on(eventName, callback);
		return this;
	}

	//==============================================================================
	// 자식 레이아웃 추가.
	//==============================================================================
	/**
	 * @param { ...Layout } layouts
	 * @returns { Layout }
	 */
	children(...layouts) {
		for (const layout of layouts) {
			this.#childLayouts.push(layout);
		}
		return this;
	}

	//==============================================================================
	// 부모 Element 설정.
	//==============================================================================
	/**
	 * @param { Element } parentElement
	 * @returns { Layout }
	 */
	parent(parentElement) {
		this.#parentElement = parentElement;
		return this;
	}

	//==============================================================================
	// 빌드 후 Element 외부 참조용 콜백 호출.
	//==============================================================================
	/**
	 * @param { Function } callback
	 * @returns { Layout }
	 */
	bind(callback) {
		callback(this.#element);
		return this;
	}

	//==============================================================================
	// 빌드.
	// - 자식 레이아웃을 재귀적으로 빌드한다.
	// - parent 인자나 parent() 로 지정한 부모가 있으면 자식으로 추가한다.
	//==============================================================================
	/**
	 * @param { Element } [parent]
	 * @returns { Element }
	 */
	build(parent) {
		const childLayouts = this.#childLayouts;
		for (const childLayout of childLayouts) {
			childLayout.build(this.#element);
		}
		const targetParent = parent ?? this.#parentElement;
		if (targetParent) {
			targetParent.addChild(this.#element);
		}
		return this.#element;
	}
}
