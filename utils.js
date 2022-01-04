const { readFile, writeFile } = require("fs/promises")

const loadJsonFile = async (fullpath, defaultValue = null) => {
  try {
    const data = await readFile(fullpath)
    return JSON.parse(data.toString())
  } catch (error) {
    return defaultValue
  }
}

const writeJsonFile = (json, file) => {
  try {
    const jsonString = JSON.stringify(json, null, 2)
    return writeFile(file, jsonString)
  } catch (error) {
    console.error(`Could not create JSON file ${file}`)
    console.error(error)
  }
}

module.exports = { loadJsonFile, writeJsonFile }
