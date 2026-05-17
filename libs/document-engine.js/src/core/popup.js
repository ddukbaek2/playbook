//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "./object.js";
import { Element } from "./element.js";
import { Layout } from "./layout.js";


//==============================================================================
// 팝업 모달.
// - document.body 위에 떠서 사용자 확인을 받는 모달 UI.
// - 단순 알림: Popup.alert(message).
// - 다중 버튼: Popup.show({ title, message, buttons: [{ label, onClick, primary }] }).
// - 백드롭 클릭 또는 버튼 클릭으로 닫힌다. (dismissOnBackdrop=false 면 백드롭 클릭 무시)
//==============================================================================
export class Popup extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Element | null } */ #overlayElement;
	/** @private @type { boolean } */ #isClosing;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { object } options
	 * @param { string } [options.title]
	 * @param { string } options.message
	 * @param { Array<{ label: string, onClick?: Function, primary?: boolean }> } [options.buttons]
	 * @param { boolean } [options.dismissOnBackdrop]
	 */
	constructor(options) {
		super();
		this.#overlayElement = null;
		this.#isClosing = false;
		this.buildUI(options);
	}

	//==============================================================================
	// 간편 알림 호출.
	// - 단일 "확인" 버튼만 있는 팝업을 띄운다.
	//==============================================================================
	/**
	 * @param { string } message
	 * @param { object } [options]
	 * @param { string } [options.title]
	 * @param { string } [options.buttonLabel]
	 * @returns { Popup }
	 */
	static alert(message, options) {
		const safeOptions = options ?? {};
		const title = safeOptions.title ?? "알림";
		const buttonLabel = safeOptions.buttonLabel ?? "확인";
		return Popup.show({
			title: title,
			message: message,
			buttons: [
				{ label: buttonLabel, primary: true }
			]
		});
	}

	//==============================================================================
	// 다중 버튼 팝업 호출.
	//==============================================================================
	/**
	 * @param { object } options
	 * @returns { Popup }
	 */
	static show(options) {
		const popup = new Popup(options);
		popup.attach();
		return popup;
	}

	//==============================================================================
	// 오버레이 Element 반환.
	//==============================================================================
	/**
	 * @returns { Element | null }
	 */
	getOverlayElement() {
		return this.#overlayElement;
	}

	//==============================================================================
	// UI 구성.
	//==============================================================================
	/**
	 * @param { object } options
	 */
	buildUI(options) {
		const title = options.title ?? "알림";
		const message = options.message ?? "";
		const buttons = options.buttons ?? [{ label: "확인", primary: true }];
		const dismissOnBackdrop = options.dismissOnBackdrop ?? true;

		const buttonLayouts = [];
		for (const button of buttons) {
			const isPrimary = button.primary === true;
			const buttonBackgroundColor = isPrimary ? "#0e639c" : "#3c3c3c";
			const buttonTextColor = isPrimary ? "#ffffff" : "#cccccc";
			buttonLayouts.push(
				Layout.create("button")
					.text(button.label)
					.style({
						padding: "8px 20px",
						fontSize: "14px",
						fontWeight: "bold",
						color: buttonTextColor,
						backgroundColor: buttonBackgroundColor,
						border: "none",
						borderRadius: "4px",
						cursor: "pointer"
					})
					.on("click", (event) => {
						event.stopPropagation();
						this.close();
						const onClick = button.onClick;
						if (onClick) {
							onClick();
						}
					})
			);
		}

		const overlayLayout = Layout.create("div")
			.style({
				position: "fixed",
				left: "0",
				top: "0",
				width: "100%",
				height: "100%",
				backgroundColor: "rgba(0, 0, 0, 0.5)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: "10000",
				padding: "20px",
				boxSizing: "border-box"
			})
			.on("click", () => {
				if (dismissOnBackdrop) {
					this.close();
				}
			})
			.children(
				Layout.create("div")
					.style({
						minWidth: "280px",
						maxWidth: "min(90%, 480px)",
						padding: "24px",
						backgroundColor: "#2a2a2c",
						border: "1px solid #3c3c3c",
						borderRadius: "8px",
						boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
						display: "flex",
						flexDirection: "column",
						gap: "16px"
					})
					.on("click", (event) => {
						event.stopPropagation();
					})
					.children(
						Layout.create("div")
							.text(title)
							.style({
								fontSize: "16px",
								fontWeight: "bold",
								color: "#ffffff"
							}),
						Layout.create("div")
							.text(message)
							.style({
								fontSize: "14px",
								color: "#cccccc",
								lineHeight: "1.6",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word"
							}),
						Layout.create("div")
							.style({
								display: "flex",
								flexDirection: "row",
								justifyContent: "flex-end",
								gap: "8px",
								marginTop: "8px"
							})
							.children(...buttonLayouts)
					)
			);

		this.#overlayElement = overlayLayout.build();
	}

	//==============================================================================
	// document.body 에 부착하고 페이드 인.
	//==============================================================================
	attach() {
		const overlayElement = this.getOverlayElement();
		if (overlayElement === null) {
			return;
		}
		const bodyHtmlElement = System.document.body;
		const overlayHtmlElement = overlayElement.getHtmlElement();
		bodyHtmlElement.appendChild(overlayHtmlElement);
		overlayHtmlElement.animate(
			[
				{ opacity: "0" },
				{ opacity: "1" }
			],
			{
				duration: 180,
				easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
				fill: "forwards"
			}
		);
	}

	//==============================================================================
	// 페이드 아웃 후 detach 및 파괴.
	//==============================================================================
	close() {
		if (this.#isClosing) {
			return;
		}
		this.#isClosing = true;
		const overlayElement = this.getOverlayElement();
		if (overlayElement === null) {
			return;
		}
		const overlayHtmlElement = overlayElement.getHtmlElement();
		const animation = overlayHtmlElement.animate(
			[
				{ opacity: "1" },
				{ opacity: "0" }
			],
			{
				duration: 140,
				easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
				fill: "forwards"
			}
		);
		animation.addEventListener("finish", () => {
			const parentHtmlElement = overlayHtmlElement.parentElement;
			if (parentHtmlElement !== null) {
				parentHtmlElement.removeChild(overlayHtmlElement);
			}
			overlayElement.destroy();
			this.#overlayElement = null;
		});
	}
}
