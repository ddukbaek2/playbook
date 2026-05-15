//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";
import { DomNode } from "./domnode.js";
import { SceneManager } from "./scenemanager.js";


//==============================================================================
// 애플리케이션.
// - 부트스트랩과 루트 노드 셋업을 담당한다.
//==============================================================================
export class Application extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @static @type { Application | null } */ static #instance = null;
	/** @private @type { DomNode | null } */ #rootNode;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 */
	constructor() {
		super();
		this.#rootNode = null;
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
	// 루트 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getRootNode() {
		return this.#rootNode;
	}

	//==============================================================================
	// 실행.
	// - 지정한 HTML 컨테이너 위에 루트 DomNode 를 마운트한다.
	// - 초기 씬을 생성해 SceneManager 에 등록한다.
	//==============================================================================
	/**
	 * @param { object } options
	 * @param { string } options.containerElementId
	 * @param { Function } options.initialSceneClass
	 */
	run(options) {
		const containerElementId = options.containerElementId;
		const initialSceneClass = options.initialSceneClass;

		const containerElement = System.document.getElementById(containerElementId);
		if (containerElement === null) {
			throw new System.Error(`'#${containerElementId}' 컨테이너를 찾을 수 없습니다.`);
		}

		const rootNode = new DomNode("div");
		rootNode.setName("Root");
		rootNode.setStyle({
			position: "absolute",
			left: "0",
			top: "0",
			width: "100%",
			height: "100%",
			boxSizing: "border-box"
		});
		const rootElement = rootNode.getElement();
		containerElement.appendChild(rootElement);
		this.#rootNode = rootNode;

		const sceneManager = SceneManager.getInstance();
		sceneManager.setRootNode(rootNode);

		const initialScene = new initialSceneClass();
		sceneManager.replace(initialScene);
	}
}
