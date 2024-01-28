import * as Glob from "glob"
import * as Fs from "node:fs"
import * as Path from "node:path"

const manifests = Glob.sync("packages/*/public/manifest.json")

manifests.forEach((manifest) => {
  const manifestJson = JSON.parse(Fs.readFileSync(manifest, "utf-8"))
  const packageJson = JSON.parse(Fs.readFileSync(
    Path.join(
      Path.dirname(manifest),
      "../package.json"
    ),
    "utf-8"
  ))
  Fs.writeFileSync(
    manifest,
    JSON.stringify(
      {
        ...manifestJson,
        version: packageJson.version
      },
      null,
      2
    )
  )
})
