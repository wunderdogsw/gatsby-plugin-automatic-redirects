const {
  addNewRedirect,
  filterLiveRedirects,
  createUpdatedRedirects,
} = require("./index")

describe("gatsby-plugin-automatic-redirects", () => {
  const createMockPages = length => {
    const pages = {}

    for (let i = 0; i < length; i++) {
      const id = `page-${i}`
      pages[id] = `/${id}`
    }

    return pages
  }

  const createMockRedirects = (length, basePath) =>
    Array.from({ length }, (_, i) => ({
      fromPath: `${basePath}-${i * 2}`,
      toPath: `${basePath}-${i * 2 + 1}`,
    }))

  describe("addNewRedirect", () => {
    it("no previous redirects", () => {
      const prevRedirects = []
      const newRedirect = {
        fromPath: "/a",
        toPath: "/b",
      }

      const output = [newRedirect]
      expect(addNewRedirect(newRedirect, prevRedirects)).toEqual(output)
    })

    it("one previous redirect", () => {
      const prevRedirects = [{ fromPath: "/a", toPath: "/b" }]
      const newRedirect = { fromPath: "/c", toPath: "/d" }

      const output = [...prevRedirects, newRedirect]

      expect(addNewRedirect(newRedirect, prevRedirects)).toEqual(output)
    })

    it("one transition", () => {
      const prevRedirects = [{ fromPath: "/a", toPath: "/b" }]
      const newRedirect = { fromPath: "/b", toPath: "/c" }

      const output = [
        { fromPath: "/a", toPath: "/c" },
        { fromPath: "/b", toPath: "/c" },
      ]

      expect(addNewRedirect(newRedirect, prevRedirects)).toEqual(output)
    })

    it("several transitions", () => {
      const prevRedirects = [
        { fromPath: "/a", toPath: "/c" },
        { fromPath: "/b", toPath: "/c" },
      ]
      const newRedirect = { fromPath: "/c", toPath: "/d" }

      const output = [
        { fromPath: "/a", toPath: "/d" },
        { fromPath: "/b", toPath: "/d" },
        { fromPath: "/c", toPath: "/d" },
      ]

      expect(addNewRedirect(newRedirect, prevRedirects)).toEqual(output)
    })

    it("circular redirect", () => {
      const prevRedirects = [{ fromPath: "/a", toPath: "/b" }]
      const newRedirect = { fromPath: "/b", toPath: "/a" }

      const output = [{ fromPath: "/b", toPath: "/a" }]

      expect(addNewRedirect(newRedirect, prevRedirects)).toEqual(output)
    })

    it("one new redirect with circle & transition", () => {
      const prevRedirects = [
        { fromPath: "/a", toPath: "/d" },
        { fromPath: "/b", toPath: "/d" },
      ]
      const newRedirect = { fromPath: "/d", toPath: "/a" }

      const output = [
        { fromPath: "/b", toPath: "/a" },
        { fromPath: "/d", toPath: "/a" },
      ]

      expect(addNewRedirect(newRedirect, prevRedirects)).toEqual(output)
    })

    it("load test", () => {
      const prevRedirects = createMockRedirects(10000, "/old-page")
      const newRedirect = { fromPath: "/a", toPath: "/b" }

      const output = [...prevRedirects, newRedirect]

      expect(addNewRedirect(newRedirect, prevRedirects)).toEqual(output)
    })
  })

  const createRedirectData = (pageId, fromPath, toPath) => ({
    fromPath,
    toPath,
  })

  describe("filterLiveRedirects", () => {
    it("empty prevPages, pages, and redirects", () => {
      const prevPages = {}
      const pages = {}
      const redirects = []

      const output = []

      expect(
        filterLiveRedirects({ prevPages, pages, redirects, createRedirectData })
      ).toEqual(output)
    })

    it("no dead redirects", () => {
      const prevPages = { a: "/b" }
      const pages = { a: "/b", b: "/b" }
      const redirects = [{ fromPath: "/a", toPath: "/b" }]

      const output = [...redirects]

      expect(
        filterLiveRedirects({ prevPages, pages, redirects, createRedirectData })
      ).toEqual(output)
    })

    it("one dead redirect", () => {
      const prevPages = { a: "/b", c: "/c" }
      const pages = { c: "/c" }
      const redirects = [{ fromPath: "/a", toPath: "/b" }]

      const output = []

      expect(
        filterLiveRedirects({ prevPages, pages, redirects, createRedirectData })
      ).toEqual(output)
    })

    it("more than one dead redirect", () => {
      const prevPages = {
        a: "/b",
        c: "/d",
        e: "/e",
      }
      const pages = { e: "/e" }
      const redirects = [
        { fromPath: "/a", toPath: "/b" },
        { fromPath: "/c", toPath: "/d" },
      ]

      const output = []

      expect(
        filterLiveRedirects({ prevPages, pages, redirects, createRedirectData })
      ).toEqual(output)
    })

    it("load test", () => {
      const prevPages = createMockPages(10000)
      const pages = { ...prevPages }
      const redirects = createMockRedirects(1000, "/slug")

      const output = [...redirects]

      expect(
        filterLiveRedirects({ prevPages, pages, redirects, createRedirectData })
      ).toEqual(output)
    })
  })

  describe("createUpdatedRedirects", () => {
    it("empty prevPages and redirects", () => {
      const options = {
        pageId: "a",
        path: "/a",
        prevPages: {},
        redirects: [],
        createRedirectData,
      }

      const output = [...options.redirects]

      expect(createUpdatedRedirects(options)).toEqual(output)
    })

    it("existing page, no path change", () => {
      const options = {
        pageId: "a",
        path: "/a",
        prevPages: {
          a: "/a",
        },
        redirects: [{ fromPath: "/y", toPath: "/z" }],
        createRedirectData,
      }

      const output = [...options.redirects]

      expect(createUpdatedRedirects(options)).toEqual(output)
    })

    it("new page", () => {
      const options = {
        pageId: "b",
        path: "/b",
        prevPages: {
          a: "/a",
        },
        redirects: [{ fromPath: "/z", toPath: "a" }],
      }

      const output = [...options.redirects]

      expect(createUpdatedRedirects(options)).toEqual(output)
    })

    it("path change", () => {
      const options = {
        pageId: "a",
        path: "/b",
        prevPages: {
          a: "/a",
        },
        redirects: [{ fromPath: "/y", toPath: "/z" }],
        createRedirectData,
      }

      const output = [...options.redirects, { fromPath: "/a", toPath: "/b" }]

      expect(createUpdatedRedirects(options)).toEqual(output)
    })

    it("load test", () => {
      const options = {
        pageId: "a",
        path: "/b",
        prevPages: {
          a: "/a",
        },
        redirects: createMockRedirects(10000, "/page"),
        createRedirectData,
      }

      const output = [...options.redirects, { fromPath: "/a", toPath: "/b" }]

      expect(createUpdatedRedirects(options)).toEqual(output)
    })
  })
})
