import fs from "node:fs/promises";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const source = "/Users/christoph.bordeck/Desktop/VKB_GEO_Sichtbarkeitsaudit.pptx";
const output = "/Users/christoph.bordeck/Desktop/GITHUB/plexon-v3/.tmp/provinzial-deck/template/template-inspect/template-inspect.ndjson";

const presentation = await PresentationFile.importPptx(await FileBlob.load(source));
const snapshot = await presentation.inspect({
  kind: "slide,textbox,shape,image,table,chart",
  include: "id,slide,name,title,text,textPreview,textChars,textLines,bbox,bboxUnit,isPlaceholder",
  maxChars: 1000000,
});
await fs.writeFile(output, snapshot.ndjson, "utf8");
