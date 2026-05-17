//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Scene, SceneManager, DomLayout, DomNode } from "../../../libs/dom.js/import.js";


//==============================================================================
// 상황극 선택 씬.
// - assets/data/books.json 을 로드해 카드 목록으로 보여준다.
// - 카드 클릭 시 PlayScene 인스턴스를 생성해 진입한다.
//==============================================================================
export class SelectScene extends Scene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { DomNode | null } */ #listContainerNode;
	/** @private @type { DomNode | null } */ #statusNode;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 */
	constructor() {
		super();
		this.setName("SelectScene");
		this.#listContainerNode = null;
		this.#statusNode = null;
	}

	//==============================================================================
	// 리스트 컨테이너 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getListContainerNode() {
		return this.#listContainerNode;
	}

	//==============================================================================
	// 상태 텍스트 노드 반환.
	//==============================================================================
	/**
	 * @returns { DomNode | null }
	 */
	getStatusNode() {
		return this.#statusNode;
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	/**
	 * @override
	 */
	onEnter() {
		this.buildUI();
		this.loadBooks();
	}

	//==============================================================================
	// UI 구성.
	//==============================================================================
	buildUI() {
		DomLayout.create("div")
			.style({
				position: "absolute",
				left: "0",
				top: "0",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column"
			})
			.children(
				DomLayout.create("div")
					.style({
						flex: "0 0 auto",
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						padding: "12px 20px",
						borderBottom: "1px solid #333333",
						backgroundColor: "#252526",
						gap: "12px"
					})
					.children(
						DomLayout.create("button")
							.text("← 뒤로")
							.style({
								padding: "6px 12px",
								fontSize: "13px",
								color: "#cccccc",
								backgroundColor: "#3c3c3c",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer"
							})
							.on("click", () => {
								this.handleBackClick();
							}),
						DomLayout.create("div")
							.text("상황극 선택")
							.style({
								fontSize: "16px",
								fontWeight: "bold",
								color: "#ffffff"
							}),
						DomLayout.create("div")
							.text("")
							.style({
								marginLeft: "auto",
								fontSize: "12px",
								color: "#888888"
							})
							.bind((node) => {
								this.#statusNode = node;
							})
					),
				DomLayout.create("div")
					.style({
						flex: "1 1 auto",
						overflowY: "auto",
						padding: "20px",
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
						gap: "16px",
						alignContent: "start"
					})
					.bind((node) => {
						this.#listContainerNode = node;
					})
			)
			.build(this);
	}

	//==============================================================================
	// 책 데이터 로드.
	//==============================================================================
	async loadBooks() {
		this.setStatusText("불러오는 중...");
		try {
			const response = await System.fetch("./assets/data/books.json");
			if (!response.ok) {
				throw new System.Error(`books.json 로드 실패 (${response.status})`);
			}
			const data = await response.json();
			const books = data.books ?? [];
			this.renderBooks(books);
			this.setStatusText(`${books.length}편`);
		}
		catch (error) {
			const errorText = error && error.message ? error.message : System.String(error);
			this.setStatusText(`오류: ${errorText}`);
		}
	}

	//==============================================================================
	// 책 카드 렌더링.
	//==============================================================================
	/**
	 * @param { Array<object> } books
	 */
	renderBooks(books) {
		const listContainerNode = this.getListContainerNode();
		for (const book of books) {
			this.appendBookCard(book, listContainerNode);
		}
	}

	//==============================================================================
	// 단일 책 카드 추가.
	//==============================================================================
	/**
	 * @param { object } book
	 * @param { DomNode } parentNode
	 */
	appendBookCard(book, parentNode) {
		const bookTitle = book.title ?? "(제목 없음)";
		const bookAuthor = book.author ?? "";
		const bookDescription = book.description ?? "";

		DomLayout.create("div")
			.style({
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				padding: "16px",
				backgroundColor: "#2a2a2c",
				border: "1px solid #3c3c3c",
				borderRadius: "8px",
				cursor: "pointer",
				transition: "background-color 0.15s"
			})
			.on("mouseenter", (event) => {
				event.currentTarget.style.backgroundColor = "#34343a";
			})
			.on("mouseleave", (event) => {
				event.currentTarget.style.backgroundColor = "#2a2a2c";
			})
			.on("click", () => {
				this.handleBookClick(book);
			})
			.children(
				DomLayout.create("div")
					.text(bookTitle)
					.style({
						fontSize: "16px",
						fontWeight: "bold",
						color: "#ffffff"
					}),
				DomLayout.create("div")
					.text(bookAuthor)
					.style({
						fontSize: "12px",
						color: "#888888"
					}),
				DomLayout.create("div")
					.text(bookDescription)
					.style({
						fontSize: "13px",
						lineHeight: "1.5",
						color: "#cccccc",
						marginTop: "4px"
					})
			)
			.build(parentNode);
	}

	//==============================================================================
	// 상태 텍스트 설정.
	//==============================================================================
	/**
	 * @param { string } text
	 */
	setStatusText(text) {
		const statusNode = this.getStatusNode();
		statusNode.setText(text);
	}

	//==============================================================================
	// 책 카드 클릭 처리.
	//==============================================================================
	/**
	 * @param { object } book
	 */
	async handleBookClick(book) {
		const timestamp = System.Date.now();
		const randomSuffix = System.Math.random().toString(36).substring(2, 8);
		const slotId = `${timestamp}_${randomSuffix}`;
		const { PlayScene } = await import("./playscene.js");
		const playScene = new PlayScene({ book: book, slotId: slotId });
		SceneManager.getInstance().replace(playScene);
	}

	//==============================================================================
	// 뒤로가기 처리.
	//==============================================================================
	async handleBackClick() {
		const { TitleScene } = await import("./titlescene.js");
		const titleScene = new TitleScene();
		SceneManager.getInstance().replace(titleScene);
	}
}
