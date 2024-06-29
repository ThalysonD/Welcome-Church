import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import pino from "pino";

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: "error" }),
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "connection closed due to",
        lastDisconnect?.error,
        ", reconnecting",
        shouldReconnect
      );
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("opened connection");
      sendMessages();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  async function sendMessages() {
    const recipients = [
      "553496842685@s.whatsapp.net",
      "553498823802@s.whatsapp.net",
    ];
    const message = { text: " Message Test " };

    for (const recipient of recipients) {
      try {
        await sock.sendMessage(recipient, message);
        console.log(`Message sent to ${recipient}: success`);
      } catch (error) {
        console.error(`Message sent to ${recipient}: false`, error);
      }
    }
  }
}

connectToWhatsApp();
