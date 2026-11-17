/**
 * OS POPBL Project - Group 4: Timing & Live Leaderboard
 * Core OS Concepts: I/O Management, Hardware Interrupts, FIFO Buffering, and Spooling
 */

// 1. OS MEMORY BUFFER CONFIGURATION
const MAX_BUFFER_SIZE = 30; // Fixed memory allocation for I/O Buffer
let ioBuffer = [];          // FIFO Queue acting as RAM Buffer
let leaderboardData = [];   // Final output storage for spectators

// Metrics
let totalInterrupts = 0;
let droppedPackets = 0;
let spoolIntervalTime = 800; // Default spooling rate (ms)
let raceStartTime = Date.now() - 1800000; // Simulates race started 30 mins ago

// Sample names for Load Testing
const sampleNames = ["Aiman", "Siti", "Chong", "Priya", "Hafiz", "Nurul", "Kevin", "Mei Ling", "Ravi", "Zul"];

/**
 * HARDWARE LAYER: Simulates an RFID Mat generating a Hardware Interrupt (IRQ)
 */
function generateHardwareInterrupt(name, bib, finishDurationMs) {
    totalInterrupts++;
    document.getElementById("totalInterrupts").innerText = totalInterrupts;

    const rawDataPacket = {
        bib: bib,
        name: name,
        rawTimeMs: finishDurationMs,
        formattedTime: formatTime(finishDurationMs),
        timestamp: new Date().toLocaleTimeString()
    };

    // Pass control to OS Interrupt Service Routine (ISR)
    interruptServiceRoutine(rawDataPacket);
}

/**
 * KERNEL LAYER: Interrupt Service Routine (ISR)
 * Quickly captures I/O data and places it into the I/O Buffer to free up the CPU
 */
function interruptServiceRoutine(packet) {
    if (ioBuffer.length < MAX_BUFFER_SIZE) {
        ioBuffer.push(packet); // Enqueue into FIFO Buffer
        logKernel(`[IRQ] Captured Bib #${packet.bib} (${packet.name}) -> Buffered`, "log-irq");
    } else {
        // Buffer Overflow condition if burst exceeds RAM buffer capacity
        droppedPackets++;
        document.getElementById("droppedCount").innerText = droppedPackets;
        logKernel(`[ERR] BUFFER OVERFLOW! Dropped Bib #${packet.bib}`, "log-err");
    }
    updateBufferUI();
}

/**
 * SPOOLING DAEMON: Background process that drains the I/O Buffer sequentially,
 * sorts rankings, and writes safely to the Public Leaderboard Output.
 */
function startSpoolerProcess() {
    setInterval(() => {
        if (ioBuffer.length > 0) {
            // Dequeue oldest I/O packet (FIFO)
            const processedRunner = ioBuffer.shift();
            
            // Write to output storage & sort by fastest finish time
            leaderboardData.push(processedRunner);
            leaderboardData.sort((a, b) => a.rawTimeMs - b.rawTimeMs);

            logKernel(`[SPOOL] Processed Bib #${processedRunner.bib} to Leaderboard`, "log-spool");
            
            updateBufferUI();
            renderLeaderboard();
        }
    }, spoolIntervalTime);
}

// --- UI & SIMULATION HELPERS ---

function triggerSingleInterrupt() {
    const nameInput = document.getElementById("runnerName").value.trim() || "Runner_" + Math.floor(Math.random() * 999);
    const bibInput = document.getElementById("bibNumber").value.trim() || Math.floor(1000 + Math.random() * 9000);
    const elapsed = Date.now() - raceStartTime;

    generateHardwareInterrupt(nameInput, bibInput, elapsed);

    document.getElementById("runnerName").value = "";
    document.getElementById("bibNumber").value = "";
}

function triggerBurstInterrupts(count) {
    logKernel(`--- BURST TEST: ${count} SIMULTANEOUS RFID INTERRUPTS ---`, "log-irq");
    for (let i = 0; i < count; i++) {
        // Stagger interrupts by a few milliseconds to mimic high-frequency hardware signals
        setTimeout(() => {
            const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)] + "_" + (i + 1);
            const randomBib = Math.floor(1000 + Math.random() * 8999);
            const elapsed = (Date.now() - raceStartTime) + (i * 120);
            generateHardwareInterrupt(randomName, randomBib, elapsed);
        }, i * 35);
    }
}

function updateBufferUI() {
    const currentSize = ioBuffer.length;
    const percentage = (currentSize / MAX_BUFFER_SIZE) * 100;

    document.getElementById("bufferCount").innerText = `${currentSize} / ${MAX_BUFFER_SIZE}`;
    document.getElementById("bufferBar").style.width = `${percentage}%`;

    const queueContainer = document.getElementById("bufferQueueVisual");
    queueContainer.innerHTML = "";

    if (currentSize === 0) {
        queueContainer.innerHTML = '<span class="empty-msg">Buffer is idle...</span>';
    } else {
        ioBuffer.forEach(item => {
            const badge = document.createElement("span");
            badge.className = "q-item";
            badge.innerText = `#${item.bib}`;
            queueContainer.appendChild(badge);
        });
    }
}

function renderLeaderboard() {
    const tbody = document.getElementById("leaderboardBody");
    tbody.innerHTML = "";

    leaderboardData.forEach((runner, index) => {
        const row = `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${runner.bib}</td>
                <td>${runner.name}</td>
                <td>${runner.formattedTime}</td>
                <td>✅ Verified</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function logKernel(message, className) {
    const logWindow = document.getElementById("interruptLogs");
    const entry = document.createElement("div");
    entry.className = `log-entry ${className}`;
    entry.innerText = message;
    logWindow.prepend(entry);
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
}

function updateSpoolRate() {
    // Restart spooler with new speed
    location.reload(); 
}

// Initialize OS Spooler Daemon on boot
startSpoolerProcess();
