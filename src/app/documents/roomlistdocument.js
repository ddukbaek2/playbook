//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Document, DocumentManager, Layout, Element, Storage } from "../../../libs/document-engine.js/import.js";


//==============================================================================
// 방 목록 도큐먼트. (이어하기)
// - localStorage 의 `playbook.slot.*` 키를 스캔해 저장된 방 카드 목록을 보여준다.
// - 각 카드에서 이어하기 / 삭제 가능.
//==============================================================================
export class RoomListDocument extends Document {
	//==============================================================================
	// 상수 목록.
	//==============================================================================
	/** @type { string } */ static SLOT_KEY_PREFIX = "playbook.slot.";

	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Element | null } */ #listContainerElement;
	/** @private @type { Element | null } */ #statusElement;
	/** @private @type { Array<object> } */ #booksCache;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.setName("RoomListDocument");
		this.#listContainerElement = null;
		this.#statusElement = null;
		this.#booksCache = [];
	}

	//==============================================================================
	// 리스트 컨테이너 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getListContainerElement() {
		return this.#listContainerElement;
	}

	//==============================================================================
	// 상태 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getStatusElement() {
		return this.#statusElement;
	}

	//==============================================================================
	// 책 캐시 반환.
	//==============================================================================
	/**
	 * @returns { Array<object> }
	 */
	getBooksCache() {
		return this.#booksCache;
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	/**
	 * @override
	 */
	onEnter() {
		this.buildUI();
		this.loadBooksAndRender();
	}

	//==============================================================================
	// UI 구성.
	//==============================================================================
	buildUI() {
		Layout.create("div")
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
				Layout.create("div")
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
						Layout.create("button")
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
						Layout.create("div")
							.text("이어하기")
							.style({
								fontSize: "16px",
								fontWeight: "bold",
								color: "#ffffff"
							}),
						Layout.create("div")
							.text("")
							.style({
								marginLeft: "auto",
								fontSize: "12px",
								color: "#888888"
							})
							.bind((element) => {
								this.#statusElement = element;
							})
					),
				Layout.create("div")
					.style({
						flex: "1 1 auto",
						overflowY: "auto",
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						alignContent: "start"
					})
					.bind((element) => {
						this.#listContainerElement = element;
					})
			)
			.build(this);
	}

	//==============================================================================
	// 책 데이터 + 슬롯 로드 후 렌더.
	//==============================================================================
	async loadBooksAndRender() {
		this.setStatusText("불러오는 중...");
		try {
			const response = await System.fetch("./assets/data/books.json");
			if (!response.ok) {
				throw new System.Error(`books.json 로드 실패 (${response.status})`);
			}
			const data = await response.json();
			this.#booksCache = data.books ?? [];
			this.renderSlots();
		}
		catch (error) {
			const errorText = error && error.message ? error.message : System.String(error);
			this.setStatusText(`오류: ${errorText}`);
		}
	}

	//==============================================================================
	// 슬롯 목록 로드.
	//==============================================================================
	/**
	 * @returns { Array<object> }
	 */
	loadSlots() {
		const slotKeys = Storage.getKeys(RoomListDocument.SLOT_KEY_PREFIX);
		const result = [];
		for (const slotKey of slotKeys) {
			const data = Storage.getJson(slotKey, null);
			if (data === null) {
				continue;
			}
			if (typeof data !== "object") {
				continue;
			}
			result.push(data);
		}
		result.sort((entryA, entryB) => {
			const aTime = entryA.lastPlayedAt ?? 0;
			const bTime = entryB.lastPlayedAt ?? 0;
			return bTime - aTime;
		});
		return result;
	}

	//==============================================================================
	// 슬롯 카드 렌더.
	//==============================================================================
	renderSlots() {
		const listContainerElement = this.getListContainerElement();
		listContainerElement.removeChildren();
		const slots = this.loadSlots();
		if (slots.length === 0) {
			Layout.create("div")
				.text("저장된 방이 없습니다. 타이틀에서 \"새로하기\" 로 시작해 보세요.")
				.style({
					fontSize: "14px",
					color: "#888888",
					padding: "20px",
					textAlign: "center"
				})
				.build(listContainerElement);
			this.setStatusText("");
			return;
		}
		for (const slot of slots) {
			this.appendSlotCard(slot, listContainerElement);
		}
		this.appendDeleteAllButton(listContainerElement);
		this.setStatusText(`${slots.length}개`);
	}

	//==============================================================================
	// 리스트 하단의 전체삭제 버튼 추가.
	//==============================================================================
	/**
	 * @param { Element } parentElement
	 */
	appendDeleteAllButton(parentElement) {
		Layout.create("div")
			.style({
				display: "flex",
				flexDirection: "row",
				justifyContent: "center",
				marginTop: "12px"
			})
			.children(
				Layout.create("button")
					.text("전체삭제")
					.style({
						padding: "10px 24px",
						fontSize: "13px",
						fontWeight: "bold",
						color: "#ffcccc",
						backgroundColor: "#5c2a2a",
						border: "1px solid #7a3a3a",
						borderRadius: "4px",
						cursor: "pointer"
					})
					.on("click", () => {
						this.handleDeleteAllClick();
					})
			)
			.build(parentElement);
	}

	//==============================================================================
	// 전체삭제 클릭 처리.
	// - 모든 playbook.slot.* 항목을 일괄 제거한다.
	//==============================================================================
	handleDeleteAllClick() {
		const confirmed = System.confirm("저장된 모든 방을 삭제할까요? 진행 기록이 전부 사라집니다.");
		if (!confirmed) {
			return;
		}
		const slotKeys = Storage.getKeys(RoomListDocument.SLOT_KEY_PREFIX);
		for (const slotKey of slotKeys) {
			Storage.remove(slotKey);
		}
		this.renderSlots();
	}

	//==============================================================================
	// 단일 슬롯 카드 추가.
	//==============================================================================
	/**
	 * @param { object } slot
	 * @param { Element } parentElement
	 */
	appendSlotCard(slot, parentElement) {
		const bookTitle = slot.bookTitle ?? "(제목 없음)";
		const createdAtText = this.formatTimestamp(slot.createdAt);
		const lastPlayedAtText = this.formatTimestamp(slot.lastPlayedAt);
		const currentEpisodeId = slot.currentEpisodeId ?? "";
		const slotId = slot.slotId;
		const turnCount = this.computeTurnCount(slot);

		Layout.create("div")
			.style({
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				padding: "16px",
				backgroundColor: "#2a2a2c",
				border: "1px solid #3c3c3c",
				borderRadius: "8px"
			})
			.children(
				Layout.create("div")
					.text(bookTitle)
					.style({
						fontSize: "16px",
						fontWeight: "bold",
						color: "#ffffff"
					}),
				Layout.create("div")
					.text(`시작 ${createdAtText} · 최근 ${lastPlayedAtText}`)
					.style({
						fontSize: "12px",
						color: "#888888"
					}),
				Layout.create("div")
					.text(`현재 화: ${currentEpisodeId} · ${turnCount}턴 진행`)
					.style({
						fontSize: "12px",
						color: "#aaaaaa"
					}),
				Layout.create("div")
					.style({
						display: "flex",
						flexDirection: "row",
						gap: "8px",
						marginTop: "8px"
					})
					.children(
						Layout.create("button")
							.text("이어하기")
							.style({
								flex: "1",
								padding: "8px 16px",
								fontSize: "13px",
								fontWeight: "bold",
								color: "#ffffff",
								backgroundColor: "#0e639c",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer"
							})
							.on("click", () => {
								this.handleContinueClick(slot);
							}),
						Layout.create("button")
							.text("삭제")
							.style({
								padding: "8px 16px",
								fontSize: "13px",
								color: "#ffcccc",
								backgroundColor: "#5c2a2a",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer"
							})
							.on("click", () => {
								this.handleDeleteClick(slot);
							})
					)
			)
			.build(parentElement);
	}

	//==============================================================================
	// 슬롯의 진행 턴 수 계산.
	// - messageHistory 의 model 응답 수가 곧 완료된 턴 수다.
	//==============================================================================
	/**
	 * @param { object } slot
	 * @returns { number }
	 */
	computeTurnCount(slot) {
		const messageHistory = slot.messageHistory ?? null;
		if (messageHistory === null) {
			return 0;
		}
		if (!System.Array.isArray(messageHistory)) {
			return 0;
		}
		let turnCount = 0;
		for (const entry of messageHistory) {
			if (entry.role === "model") {
				turnCount = turnCount + 1;
			}
		}
		return turnCount;
	}

	//==============================================================================
	// 타임스탬프 포맷. (YYYY-MM-DD HH:MM)
	//==============================================================================
	/**
	 * @param { number | null | undefined } timestamp
	 * @returns { string }
	 */
	formatTimestamp(timestamp) {
		if (timestamp === null || timestamp === undefined) {
			return "—";
		}
		const date = new System.Date(timestamp);
		const year = date.getFullYear();
		const month = System.String(date.getMonth() + 1).padStart(2, "0");
		const day = System.String(date.getDate()).padStart(2, "0");
		const hour = System.String(date.getHours()).padStart(2, "0");
		const minute = System.String(date.getMinutes()).padStart(2, "0");
		return `${year}-${month}-${day} ${hour}:${minute}`;
	}

	//==============================================================================
	// 책 ID 로 책 객체 탐색.
	//==============================================================================
	/**
	 * @param { string } bookId
	 * @returns { object | null }
	 */
	findBookById(bookId) {
		const booksCache = this.getBooksCache();
		for (const book of booksCache) {
			if (book.id === bookId) {
				return book;
			}
		}
		return null;
	}

	//==============================================================================
	// 상태 텍스트 설정.
	//==============================================================================
	/**
	 * @param { string } text
	 */
	setStatusText(text) {
		const statusElement = this.getStatusElement();
		statusElement.setText(text);
	}

	//==============================================================================
	// 이어하기 클릭 처리.
	//==============================================================================
	/**
	 * @param { object } slot
	 */
	async handleContinueClick(slot) {
		const book = this.findBookById(slot.bookId);
		if (book === null) {
			System.alert(`이 방의 책 "${slot.bookId}" 을 찾을 수 없습니다. 책이 변경되었거나 제거되었을 수 있습니다.`);
			return;
		}
		const { PlayDocument } = await import("./playdocument.js");
		const playDocument = new PlayDocument({ book: book, slotId: slot.slotId });
		DocumentManager.getInstance().replace(playDocument, { transition: "scale-in" });
	}

	//==============================================================================
	// 삭제 클릭 처리.
	//==============================================================================
	/**
	 * @param { object } slot
	 */
	handleDeleteClick(slot) {
		const bookTitle = slot.bookTitle ?? "(제목 없음)";
		const confirmed = System.confirm(`"${bookTitle}" 방을 삭제할까요? 진행 기록이 모두 사라집니다.`);
		if (!confirmed) {
			return;
		}
		const storageKey = `${RoomListDocument.SLOT_KEY_PREFIX}${slot.slotId}`;
		Storage.remove(storageKey);
		this.renderSlots();
	}

	//==============================================================================
	// 뒤로가기 처리.
	//==============================================================================
	async handleBackClick() {
		const { TitleDocument } = await import("./titledocument.js");
		const titleDocument = new TitleDocument();
		DocumentManager.getInstance().replace(titleDocument, { transition: "slide-right" });
	}
}
