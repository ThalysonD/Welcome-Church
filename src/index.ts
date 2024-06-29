import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import pino from "pino";
import { readXlsxFile } from "./xlsxReader";

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
    const filePath = "C:/Users/thaly/Downloads/Planilha sem título.xlsx";
    const contacts = readXlsxFile(filePath);

    for (const contact of contacts) {
      const recipient = `${contact.telefone}@s.whatsapp.net`;
      const messageText =
        contact.sexo === "M"
          ? `Olá ${contact.nome}, agradecemos muito pela sua visita à Igreja Familiar do Avivamento. Estamos super felizes pela sua presença e saiba que aqui você encontra uma família. Saiba que você é precioso para nós. "E consideremo-nos uns aos outros para nos incentivarmos ao amor e às boas obras." (Hebreus 10:24)`
          : `Olá ${contact.nome}, agradecemos muito pela sua visita à Igreja Familiar do Avivamento. Estamos super felizes pela sua presença e saiba que aqui você encontra uma família. Saiba que você é preciosa para nós. "E consideremo-nos uns aos outros para nos incentivarmos ao amor e às boas obras." (Hebreus 10:24)`;

      try {
        await sock.sendMessage(recipient, { text: messageText });
        console.log(`Message sent to ${recipient}: success`);
      } catch (error) {
        console.error(`Message sent to ${recipient}: false`, error);
      }
    }
  }
}

connectToWhatsApp();
