// "use strict";

let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;
let currCMD;

const log = document.getElementById("log");
const butConnect = document.getElementById("butConnect");
const butUnlock = document.getElementById("butUnlock");
const butHome = document.getElementById("butHome");

const frate = document.getElementById("frate");
const setFeedRate = document.getElementById("setFeedRate");

const typedCMD = document.getElementById("cmdSection");
const sendTypedCMD = document.getElementById("sendTypedCMD");

const lastCMD = document.getElementById("lastCMD");

document.addEventListener("DOMContentLoaded", () => {
  butConnect.addEventListener("click", clickConnect);
  butUnlock.addEventListener("click", sendUnLockCMD);
  butHome.addEventListener("click", sendHomeCMD);

  frate.addEventListener("keyup", sendSetFeedRateCommandUponENTER);
  setFeedRate.addEventListener("click", sendSetFeedRateCommand);

  typedCMD.addEventListener("keyup", sendTypedCommandUponENTER);
  sendTypedCMD.addEventListener("click", sendTypedCommand);

  if ("serial" in navigator) {
    console.log("Serial is supported");
    const notSupported = document.getElementById("notSupported");
    notSupported.classList.add("hidden");
  }
});

/**
 * --- connect
 * Opens a Web Serial connection and sets up the input and
 * output stream.
 */
async function connect() {
  // - Request a port and open a connection.
  port = await navigator.serial.requestPort();
  // - Wait for the port to open.
  await port.open({ baudrate: 115200 });

  //Setup the output stream here.
  const encoder = new TextEncoderStream();
  outputDone = encoder.readable.pipeTo(port.writable);
  outputStream = encoder.writable;

  //To read the stream here.
  let decoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable;
  reader = inputStream.getReader();
  readLoop();
}

/**
 * --- clickConnect
 * Click handler for the connect/disconnect button.
 */
async function clickConnect() {
  if (port) {
    await disconnect();
    toggleUIConnected(false);
    return;
  }

  await connect();
  toggleUIConnected(true);
}

/**
 * --- disconnect
 * Closes the Web Serial connection.
 */
async function disconnect() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }

  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }

  await port.close();
  port = null;
}

function toggleUIConnected(connected) {
  let lbl = "CONNECT SERIAL";
  if (connected) {
    lbl = "DIS-CONNECT SERIAL";
  }
  butConnect.textContent = lbl;
}

/**
 * @name readLoop
 * Reads data from the input stream and displays it on screen.
 */
async function readLoop() {
  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      log.textContent += value + "\n";
    }
    if (done) {
      console.log("[readLoop] DONE", done);
      reader.releaseLock();
      break;
    }
  }
}

/**
 * --- writeToStream
 * Gets a writer from the output stream and send the lines
 * {...string} lines lines to send
 */
function writeToStream(...lines) {
  const writer = outputStream.getWriter();
  lines.forEach(line => {
    console.log("[SEND]", line);
    writer.write(line + "\n");
  });
  writer.releaseLock();
}

//  '$X' is the command for GRBL to kill alarm lock
function sendUnLockCMD() {
  currCMD = "$X";
  writeToStream(currCMD);
  lastCMD.textContent = currCMD;
  log.textContent = currCMD;
}

//  '$H' is the command for GRBL to do Homing Cycle
function sendHomeCMD() {
  currCMD = "$H";
  writeToStream(currCMD);
  lastCMD.textContent = currCMD;
  log.textContent = currCMD;
}

function sendTypedCommand() {
  currCMD = typedCMD.value;
  writeToStream(currCMD);
  lastCMD.textContent = currCMD;
  log.textContent = currCMD;
}

function sendTypedCommandUponENTER(ev) {
  if (ev.keyCode == 13) {
    sendTypedCommand();
  }
}

function sendSetFeedRateCommand() {
  var cmd_elems = ["$112=", ""];
  cmd_elems[1] = frate.value;
  var setFRcmd = cmd_elems.join("");
  // console.log(setFRcmd);
  currCMD = setFRcmd;
  writeToStream(currCMD);
  lastCMD.textContent = currCMD;
  log.textContent = currCMD;
}

function sendSetFeedRateCommandUponENTER(ev) {
  if (ev.keyCode == 13) {
    sendSetFeedRateCommand();
  }
}
