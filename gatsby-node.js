const path = require("path")

// reference: https://stackoverflow.com/questions/10265798/determine-project-root-from-a-running-node-js-application
const appRoot = require("app-root-path").toString()

const { loadJsonFile, writeJsonFile } = require("./utils")
const { createUpdatedRedirects, filterLiveRedirects } = require("./index")

exports.pluginOptionsSchema = ({ Joi }) => {
  const defaultOptions = {
    pageIdPropertyName: "id",
    pagesJsonFile: path.join(appRoot, "pages.json"),
    redirectsJsonFile: path.join(appRoot, "redirects.json"),
    createRedirectData: (pageId, fromPath, toPath) => ({
      fromPath,
      toPath,
      isPermanent: true,
    }),
    getData: async (pagesJsonFile, redirectsJsonFile) => {
      const [pages, redirects] = await Promise.all([
        loadJsonFile(pagesJsonFile, {}),
        loadJsonFile(redirectsJsonFile, []),
      ])

      return { pages, redirects }
    },
    saveData: (pages, redirects, pagesJsonFile, redirectsJsonFile) =>
      Promise.all([
        writeJsonFile(pages, pagesJsonFile),
        writeJsonFile(redirects, redirectsJsonFile),
      ]),
  }

  return Joi.object({
    pageIdPropertyName: Joi.string()
      .default(defaultOptions.pageIdPropertyName)
      .description(
        "Page ID property name as passed in the page context, e.g. contentfulId"
      ),
    pagesJsonFile: Joi.string()
      .default(defaultOptions.pagesJsonFile)
      .description("Full file path where to store page data"),
    redirectsJsonFile: Joi.string()
      .default(defaultOptions.redirectsJsonFile)
      .description("Full file path where to store redirects data"),
    createRedirectData: Joi.function()
      .arity(3)
      .default(() => defaultOptions.createRedirectData)
      .description(
        "Function that receives id, fromPath, and toPath as params and returns an object with redirect data"
      ),
    getData: Joi.function()
      .arity(2)
      .default(() => defaultOptions.getData)
      .description(
        "Async function that receives pagesJsonFile and redirectsJsonFile as params and returns {pages, redirects}"
      ),
    saveData: Joi.function()
      .arity(4)
      .default(() => defaultOptions.saveData)
      .description(
        "Async function that receives plugin pages, redirects, pagesJsonFile and redirectsJsonFile as params and saves pages & redirects wherever desired"
      ),
  })
}

let pages = {}
let prevPages
let redirects

exports.onPreInit = async (
  _,
  { getData, pagesJsonFile, redirectsJsonFile }
) => {
  const jsons = await getData(pagesJsonFile, redirectsJsonFile)

  prevPages = jsons.pages
  redirects = jsons.redirects
}

exports.onCreatePage = (
  { page: { path, context } },
  { pageIdPropertyName, createRedirectData }
) => {
  const pageId = context[pageIdPropertyName]
  if (!pageId) {
    console.log(
      `Automatic redirection: page.context.${pageIdPropertyName} missing for path ${path}, page will not be redirected automatically`
    )
    return
  }

  redirects = createUpdatedRedirects({
    pageId,
    path,
    prevPages,
    redirects,
    createRedirectData,
  })
  pages[pageId] = path
}

exports.onPostBuild = async (
  { actions },
  { createRedirectData, saveData, pagesJsonFile, redirectsJsonFile }
) => {
  redirects = filterLiveRedirects({
    prevPages,
    pages,
    redirects,
    createRedirectData,
  })

  const { createRedirect } = actions
  redirects.forEach(redirectData => createRedirect(redirectData))

  await saveData(pages, redirects, pagesJsonFile, redirectsJsonFile)
}
