import * as fs from "fs"
import path from "path"
import { program } from "commander"
import { DocumentId, PeerId, Repo } from "automerge-repo"
import { BrowserWebSocketClientAdapter } from "automerge-repo-network-websocket"
import { rimrafSync } from "rimraf"


const repo = new Repo({
  network: [new BrowserWebSocketClientAdapter("wss://sync.inkandswitch.com")],
  peerId: ("blutack-cli-" + Math.round(Math.random() * 10000)) as PeerId,
  sharePolicy: async (peerId) => peerId.includes("storage-server"),
})

program
  .version("0.1.0")
  .description("A CLI for working with Widgets")
  .requiredOption("-d, --docId <value>", "Document ID")

program
  .command("export-doc")
  .description("export a document")
  .action(() => {
    const docId = program.opts().docId
    const h = repo.find<any>(docId)
    h.value().then((d) => {
      console.log(d.source)
      process.exit()
    })
  })

program
  .command("import-doc")
  .description("import a document")
  .action((options) => {
    const input = fs.readFileSync(process.stdin.fd, "utf-8")
    const h = repo.find<any>(options.docId)
    h.change((d) => {
      d.source = input
    })
  })

program
  .command("export-cts")
  .description("export content types")
  .requiredOption("-o, --outputDir <value>", "Output directory")
  .action(async (options) => {
    const docId = program.opts().docId
    const profileDoc = await (repo.find<any>(docId).value())
    const outputPath = path.join(process.cwd(), options.outputDir)

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }

    const contentTypesListDoc = await (repo.find<any>(profileDoc.contentTypesListId).value())

    await Promise.all(contentTypesListDoc.content.map(async (widgetUrl: string) => {
      const parts = widgetUrl.split("/")
      const widgetDocId = parts[parts.length - 1] as DocumentId

      const widgetDoc = await (repo.find<any>(widgetDocId).value())

      if (!widgetDoc.source) {
        return
      }

      const contentTypePath = path.join(outputPath, widgetDoc.contentType)

      // ensure we have an empty directory
      if (fs.existsSync(contentTypePath)) {
        rimrafSync(contentTypePath)
      }
      fs.mkdirSync(contentTypePath);


      const sourceFilePath = path.join(contentTypePath, "index.js")
      fs.writeFileSync(sourceFilePath, widgetDoc.source)

      const packageFilePath = path.join(contentTypePath, "package.json")
      const packageJson = {
        name: `content-type-${widgetDoc.contentType}`,
        documentId: widgetDocId
      }
      fs.writeFileSync(packageFilePath, JSON.stringify(packageJson, null, 2))
    }))

    process.exit()
  })




program.parse(process.argv)

