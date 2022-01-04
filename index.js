// if a -> b exists, and b -> a is added, then remove a -> b as it isn't needed
const filterCircularRedirects = (newRedirect, redirects) =>
  redirects.filter(
    redirect =>
      !(
        redirect.toPath === newRedirect.fromPath &&
        redirect.fromPath === newRedirect.toPath
      )
  )

// if a -> b exists, and b -> c is added, then update a -> b so that a -> c
const mapTransitionalRedirects = (newRedirect, redirects) =>
  redirects.map(redirect =>
    redirect.toPath === newRedirect.fromPath
      ? { ...redirect, toPath: newRedirect.toPath }
      : redirect
  )

const addNewRedirect = (newRedirect, redirects) => {
  const nonCircularRedirects = filterCircularRedirects(newRedirect, redirects)
  const fixedRedirects = mapTransitionalRedirects(
    newRedirect,
    nonCircularRedirects
  )

  return [...fixedRedirects, newRedirect]
}

const filterLiveRedirects = ({
  prevPages,
  pages,
  redirects,
  createRedirectData,
}) => {
  let liveRedirects = [...redirects]

  Object.keys(prevPages).forEach(pageId => {
    const isPageDeleted = !(pageId in pages)

    if (isPageDeleted) {
      const path = prevPages[pageId]
      const { toPath } = createRedirectData(pageId, path, path)
      liveRedirects = liveRedirects.filter(
        liveRedirectData => liveRedirectData.toPath !== toPath
      )
    }
  })

  return liveRedirects
}

const createUpdatedRedirects = ({
  pageId,
  path,
  prevPages,
  redirects,
  createRedirectData,
}) => {
  const prevPath = prevPages[pageId]
  const hasPathChanged = pageId in prevPages && prevPath !== path

  if (hasPathChanged) {
    const newRedirect = createRedirectData(pageId, prevPath, path)
    console.log(
      `Automatic redirection: path changed for page id ${pageId}, new redirection from ${newRedirect.fromPath} to ${newRedirect.toPath}`
    )
    return addNewRedirect(newRedirect, redirects)
  }

  return [...redirects]
}

module.exports = {
  addNewRedirect,
  createUpdatedRedirects,
  filterLiveRedirects,
}
