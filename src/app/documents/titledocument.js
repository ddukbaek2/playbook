//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Document, DocumentManager, Layout } from "../../../libs/document-engine.js/import.js";
import { Secrets } from "../secrets.js";


//==============================================================================
// 시작 도큐먼트.
//==============================================================================
export class TitleDocument extends Document {
	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 */
	constructor() {
		super();
		this.setName("TitleDocument");
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	/**
	 * @override
	 */
	onEnter() {
		Layout.create("div")
			.style({
				position: "absolute",
				left: "50%",
				top: "50%",
				transform: "translate(-50%, -50%)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "16px",
				minWidth: "320px"
			})
			.children(
				Layout.create("div")
					.text("Playbook")
					.style({
						fontSize: "40px",
						fontWeight: "bold",
						color: "#ffffff",
						marginBottom: "8px"
					}),
				Layout.create("div")
					.text("AI 기반 스토리 플레이")
					.style({
						fontSize: "14px",
						color: "#888888",
						marginBottom: "16px"
					}),
				Layout.create("button")
					.text("새로하기")
					.style({
						width: "100%",
						padding: "12px 16px",
						fontSize: "15px",
						fontWeight: "bold",
						color: "#ffffff",
						backgroundColor: "#0e639c",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer"
					})
					.on("click", () => {
						this.handleNewClick();
					}),
				Layout.create("button")
					.text("이어하기")
					.style({
						width: "100%",
						padding: "12px 16px",
						fontSize: "15px",
						fontWeight: "bold",
						color: "#ffffff",
						backgroundColor: "#3c3c3c",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer"
					})
					.on("click", () => {
						this.handleContinueClick();
					})
			)
			.build(this);
	}

	//==============================================================================
	// API 키 확인.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	checkApiKey() {
		const apiKey = Secrets.get("geminiApiKey", "");
		const hasApiKey = apiKey !== "" && apiKey.trim() !== "";
		if (!hasApiKey) {
			System.console.error("Gemini API 키가 secrets.json 에 설정되지 않았습니다.");
			System.alert("서비스 준비 중입니다. 잠시 후 다시 시도해 주세요.");
			return false;
		}
		return true;
	}

	//==============================================================================
	// 새로하기 버튼 처리.
	//==============================================================================
	async handleNewClick() {
		const ok = this.checkApiKey();
		if (!ok) {
			return;
		}
		const { SelectDocument } = await import("./selectdocument.js");
		const selectDocument = new SelectDocument();
		DocumentManager.getInstance().replace(selectDocument, { transition: "slide-left" });
	}

	//==============================================================================
	// 이어하기 버튼 처리.
	//==============================================================================
	async handleContinueClick() {
		const ok = this.checkApiKey();
		if (!ok) {
			return;
		}
		const { RoomListDocument } = await import("./roomlistdocument.js");
		const roomListDocument = new RoomListDocument();
		DocumentManager.getInstance().replace(roomListDocument, { transition: "slide-left" });
	}
}
