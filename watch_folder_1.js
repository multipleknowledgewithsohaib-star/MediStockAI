const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const dotenv = require("dotenv");

dotenv.config();

const ROOT = __dirname;
const IMPORTER = path.join(ROOT, "import_folder_1.js");
const SOURCE_DIR = path.join(ROOT, "1");
const POLL_INTERVAL_MS = Number(process.env.FOLDER_IMPORT_POLL_MS || 30000);
const RETRY_DELAY_MS = Number(process.env.FOLDER_IMPORT_RETRY_DELAY_MS || 15000);
const passthroughArgs = process.argv.slice(2);

let child = null;
let shuttingDown = false;

function now() {
    return new Date().toISOString();
}

function log(message) {
    console.log(`[${now()}] ${message}`);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function stop(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    log(`Received ${signal}. Stopping folder 1 import daemon...`);

    if (child && !child.killed) {
        child.kill(signal);
    }
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

async function runImporterOnce() {
    return new Promise((resolve) => {
        child = spawn(process.execPath, [IMPORTER, ...passthroughArgs], {
            cwd: ROOT,
            env: process.env,
            stdio: "inherit",
        });

        child.on("error", (error) => {
            resolve({ code: 1, signal: null, error });
        });

        child.on("exit", (code, signal) => {
            resolve({ code: code ?? 0, signal, error: null });
        });
    });
}

async function main() {
    if (!fs.existsSync(SOURCE_DIR)) {
        throw new Error(`Source directory not found: ${SOURCE_DIR}`);
    }

    log(`Folder 1 import daemon started. Watching ${SOURCE_DIR}`);
    log(`Importer: ${IMPORTER}`);
    log(`Poll interval: ${POLL_INTERVAL_MS}ms | Retry delay: ${RETRY_DELAY_MS}ms`);

    while (!shuttingDown) {
        const result = await runImporterOnce();

        if (shuttingDown) {
            break;
        }

        if (result.error) {
            log(`Importer failed to start: ${result.error.message || result.error}`);
        } else if (result.code !== 0) {
            log(`Importer exited with code ${result.code}${result.signal ? ` (${result.signal})` : ""}.`);
        } else {
            log("Importer cycle completed cleanly.");
        }

        const delay = result.code === 0 ? POLL_INTERVAL_MS : RETRY_DELAY_MS;
        log(`Restarting in ${delay}ms.`);
        await sleep(delay);
    }

    log("Folder 1 import daemon stopped.");
}

main().catch((error) => {
    console.error(`[${now()}] Folder 1 import daemon error: ${error.message || error}`);
    process.exitCode = 1;
});
