//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";


//==============================================================================
// 씬 매니저.
// - 한 번에 하나의 씬만 활성화한다.
// - 루트 노드(DomNode) 의 자식으로 씬을 붙이고, 교체 시 이전 씬은 파괴한다.
//==============================================================================
export class SceneManager extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @static @type { SceneManager | null } */ static #instance = null;
	/** @private @type { import("./domnode.js").DomNode | null } */ #rootNode;
	/** @private @type { import("./scene.js").Scene | null } */ #currentScene;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 */
	constructor() {
		super();
		this.#rootNode = null;
		this.#currentScene = null;
	}

	//==============================================================================
	// 공유 인스턴스 반환.
	//==============================================================================
	/**
	 * @returns { SceneManager }
	 */
	static getInstance() {
		if (SceneManager.#instance === null) {
			SceneManager.#instance = new SceneManager();
		}
		return SceneManager.#instance;
	}

	//==============================================================================
	// 루트 노드 설정.
	//==============================================================================
	/**
	 * @param { import("./domnode.js").DomNode } rootNode
	 */
	setRootNode(rootNode) {
		this.#rootNode = rootNode;
	}

	//==============================================================================
	// 루트 노드 반환.
	//==============================================================================
	/**
	 * @returns { import("./domnode.js").DomNode | null }
	 */
	getRootNode() {
		return this.#rootNode;
	}

	//==============================================================================
	// 현재 씬 반환.
	//==============================================================================
	/**
	 * @returns { import("./scene.js").Scene | null }
	 */
	getCurrentScene() {
		return this.#currentScene;
	}

	//==============================================================================
	// 씬 교체.
	// - 기존 씬은 onExit 호출 후 파괴된다.
	// - 새 씬은 루트 노드의 자식으로 추가되고 onEnter 가 호출된다.
	//==============================================================================
	/**
	 * @param { import("./scene.js").Scene } scene
	 */
	replace(scene) {
		const rootNode = this.getRootNode();
		if (rootNode === null) {
			throw new System.Error("SceneManager 의 루트 노드가 설정되지 않았습니다.");
		}

		const currentScene = this.getCurrentScene();
		if (currentScene !== null) {
			currentScene.onExit();
			currentScene.destroy();
		}

		this.#currentScene = scene;
		rootNode.addChild(scene);
		scene.onEnter();
	}
}
