//==============================================================================
// 빌드 스크립트.
// - 프로젝트 루트의 launch.html / src / libs / assets / secrets.json 을 build/ 로 정리한다.
// - launch.html 은 nginx 기본 index 규칙에 맞춰 index.html 로 이름 변경.
// - build/.gitkeep 는 유지한다.
//==============================================================================
const fs = require("fs/promises");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const buildDir = path.join(projectRoot, "build");

async function cleanBuildDir() {
	try {
		const entries = await fs.readdir(buildDir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.name === ".gitkeep") {
				continue;
			}
			const entryPath = path.join(buildDir, entry.name);
			await fs.rm(entryPath, { recursive: true, force: true });
		}
	}
	catch (error) {
		if (error.code === "ENOENT") {
			await fs.mkdir(buildDir, { recursive: true });
			return;
		}
		throw error;
	}
}

async function copyTree(sourcePath, destinationPath) {
	await fs.cp(sourcePath, destinationPath, { recursive: true, force: true });
}

async function main() {
	console.log(`[build] project root: ${projectRoot}`);
	console.log(`[build] build dir:    ${buildDir}`);

	await cleanBuildDir();

	const launchHtmlPath = path.join(projectRoot, "launch.html");
	const indexHtmlPath = path.join(buildDir, "index.html");
	await fs.copyFile(launchHtmlPath, indexHtmlPath);

	await copyTree(path.join(projectRoot, "src"), path.join(buildDir, "src"));
	await copyTree(path.join(projectRoot, "libs"), path.join(buildDir, "libs"));
	await copyTree(path.join(projectRoot, "assets"), path.join(buildDir, "assets"));

	const secretsSourcePath = path.join(projectRoot, "secrets.json");
	const secretsDestinationPath = path.join(buildDir, "secrets.json");
	await fs.copyFile(secretsSourcePath, secretsDestinationPath);

	console.log("[build] done.");
}

main().catch((error) => {
	console.error("[build] failed:", error);
	process.exit(1);
});
