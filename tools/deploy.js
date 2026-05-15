//==============================================================================
// 배포 스크립트.
// - build/ 의 내용을 NAS SMB 공유( \\DS216PLUSII\web\playbook )에 미러링한다.
// - 타겟에만 존재하는 파일/디렉터리는 삭제 (mirror 모드).
//==============================================================================
const fs = require("fs/promises");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const buildDir = path.join(projectRoot, "build");
const deployTarget = "\\\\DS216PLUSII\\web\\playbook";

async function pathExists(targetPath) {
	try {
		await fs.access(targetPath);
		return true;
	}
	catch (error) {
		if (error.code === "ENOENT") {
			return false;
		}
		throw error;
	}
}

async function ensureDir(directoryPath) {
	await fs.mkdir(directoryPath, { recursive: true });
}

async function walkRelativeEntries(rootPath) {
	const result = [];

	async function walk(currentPath, relativePrefix) {
		const entries = await fs.readdir(currentPath, { withFileTypes: true });
		for (const entry of entries) {
			const entryRelative = (relativePrefix === "") ? entry.name : `${relativePrefix}/${entry.name}`;
			const entryAbsolute = path.join(currentPath, entry.name);
			if (entry.isDirectory()) {
				result.push({ relative: entryRelative, isDirectory: true });
				await walk(entryAbsolute, entryRelative);
			}
			else {
				result.push({ relative: entryRelative, isDirectory: false });
			}
		}
	}

	const rootExists = await pathExists(rootPath);
	if (!rootExists) {
		return result;
	}
	await walk(rootPath, "");
	return result;
}

async function main() {
	console.log(`[deploy] source: ${buildDir}`);
	console.log(`[deploy] target: ${deployTarget}`);

	const buildExists = await pathExists(buildDir);
	if (!buildExists) {
		throw new Error(`[deploy] build directory not found: ${buildDir}`);
	}

	await ensureDir(deployTarget);

	const sourceEntries = await walkRelativeEntries(buildDir);
	const sourceRelativeSet = new Set();
	for (const entry of sourceEntries) {
		sourceRelativeSet.add(entry.relative);
	}

	// 미러링: 타겟에만 존재하는 항목 삭제. 깊은 경로부터 지워 부모 디렉터리 보존.
	const targetEntries = await walkRelativeEntries(deployTarget);
	targetEntries.sort((entryA, entryB) => entryB.relative.length - entryA.relative.length);
	let removedCount = 0;
	for (const entry of targetEntries) {
		if (sourceRelativeSet.has(entry.relative)) {
			continue;
		}
		const targetAbsolute = path.join(deployTarget, entry.relative);
		await fs.rm(targetAbsolute, { recursive: true, force: true });
		console.log(`[deploy] removed: ${entry.relative}`);
		removedCount = removedCount + 1;
	}

	// 디렉터리 먼저 생성 후 파일 복사.
	sourceEntries.sort((entryA, entryB) => entryA.relative.length - entryB.relative.length);
	let copiedFileCount = 0;
	for (const entry of sourceEntries) {
		const sourceAbsolute = path.join(buildDir, entry.relative);
		const targetAbsolute = path.join(deployTarget, entry.relative);
		if (entry.isDirectory) {
			await ensureDir(targetAbsolute);
		}
		else {
			await fs.copyFile(sourceAbsolute, targetAbsolute);
			copiedFileCount = copiedFileCount + 1;
		}
	}

	console.log(`[deploy] copied ${copiedFileCount} files, removed ${removedCount} stale entries.`);
	console.log("[deploy] done.");
}

main().catch((error) => {
	console.error("[deploy] failed:", error);
	process.exit(1);
});
