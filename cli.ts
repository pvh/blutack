import * as fs from "fs"
import { program } from "commander"
import { PeerId, Repo } from "automerge-repo"
import { BrowserWebSocketClientAdapter } from "automerge-repo-network-websocket"

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
  .command("export")
  .description("export a document")
  .action(() => {
    const docId = program.opts().docId
    const h = repo.find<any>(docId)
    h.value().then((d) => console.log(d.source))
  })

program
  .command("import")
  .description("import a document")
  .action((options) => {
    const input = fs.readFileSync(process.stdin.fd, "utf-8")
    const h = repo.find<any>(options.docId)
    h.change((d) => {
      d.source = input
    })
  })

program.parse(process.argv)
