# gatsby-plugin-automatic-redirects

Automatically tracks page path changes during builds and creates redirects via Gatsby's `createRedirect` action.

This plugin is very useful when managing slugs dynamically in a CMS such as Contentful or when refactoring page paths. 
Redirects allow keeping page SEO scores and help users to get content from the latest URLs when clicking some old link.

## IMPORTANT NOTE ## 

This plugin only calls Gatsby's `createRedirect` action. It does not implement the redirects as this depends on your
hosting solution. 

Please also install & configure a Gatsby plugin that implements redirection such as
[gatsby-plugin-meta-redirect](https://www.gatsbyjs.com/plugins/gatsby-plugin-meta-redirect/), [gatsby-plugin-s3](https://www.gatsbyjs.com/plugins/gatsby-plugin-s3/),
[gatsby-plugin-nginx-redirect](https://www.gatsbyjs.com/plugins/gatsby-plugin-nginx-redirect/?=redirect), or
[others](https://www.gatsbyjs.com/plugins?=redirect). Without such a plugin, the redirects will not work.

## Usage
1. Add the plugin to `gatsby-config.js`:
   ```js
   plugins: [
     `gatsby-plugin-automatic-redirects`
   ]
   ```
2. Edit your `createPages` API call in `gatsby-node.js` to retrieve page IDs and pass them in the page context, for example:
   ```js
   exports.createPages = async ({ graphql, actions }) => {
     const result = await graphql(`
       query {
         allContentfulPage {
           edges {
             node {
               contentful_id
               slug
             }
           }
         }
       }
     `)
   
     const { createPage } = actions
   
     result.data.allContentfulPage.edges.forEach(({ node }) => {
       const { slug, contentful_id } = node
   
       createPage({
         path: `/${slug}`,
         component: path.resolve("./src/templates/page.js"),
         context: {
           id: contentful_id,
         },
       })
     })
   }
   ```
3. Unless overriding the `getData` and `saveData` options, make the files defined in `pagesJsonFile` and `redirectsJsonFile`
   (see below) persist between builds, or the plugin will not work properly. This can be done in one of two ways:
    1. Recommended: commit + push the files to your repository after building the website, possibly as part of a CI/CD workflow
    2. Define the files as CI/CD workflow artifacts, downloading them before the build and uploading them after build

## Configuration
* `pageIdPropertyName` - page ID property name that is passed in the page context - see example above. Default: `id`
* `pagesJsonFile` - full file path where to store page data. Default: `pages.json` in project root
* `redirectsJsonFile` - full file path where to store redirection data. Default: `redirects.json` in project root
* `createRedirectData` - function that receives `pageId`, `fromPath`, and `toPath` and returns  
  [redirect data](https://www.gatsbyjs.com/docs/reference/config-files/actions/#createRedirect).
  Use this to customize redirect options or implement logic for specific paths and pages. Default: 
  ```js
  (pageId, fromPath, toPath) => ({
    fromPath,
    toPath,
    isPermanent: true,
  })
  ```
* `getData` - async function that receives `pagesJsonFile` and `redirectsJsonFile` as params and returns an object with
  `pages` and `redirects` properties. Use this option only if you would like to retrieve the plugin data from a custom source,
  such as an API endpoint or a database. Default: retrieve the data from the files defined in the `pagesJsonFile` and `redirectsJsonFile` options.
* `saveData` - async function that receives `pages`, `redirects`, `pagesJsonFile`, and `redirectsJsonFile` as params
  and saves `pages` and `redirects` somewhere. Use this option only if you would like to save plugin data in a 
  custom source such as API endpoint or a database. Default: save the data in the files defined in the `pagesJsonFile` and `redirectsJsonFile` options.

## How does it work

The plugin calls `await getData(pagesJsonFile, redirectsJsonFile)`, by default reads the files as specified by `pagesJsonFile` 
and `redirectsJsonFile`, and returns an object with two properties:
   1. `pages` - object with page IDs as keys and paths as values
   2. `redirects` - array with redirect data objects

For example:

```json
{
  "pages": {
    "sjdf823fosd": "/",
    "j3n7832ksdf": "/about",
    "mujvds73nfd": "/contact"
  },
  "redirects": [
    {
      "fromPath": "/about-us",
      "toPath": "/about",
      "isPermanent": true
    }
  ]
}
```

When a page is created with Gatsby's `createPage` action, the plugin uses the page ID to compare the page's previous 
path in `pages` with the current path. If the path has changed, the plugin creates new redirect data by calling 
`createRedirectData` and adds the resulting object to `redirects`. 

The redirects are parsed to remove circular redirections and transitions:
  1. If redirect `/a -> /b` exists, and redirect `/b -> /a` is added, then remove redirect `/a -> /b`
  2. If redirect `/a -> /b` exists, and redirect `/b -> /c` is added, then update the former redirect to `/a -> /c`

Once the build process is finished, redirects to non-existent paths are removed, and the `createRedirect` action is called 
for each object in `redirects`

Finally, the plugin calls `await saveData(pages, redirects, pagesJsonFile, redirectsJsonFile)` to save the latest `pages` 
and `redirects`, by default in the files as specified by `pagesJsonFile` and `redirectsJsonFile`.