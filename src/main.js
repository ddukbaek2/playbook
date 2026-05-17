//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Application } from "../libs/document-engine.js/import.js";
import { Secrets } from "./app/secrets.js";
import { TitleDocument } from "./app/documents/titledocument.js";


//==============================================================================
// 부트스트랩.
//==============================================================================
async function bootstrap() {
	await Secrets.load("./secrets.json");

	const application = Application.getInstance();
	application.run({
		containerElementId: "app",
		initialDocumentClass: TitleDocument
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
