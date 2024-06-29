import * as XLSX from "xlsx";
import * as fs from "fs";

export function readXlsxFile(filePath: string) {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

  const formattedData = data.slice(1).map((row) => {
    const nome = row[0];
    const telefone = "55" + row[1].replace(/\D/g, "");
    const sexo = row[2];
    const idade = row[3];
    return { nome, telefone, sexo, idade };
  });

  return formattedData;
}
