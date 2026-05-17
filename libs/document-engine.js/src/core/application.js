//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";
import { Element } from "./element.js";
import { DocumentManager } from "./documentmanager.js";


//==============================================================================
// 애플리케이션.
// - 부트스트랩과 루트 Element 셋업을 담당한다.
//==============================================================================
export class Application extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @static @type { Application | null } */ static #instance = null;
	/** @private @type { Element | null } */ #rootElement;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 */
	constructor() {
		super();
		this.#rootElement = null;
	}

	//==============================================================================
	// 공유 인스턴스 반환.
	//==============================================================================
	/**
	 * @returns { Application }
	 */
	static getInstance() {
		if (Application.#instance === null) {
			Application.#instance = new Application();
		}
		return Application.#instance;
	}

	//==============================================================================
	// 루트 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getRootElement() {
		return this.#rootElement;
	}

	//==============================================================================
	// 실행.
	// - 지정한 HTML 컨테이너 위에 루트 Element 를 마운트한다.
	// - 초기 도큐먼트를 생성해 DocumentManager 에 등록한다.
	//==============================================================================
	/**
	 * @param { object } options
	 * @param { string } options.containerElementId
	 * @param { Function } options.initialDocumentClass
	 */
	run(options) {
		const containerElementId = options.containerElementId;
		const initialDocumentClass = options.initialDocumentClass;

		const containerHtmlElement = System.document.getElementById(containerElementId);
		if (containerHtmlElement === null) {
			throw new System.Error(`'#${containerElementId}' 컨테이너를 찾을 수 없습니다.`);
		}

		const rootElement = new Element("div");
		rootElement.setName("Root");
		rootElement.setStyle({
			position: "absolute",
			left: "0",
			top: "0",
			width: "100%",
			height: "100%",
			boxSizing: "border-box"
		});
		const rootHtmlElement = rootElement.getHtmlElement();
		containerHtmlElement.appendChild(rootHtmlElement);
		this.#rootElement = rootElement;

		const documentManager = DocumentManager.getInstance();
		documentManager.setRootElement(rootElement);

		const initialDocument = new initialDocumentClass();
		documentManager.replace(initialDocument);
	}
}
