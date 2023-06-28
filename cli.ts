import * as fs from "fs"
import * as path from "path"
import { program } from "commander"
import { DocumentId, PeerId, Repo } from "@automerge/automerge-repo"
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket"
import { rimrafSync } from "rimraf"
import { transform } from "@babel/standalone"

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
    const profileDoc = await repo.find<any>(docId).value()
    const outputPath = path.join(process.cwd(), options.outputDir)

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath)
    }

    const contentTypesListDoc = await repo.find<any>(profileDoc.contentTypesListId).value()

    await Promise.all(
      contentTypesListDoc.content.map(async (widgetUrl: string) => {
        const parts = widgetUrl.split("/")
        const widgetDocId = parts[parts.length - 1] as DocumentId

        const widgetDoc = await repo.find<any>(widgetDocId).value()

        if (!widgetDoc.source) {
          return
        }

        const contentTypePath = path.join(outputPath, widgetDoc.contentType)

        // ensure we have an empty directory
        if (fs.existsSync(contentTypePath)) {
          rimrafSync(contentTypePath)
        }
        fs.mkdirSync(contentTypePath)

        const sourceFilePath = path.join(contentTypePath, "index.js")
        fs.writeFileSync(sourceFilePath, widgetDoc.source)

        const packageFilePath = path.join(contentTypePath, "package.json")
        const packageJson = {
          name: `content-type-${widgetDoc.contentType}`,
          contentType: widgetDoc.contentType,
          documentId: widgetDocId,
        }
        fs.writeFileSync(packageFilePath, JSON.stringify(packageJson, null, 2))
      })
    )

    process.exit()
  })

interface PackageJson {
  name: string
  documentId: DocumentId
  contentType: string
}

program
  .command("import-cts")
  .description("import content types")
  .option("--replace", "delete any content type that is not found in the input directory")
  .requiredOption("-o, --inputDir <value>", "input directory")
  .action(async (options) => {
    const docId = program.opts().docId
    const profileDoc = await repo.find<any>(docId).value()
    const inputPath = path.join(process.cwd(), options.inputDir)

    if (!fs.existsSync(inputPath)) {
      console.log("directory doesn't exist", inputPath)
      process.exit()
    }

    const contentTypesListDocHandle = repo.find<any>(profileDoc.contentTypesListId)

    const contentTypeDocUrls = (
      await Promise.all(
        getDirectories(inputPath).map(async (contentTypeDirPath) => {
          const sourceFilePath = path.join(contentTypeDirPath, "index.js")
          const packageFilePath = path.join(contentTypeDirPath, "package.json")

          if (!fs.existsSync(packageFilePath)) {
            console.error(`skip "${contentTypeDirPath}": missing a package.json`)
            return
          }

          if (!fs.existsSync(sourceFilePath)) {
            console.error(`skip "${contentTypeDirPath}": missing a index.js file`)
            return
          }

          let packageJson: PackageJson

          try {
            packageJson = JSON.parse(fs.readFileSync(packageFilePath, "utf-8"))
          } catch (err) {
            console.error(`skip ${contentTypeDirPath}: invalid package.json`)
            return
          }

          if (!packageJson.contentType) {
            console.error(`skip ${contentTypeDirPath}: package.json is missing content type`)
            return
          }

          const widgetDocHandle = repo.find<any>(packageJson.documentId)

          // await value to make sure doc is ready
          await widgetDocHandle.value()

          console.log(`import ${contentTypeDirPath}`)

          const source = fs.readFileSync(sourceFilePath, "utf-8")
          let dist: string | undefined | null

          try {
            dist = transformSource(source).code
          } catch (err) {
            console.error(`skip ${contentTypeDirPath}: could not compile`)
            return
          }

          widgetDocHandle.change((widgetDoc) => {
            widgetDoc.contentType = packageJson.contentType
            widgetDoc.source = source
            widgetDoc.dist = dist
          })

          return packageJson.documentId
        })
      )
    )
      .filter((value) => value !== undefined)
      .map((documentId) => `web+pushpin://widget/${documentId}`)

    contentTypesListDocHandle.change((contentTypesListDoc) => {
      if (options.replace) {
        contentTypesListDoc.content = contentTypeDocUrls
      } else {
        console.log("typesListDoc", JSON.parse(JSON.stringify(contentTypesListDoc)))

        for (const contentTypeDocUrl of contentTypeDocUrls) {
          if (!contentTypesListDoc.content.includes(contentTypeDocUrl)) {
            console.log("insert", contentTypeDocUrl)

            contentTypesListDoc.content.push(contentTypeDocUrl)
          }
        }
      }
    })
  })

function getDirectories(dirPath: string) {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dirPath, entry.name))
}

program.parse(process.argv)

// todo: workaround, duplicote code copied from blutack/Modules because importing it causes errors with ts-node
const importTransformPlugin = {
  name: "transform-imports-to-skypack",
  visitor: {
    ImportDeclaration(path: any) {
      const value = path.node.source.value

      // Don't replace relative or absolute URLs.
      if (/^([./])/.test(value)) {
        return
      }

      path.node.source.value = `https://cdn.skypack.dev/${value}`
    },
  },
}

export function transformSource(source: string) {
  return transform(source, {
    presets: ["react"],
    plugins: [importTransformPlugin],
    parserOpts: { allowReturnOutsideFunction: true },
  })
}
