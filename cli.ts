import * as fs from "fs"
import * as path from "path"
import { program } from "commander"
import { DocumentId, PeerId, Repo } from "@automerge/automerge-repo"
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket"
import { rimrafSync } from "rimraf"
import { parseDocumentLink } from "./src/lib/blutack/content/Url.js"
import { DependencyMap, transformSource } from "./src/lib/blutack/Modules.js"
import { Generator } from "@jspm/generator"
import fetch from "node-fetch"

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
        const widgetDocId = parseDocumentLink(widgetUrl).documentId

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
          dependencies: widgetDoc.dependencies ?? {},
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
  dependencies: DependencyMap
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
            widgetDoc.dependencies = packageJson.dependencies
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

interface DependencyDoc {
  source: string
}

program
  .command("install")
  .requiredOption("--packages <packages...>")
  .description("import content types")
  .action(async (options) => {
    const targetDocId = program.opts().docId
    const targetDocHandle = repo.find<any>(targetDocId)
    const targetDoc = await targetDocHandle.value()

    const generator = new Generator()

    for (const packageName of options.packages) {
      await generator.link(packageName)
    }

    const existingDependencies: DependencyMap = targetDoc.dependencies ?? {}
    const newDependencies: DependencyMap = {}

    // iterate over import map and create automerge docs for dependencies that are not already there
    for (const [name, url] of Object.entries(generator.importMap.imports)) {
      if (existingDependencies[name] && existingDependencies[name].url === url) {
        console.log(`skip ${name}: already installed`)
        continue
      }

      const dependencyDocHandle = repo.create<DependencyDoc>()
      newDependencies[name] = { url, sourceDocId: dependencyDocHandle.documentId }
    }

    const allDependencies = { ...existingDependencies, ...newDependencies }

    // download source of new dependencies and write them to automerge documents
    for (const [name, dependency] of Object.entries(newDependencies)) {
      const source = await fetch(dependency.url, {}).then((res) => res.text())
      const transformedSource = transformSource(source, allDependencies).code

      if (!transformedSource) {
        throw new Error(`could not transform imports of ${name}`)
      }

      const dependencyDocHandle = repo.find<DependencyDoc>(dependency.sourceDocId)
      dependencyDocHandle.change((doc) => {
        doc.source = transformedSource
      })

      console.log(`added ${name} ${dependency.url}`)
    }

    // write new dependencies into dependency map of target doc
    targetDocHandle.change((targetDoc) => {
      if (!targetDoc.dependencies) {
        targetDoc.dependencies = {}
      }

      for (const [name, dependency] of Object.entries(newDependencies)) {
        targetDoc.dependencies[name] = dependency
      }
    })
  })

program.parse(process.argv)
