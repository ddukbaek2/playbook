//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Application } from "../libs/dom.js/import.js";
import { Secrets } from "./app/secrets.js";
import { TitleScene } from "./app/scenes/titlescene.js";


//==============================================================================
// 부트스트랩.
//==============================================================================
async function bootstrap() {
	await Secrets.load("./secrets.json");

	const application = Application.getInstance();
	application.run({
		containerElementId: "app",
		initialSceneClass: TitleScene
	});
}

if (System.document.readyState === "loading") {
	System.document.addEventListener("DOMContentLoaded", () => {
		bootstrap();
	});
}
else {
	bootstrap();
}
