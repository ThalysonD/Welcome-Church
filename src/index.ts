import express, { Request, Response } from "express";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcodeTerminal from "qrcode-terminal";
import qrcode from "qrcode";
import pino from "pino";
import { readXlsxFile } from "./xlsxReader";

let qrCodeData = "";

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "error" }),
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrCodeData = qr;
      qrcodeTerminal.generate(qr, { small: true }); // Gera o QR code no terminal
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
    const filePath = "C:/Users/thaly/Downloads/Planilha_ajustada (1) (3)";
    const contacts = await readXlsxFile(filePath);

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

const app = express();
const port = 4001;

app.get("/qrcode", async (req: Request, res: Response) => {
  if (qrCodeData) {
    try {
      const qrCodeUrl = await qrcode.toDataURL(qrCodeData);
      res.setHeader("Content-Type", "text/html");
      res.send(`<img src="${qrCodeUrl}" alt="QR Code" />`);
    } catch (error) {
      res.status(500).send("Error generating QR code");
    }
  } else {
    res.status(404).send("QR code not generated yet. Please wait.");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
