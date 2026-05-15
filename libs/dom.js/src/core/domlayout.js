//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";
import { DomNode } from "./domnode.js";


//==============================================================================
// DOM 노드 레이아웃 빌더.
// - 지역 변수 없이 DOM 계층 구조를 선언적으로 구성하는 플루언트 빌더.
//
// 사용 예:
//   const panel = DomLayout.create("div")
//       .name("chat-panel")
//       .style({ padding: "10px", color: "#fff" })
//       .children(
//           DomLayout.create("button")
//               .text("시작")
//               .on("click", (event) => { ... })
//       )
//       .build();
//==============================================================================
export class DomLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { DomNode } */ #node;
	/** @private @type { DomLayout[] } */ #childLayouts;
	/** @private @type { DomNode | null } */ #parentNode;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { Function } [nodeClass]
	 * @param { string } [tagName]
	 */
	constructor(nodeClass, tagName) {
		super();
		const NodeClass = nodeClass ?? DomNode;
		this.#node = new NodeClass(tagName);
		this.#childLayouts = [];
		this.#parentNode = null;
	}

	//==============================================================================
	// 레이아웃 인스턴스 생성. (기본 DomNode + 태그명 지정)
	//==============================================================================
	/**
	 * @param { string } [tagName]
	 * @returns { DomLayout }
	 */
	static create(tagName = "div") {
		const domLayout = new DomLayout(DomNode, tagName);
		return domLayout;
	}

	//==============================================================================
	// 레이아웃 인스턴스 생성. (커스텀 DomNode 서브클래스)
	//==============================================================================
	/**
	 * @param { Function } nodeClass
	 * @param { string } [tagName]
	 * @returns { DomLayout }
	 */
	static createWith(nodeClass, tagName) {
		const domLayout = new DomLayout(nodeClass, tagName);
		return domLayout;
	}

	//==============================================================================
	// 빌드 대상 노드 직접 접근.
	//==============================================================================
	/**
	 * @param { Function } callback
	 * @returns { DomLayout }
	 */
	apply(callback) {
		callback(this.#node);
		return this;
	}

	//==============================================================================
	// 활성화 설정.
	//==============================================================================
	/**
	 * @param { boolean } active
	 * @returns { DomLayout }
	 */
	active(active) {
		this.#node.setActive(active);
		return this;
	}

	//==============================================================================
	// 이름 설정.
	//==============================================================================
	/**
	 * @param { string } name
	 * @returns { DomLayout }
	 */
	name(name) {
		this.#node.setName(name);
		return this;
	}

	//==============================================================================
	// 텍스트 설정.
	//==============================================================================
	/**
	 * @param { string } text
	 * @returns { DomLayout }
	 */
	text(text) {
		this.#node.setText(text);
		return this;
	}

	//==============================================================================
	// 스타일 설정.
	//==============================================================================
	/**
	 * @param { object } styleObject
	 * @returns { DomLayout }
	 */
	style(styleObject) {
		this.#node.setStyle(styleObject);
		return this;
	}

	//==============================================================================
	// 클래스 추가.
	//==============================================================================
	/**
	 * @param { string } className
	 * @returns { DomLayout }
	 */
	addClass(className) {
		this.#node.addClass(className);
		return this;
	}

	//==============================================================================
	// 속성 설정.
	//==============================================================================
	/**
	 * @param { string } key
	 * @param { string } value
	 * @returns { DomLayout }
	 */
	attr(key, value) {
		this.#node.setAttribute(key, value);
		return this;
	}

	//==============================================================================
	// 이벤트 리스너 등록.
	//==============================================================================
	/**
	 * @param { string } eventName
	 * @param { Function } callback
	 * @returns { DomLayout }
	 */
	on(eventName, callback) {
		this.#node.on(eventName, callback);
		return this;
	}

	//==============================================================================
	// 자식 레이아웃 추가.
	//==============================================================================
	/**
	 * @param { ...DomLayout } layouts
	 * @returns { DomLayout }
	 */
	children(...layouts) {
		for (const layout of layouts) {
			this.#childLayouts.push(layout);
		}
		return this;
	}

	//==============================================================================
	// 부모 노드 설정.
	//==============================================================================
	/**
	 * @param { DomNode } parentNode
	 * @returns { DomLayout }
	 */
	parent(parentNode) {
		this.#parentNode = parentNode;
		return this;
	}

	//==============================================================================
	// 빌드 후 노드 외부 참조용 콜백 호출.
	//==============================================================================
	/**
	 * @param { Function } callback
	 * @returns { DomLayout }
	 */
	bind(callback) {
		callback(this.#node);
		return this;
	}

	//==============================================================================
	// 빌드.
	// - 자식 레이아웃을 재귀적으로 빌드한다.
	// - parent 인자나 parent() 로 지정한 부모가 있으면 자식으로 추가한다.
	//==============================================================================
	/**
	 * @param { DomNode } [parent]
	 * @returns { DomNode }
	 */
	build(parent) {
		const childLayouts = this.#childLayouts;
		for (const childLayout of childLayouts) {
			childLayout.build(this.#node);
		}
		const targetParent = parent ?? this.#parentNode;
		if (targetParent) {
			targetParent.addChild(this.#node);
		}
		return this.#node;
	}
}
